// ============================================================
//  server.js  →  servidor del restaurante (Node.js + Express + MySQL + HTTPS)
//
//  Qué hace:
//   - Sirve las páginas de la carpeta public/ (carta, mesero, cocina, caja, admin)
//   - Ofrece una API (/api/...) con las reglas del negocio
//   - Guarda todo en MySQL (ver db.js)
//   - Avisa a todas las pantallas en tiempo real (SSE) cuando algo cambia
//   - Usa HTTPS (ver seguridad.js) y genera el código QR de la carta
//
//  Ejecutar:  npm install   y luego   npm start
// ============================================================

const express = require("express");
const QRCode = require("qrcode");
const crypto = require("crypto");
const os = require("os");
const path = require("path");
const db = require("./db");
const { crearServidor } = require("./seguridad");

const PUERTO = Number(process.env.PORT) || 3000;
const USA_HTTPS = process.env.HTTPS === "on";   // por defecto HTTP normal; HTTPS=on lo activa

// ------------------------------------------------------------
//  1. Utilidades
// ------------------------------------------------------------
function hoy() {
  return new Date().toLocaleDateString("sv-SE");   // 2026-10-20
}
function hora() {
  return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
function texto(valor, max) {
  return String(valor === undefined || valor === null ? "" : valor).trim().slice(0, max);
}
function entero(valor) {
  const n = Number(valor);
  return Number.isInteger(n) ? n : NaN;
}
class ErrorApi extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}
function exigir(condicion, mensaje, codigo) {
  if (!condicion) {
    throw new ErrorApi(codigo || 400, mensaje);
  }
}

// ------------------------------------------------------------
//  2. Leer datos de MySQL (y dejarlos con la forma que espera el navegador)
//     Todas las consultas usan "?" (parámetros): así nadie puede colar SQL malicioso.
// ------------------------------------------------------------
function formatoProducto(f) {
  return { id: f.id, nombre: f.nombre, precio: f.precio, categoria: f.categoria, emoji: f.emoji, imagen: f.imagen, descripcion: f.descripcion, disponible: f.disponible === 1 };
}
async function obtenerProductos() {
  const [filas] = await db.consulta("SELECT * FROM productos ORDER BY id");
  return filas.map(formatoProducto);
}

async function obtenerMesas() {
  const [filas] = await db.consulta("SELECT * FROM mesas_abiertas");
  const mesas = {};
  for (const f of filas) {
    mesas[f.numero] = { comensales: f.comensales, hora: f.hora, cuenta: f.cuenta === 1 };
  }
  return mesas;
}

// Pedidos sin pagar, cada uno con su lista de productos
async function obtenerPedidosSinPagar() {
  const [pedidos] = await db.consulta("SELECT * FROM pedidos WHERE pagado = 0 ORDER BY id");
  if (pedidos.length === 0) {
    return [];
  }
  const [items] = await db.consulta(
    "SELECT pedido_id, nombre, precio, cantidad FROM pedido_items WHERE pedido_id IN (?) ORDER BY id",
    [pedidos.map(function (p) { return p.id; })]
  );
  return pedidos.map(function (p) {
    return {
      id: p.id, mesa: p.mesa, nota: p.nota, estado: p.estado, hora: p.hora, creado: p.creado, pagado: false,
      items: items.filter(function (i) { return i.pedido_id === p.id; }).map(function (i) {
        return { nombre: i.nombre, precio: i.precio, cantidad: i.cantidad };
      })
    };
  });
}

function formatoTurno(f) {
  const t = {
    id: f.id, abierto: f.abierto, horaApertura: f.hora_apertura, fecha: f.fecha, inicial: f.inicial, cerrado: f.cerrado === 1
  };
  if (t.cerrado) {
    t.cierre = f.cierre;
    t.horaCierre = f.hora_cierre;
    t.contado = f.contado;
    t.diferencia = f.diferencia;
    t.resumen = JSON.parse(f.resumen);
  }
  return t;
}
async function turnoAbierto() {
  const [filas] = await db.consulta("SELECT * FROM turnos WHERE cerrado = 0 LIMIT 1");
  return filas.length > 0 ? formatoTurno(filas[0]) : null;
}

// Mesas que tienen pedidos sin pagar
async function mesasPendientes(c) {
  const [filas] = await (c || { query: db.consulta }).query("SELECT DISTINCT mesa FROM pedidos WHERE pagado = 0 ORDER BY mesa");
  return filas.map(function (f) { return f.mesa; });
}

// Ventas con sus productos
async function obtenerVentas(donde, parametros) {
  const [ventas] = await db.consulta("SELECT * FROM ventas WHERE " + donde + " ORDER BY id", parametros);
  if (ventas.length === 0) {
    return [];
  }
  const [items] = await db.consulta(
    "SELECT venta_id, nombre, precio, cantidad FROM venta_items WHERE venta_id IN (?) ORDER BY id",
    [ventas.map(function (v) { return v.id; })]
  );
  return ventas.map(function (v) {
    return {
      id: v.id, turno: v.turno_id, mesa: v.mesa, comensales: v.comensales,
      items: items.filter(function (i) { return i.venta_id === v.id; }).map(function (i) {
        return { nombre: i.nombre, precio: i.precio, cantidad: i.cantidad };
      }),
      subtotal: v.subtotal, descuento: v.descuento, propina: v.propina, total: v.total,
      metodo: v.metodo, recibido: v.recibido, cambio: v.cambio, fecha: v.fecha, hora: v.hora
    };
  });
}

// Totales de un turno (suma de sus ventas, calculada por MySQL)
async function resumenTurno(turno, c) {
  const [filas] = await (c || { query: db.consulta }).query(
    "SELECT metodo, COUNT(*) AS n, SUM(total) AS total, SUM(propina) AS propinas, SUM(descuento) AS descuentos FROM ventas WHERE turno_id = ? GROUP BY metodo",
    [turno.id]
  );
  const r = { ventas: 0, efectivo: 0, tarjeta: 0, transferencia: 0, propinas: 0, descuentos: 0, total: 0 };
  for (const f of filas) {
    r.ventas += f.n;
    r[f.metodo] += Number(f.total);
    r.propinas += Number(f.propinas);
    r.descuentos += Number(f.descuentos);
    r.total += Number(f.total);
  }
  r.esperadoEfectivo = turno.inicial + r.efectivo;   // lo que debería haber en el cajón
  return r;
}

// ------------------------------------------------------------
//  3. Tiempo real (SSE): cuando algo cambia, se avisa a todas las pantallas
// ------------------------------------------------------------
const oyentes = new Set();

function avisarCambio() {
  for (const res of oyentes) {
    res.write("event: cambio\ndata: 1\n\n");
  }
}

// ------------------------------------------------------------
//  4. Sesiones y roles
// ------------------------------------------------------------
const sesiones = new Map();          // token → { rol, desde }
const intentos = new Map();          // ip → { n, hasta }  (freno contra adivinar claves)
const DURACION_SESION = 12 * 60 * 60 * 1000;

async function iniciarSesion(rol, clave, ip) {
  const freno = intentos.get(ip);
  exigir(!(freno && freno.n >= 5 && freno.hasta > Date.now()), "Demasiados intentos. Espera un minuto.", 429);

  const [filas] = await db.consulta("SELECT sal, hash FROM usuarios WHERE rol = ?", [rol]);
  const bien = filas.length > 0 && crypto.timingSafeEqual(Buffer.from(db.hashClave(clave, filas[0].sal)), Buffer.from(filas[0].hash));
  if (!bien) {
    const n = (freno && freno.hasta > Date.now() ? freno.n : 0) + 1;
    intentos.set(ip, { n: n, hasta: Date.now() + 60000 });
    throw new ErrorApi(401, "Clave incorrecta.");
  }
  intentos.delete(ip);
  const token = crypto.randomBytes(24).toString("hex");
  sesiones.set(token, { rol: rol, desde: Date.now() });
  return token;
}

// Middleware: exige sesión y que el rol esté permitido (el administrador entra a todo)
function permitir(...roles) {
  return function (req, res, next) {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const s = sesiones.get(token);
    if (!s || Date.now() - s.desde > DURACION_SESION) {
      sesiones.delete(token);
      return res.status(401).json({ error: "Inicia sesión." });
    }
    if (s.rol !== "administrador" && !roles.includes(s.rol)) {
      return res.status(403).json({ error: "Tu rol no tiene permiso para esto." });
    }
    req.rol = s.rol;
    next();
  };
}

// ------------------------------------------------------------
//  5. Aplicación Express
// ------------------------------------------------------------
const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "on") {
  app.set("trust proxy", 1);   // si el hosting (Render, Railway...) pone HTTPS delante del servidor
}
app.use(express.json({ limit: "20kb" }));
app.use(function (req, res, next) {
  req.body = req.body || {};   // Express 5: sin cuerpo, req.body llega vacío (undefined)
  next();
});

// Cabeceras de seguridad (CSP: solo se ejecuta JavaScript de este mismo servidor)
app.use(function (req, res, next) {
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (process.env.TRUST_PROXY === "on") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000");   // solo con HTTPS real (hosting)
  }
  next();
});

app.get("/favicon.ico", function (req, res) {
  res.status(204).end();
});
app.use(express.static(path.join(__dirname, "public")));

// ----- Públicas (clientes) -----
const rutaMenu = async function (req, res) {
  const [config] = await db.consulta("SELECT nombre FROM config WHERE id = 1");
  res.json({ nombre: config[0].nombre, productos: await obtenerProductos() });
};
app.get("/api/menu", rutaMenu);

const rutaEventos = function (req, res) {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  res.write("retry: 2000\n\n");
  oyentes.add(res);
  const latido = setInterval(function () {
    res.write(": ping\n\n");
  }, 25000);
  req.on("close", function () {
    clearInterval(latido);
    oyentes.delete(res);
  });
};
app.get("/api/eventos", rutaEventos);

app.post("/api/login", async function (req, res) {
  const rol = texto(req.body.rol, 20);
  const token = await iniciarSesion(rol, texto(req.body.clave, 50), req.ip);
  res.json({ token: token, rol: rol });
});

app.post("/api/logout", function (req, res) {
  sesiones.delete((req.headers.authorization || "").replace("Bearer ", ""));
  res.json({ ok: true });
});

// ----- Estado general (lo usan las pantallas del personal) -----
app.get("/api/estado", permitir("mesero", "cocina", "caja"), async function (req, res) {
  const [[config]] = await db.consulta("SELECT nombre, mesas FROM config WHERE id = 1");
  res.json({
    config: config,
    productos: await obtenerProductos(),
    mesas: await obtenerMesas(),
    pedidos: await obtenerPedidosSinPagar(),
    turno: await turnoAbierto()
  });
});

// ----- Mesero: mesas y pedidos -----
async function numeroMesa(valor) {
  const n = entero(valor);
  const [[config]] = await db.consulta("SELECT mesas FROM config WHERE id = 1");
  exigir(n >= 1 && n <= config.mesas, "Esa mesa no existe.");
  return n;
}

async function pedidosPendientesDe(mesa) {
  const [[{ n }]] = await db.consulta("SELECT COUNT(*) AS n FROM pedidos WHERE mesa = ? AND pagado = 0", [mesa]);
  return n;
}

app.post("/api/mesas/:n/abrir", permitir("mesero"), async function (req, res) {
  const n = await numeroMesa(req.params.n);
  const comensales = entero(req.body.comensales);
  exigir(comensales >= 1 && comensales <= 30, "Indica cuántas personas llegaron (1 a 30).");
  exigir((await pedidosPendientesDe(n)) === 0, "La mesa ya está ocupada.");
  try {
    await db.consulta("INSERT INTO mesas_abiertas (numero, comensales, hora, cuenta) VALUES (?, ?, ?, 0)", [n, comensales, hora()]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new ErrorApi(400, "La mesa ya está ocupada.");   // la llave primaria evita abrirla dos veces
    }
    throw error;
  }
  avisarCambio();
  res.json({ ok: true });
});

app.post("/api/mesas/:n/cuenta", permitir("mesero"), async function (req, res) {
  const n = await numeroMesa(req.params.n);
  exigir((await pedidosPendientesDe(n)) > 0, "La mesa todavía no ha pedido nada.");
  const [r] = await db.consulta("UPDATE mesas_abiertas SET cuenta = 1 WHERE numero = ?", [n]);
  exigir(r.affectedRows === 1, "La mesa no está abierta.");
  avisarCambio();
  res.json({ ok: true });
});

app.post("/api/mesas/:n/cancelar", permitir("mesero"), async function (req, res) {
  const n = await numeroMesa(req.params.n);
  exigir((await pedidosPendientesDe(n)) === 0, "No se puede cancelar: la mesa ya tiene pedidos.");
  await db.consulta("DELETE FROM mesas_abiertas WHERE numero = ?", [n]);
  avisarCambio();
  res.json({ ok: true });
});

// El servidor pone nombre y precio: NUNCA se confía en el precio que manda el navegador
app.post("/api/pedidos", permitir("mesero"), async function (req, res) {
  const mesa = await numeroMesa(req.body.mesa);
  exigir(Array.isArray(req.body.items) && req.body.items.length > 0 && req.body.items.length <= 40, "El pedido está vacío.");

  const pedido = await db.transaccion(async function (c) {
    const [abierta] = await c.query("SELECT numero FROM mesas_abiertas WHERE numero = ? FOR UPDATE", [mesa]);
    exigir(abierta.length === 1, "Abre la mesa antes de tomar el pedido.");

    const items = [];
    for (const it of req.body.items) {
      const cantidad = entero(it.cantidad);
      const [filas] = await c.query("SELECT nombre, precio, disponible FROM productos WHERE id = ?", [entero(it.id)]);
      exigir(filas.length === 1, "Un producto del pedido no existe.");
      exigir(cantidad >= 1 && cantidad <= 50, "Cantidad no válida.");
      exigir(filas[0].disponible === 1, "«" + filas[0].nombre + "» está agotado.", 409);
      items.push({ nombre: filas[0].nombre, precio: filas[0].precio, cantidad: cantidad });
    }

    const creado = Date.now();
    const h = hora();
    const nota = texto(req.body.nota, 100);
    const [r] = await c.query("INSERT INTO pedidos (mesa, nota, estado, hora, creado, pagado) VALUES (?, ?, 'recibido', ?, ?, 0)", [mesa, nota, h, creado]);
    for (const it of items) {
      await c.query("INSERT INTO pedido_items (pedido_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?)", [r.insertId, it.nombre, it.precio, it.cantidad]);
    }
    await c.query("UPDATE mesas_abiertas SET cuenta = 0 WHERE numero = ?", [mesa]);   // si pide algo más, la cuenta deja de estar lista
    return { id: r.insertId, mesa: mesa, items: items, nota: nota, estado: "recibido", hora: h, creado: creado, pagado: false };
  });

  avisarCambio();
  res.json(pedido);
});

// Cambios de estado permitidos para cada rol
const TRANSICIONES = {
  cocina: { recibido: "preparando", preparando: "listo" },
  mesero: { listo: "entregado" }
};

app.patch("/api/pedidos/:id", permitir("mesero", "cocina"), async function (req, res) {
  const id = entero(req.params.id);
  const [filas] = await db.consulta("SELECT estado FROM pedidos WHERE id = ? AND pagado = 0", [id]);
  exigir(filas.length === 1, "Pedido no encontrado.", 404);
  const nuevo = texto(req.body.estado, 20);

  // El administrador puede hacer cualquiera de las dos transiciones
  const permitidas = req.rol === "administrador"
    ? Object.assign({}, TRANSICIONES.cocina, TRANSICIONES.mesero)
    : TRANSICIONES[req.rol];
  exigir(permitidas[filas[0].estado] === nuevo, "Ese cambio de estado no está permitido.", 409);

  // "AND estado = ?" evita que dos personas cambien el mismo pedido a la vez
  const [r] = await db.consulta("UPDATE pedidos SET estado = ? WHERE id = ? AND estado = ?", [nuevo, id, filas[0].estado]);
  exigir(r.affectedRows === 1, "El pedido ya cambió de estado. Se actualizó la pantalla.", 409);
  avisarCambio();
  res.json({ id: id, estado: nuevo });
});

// ----- Caja: turnos, cobro y recibos -----
app.post("/api/caja/abrir", permitir("caja"), async function (req, res) {
  const inicial = entero(req.body.inicial);
  exigir(inicial >= 0 && inicial <= 100000000, "Indica el efectivo inicial (puede ser 0).");
  const turno = await db.transaccion(async function (c) {
    const [abierto] = await c.query("SELECT id FROM turnos WHERE cerrado = 0 FOR UPDATE");
    exigir(abierto.length === 0, "Ya hay una caja abierta.", 409);
    const [r] = await c.query("INSERT INTO turnos (abierto, hora_apertura, fecha, inicial, cerrado) VALUES (?, ?, ?, ?, 0)", [Date.now(), hora(), hoy(), inicial]);
    const [[fila]] = await c.query("SELECT * FROM turnos WHERE id = ?", [r.insertId]);
    return formatoTurno(fila);
  });
  avisarCambio();
  res.json(turno);
});

app.get("/api/caja", permitir("caja"), async function (req, res) {
  const turno = await turnoAbierto();
  res.json({
    turno: turno,
    resumen: turno ? await resumenTurno(turno) : null,
    pendientes: await mesasPendientes(),
    ventas: turno ? await obtenerVentas("turno_id = ?", [turno.id]) : []
  });
});

app.post("/api/caja/cerrar", permitir("caja"), async function (req, res) {
  const contado = entero(req.body.contado);
  exigir(contado >= 0 && contado <= 1000000000, "Escribe el efectivo que contaste en el cajón.");

  const cerrado = await db.transaccion(async function (c) {
    const [filas] = await c.query("SELECT * FROM turnos WHERE cerrado = 0 FOR UPDATE");
    exigir(filas.length === 1, "No hay una caja abierta.", 409);
    const pendientes = await mesasPendientes(c);
    exigir(pendientes.length === 0, "Hay mesas con cuentas sin cobrar: " + pendientes.join(", ") + ".", 409);

    const turno = formatoTurno(filas[0]);
    const r = await resumenTurno(turno, c);
    const diferencia = contado - r.esperadoEfectivo;   // + sobra, − falta
    await c.query(
      "UPDATE turnos SET cerrado = 1, cierre = ?, hora_cierre = ?, contado = ?, diferencia = ?, resumen = ? WHERE id = ?",
      [Date.now(), hora(), contado, diferencia, JSON.stringify(r), turno.id]
    );
    const [[fila]] = await c.query("SELECT * FROM turnos WHERE id = ?", [turno.id]);
    return formatoTurno(fila);
  });
  avisarCambio();
  res.json(cerrado);
});

// Cobrar una mesa. Todos los cálculos se hacen AQUÍ, en el servidor, dentro de una transacción:
// si algo falla a la mitad, no se guarda nada (no queda una venta sin pedidos pagados).
app.post("/api/cobrar", permitir("caja"), async function (req, res) {
  const mesa = await numeroMesa(req.body.mesa);
  const metodo = texto(req.body.metodo, 20);
  exigir(["efectivo", "tarjeta", "transferencia"].includes(metodo), "Método de pago no válido.");

  const tipoDesc = req.body.descuentoTipo === "valor" ? "valor" : "pct";
  const valorDesc = entero(req.body.descuento || 0);
  exigir(valorDesc >= 0, "Descuento no válido.");
  const propinaPct = entero(req.body.propinaPct || 0);
  exigir(propinaPct >= 0 && propinaPct <= 30, "Propina no válida (0 a 30 %).");

  const venta = await db.transaccion(async function (c) {
    const [turnos] = await c.query("SELECT id FROM turnos WHERE cerrado = 0 FOR UPDATE");
    exigir(turnos.length === 1, "Abre la caja antes de cobrar.", 409);

    // "FOR UPDATE" bloquea los pedidos: si dos cajeros cobran la misma mesa, el segundo espera y ya no encuentra nada
    const [pedidos] = await c.query("SELECT id FROM pedidos WHERE mesa = ? AND pagado = 0 FOR UPDATE", [mesa]);
    exigir(pedidos.length > 0, "Esa mesa no tiene cuenta pendiente.");
    const ids = pedidos.map(function (p) { return p.id; });

    const [items] = await c.query("SELECT nombre, precio, SUM(cantidad) AS cantidad FROM pedido_items WHERE pedido_id IN (?) GROUP BY nombre, precio ORDER BY MIN(id)", [ids]);
    let subtotal = 0;
    for (const it of items) {
      it.cantidad = Number(it.cantidad);
      subtotal += it.precio * it.cantidad;
    }

    // Descuento: en porcentaje o en valor. La caja puede dar hasta 20 %; más lo autoriza el administrador.
    const descuento = tipoDesc === "pct" ? Math.round(subtotal * Math.min(valorDesc, 100) / 100) : Math.min(valorDesc, subtotal);
    exigir(descuento <= subtotal * 0.20 || req.rol === "administrador", "Descuentos de más del 20 % los autoriza el administrador.", 403);

    const base = subtotal - descuento;
    const propina = Math.round(base * propinaPct / 100);
    const total = base + propina;

    let recibido = total;
    let cambio = 0;
    if (metodo === "efectivo") {
      recibido = entero(req.body.recibido);
      exigir(recibido >= total, "El efectivo recibido no alcanza para pagar el total.");
      cambio = recibido - total;
    }

    const [abierta] = await c.query("SELECT comensales FROM mesas_abiertas WHERE numero = ?", [mesa]);
    const comensales = abierta.length > 0 ? abierta[0].comensales : 0;
    const fecha = hoy();
    const h = hora();

    const [r] = await c.query(
      "INSERT INTO ventas (turno_id, mesa, comensales, subtotal, descuento, propina, total, metodo, recibido, cambio, fecha, hora) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [turnos[0].id, mesa, comensales, subtotal, descuento, propina, total, metodo, recibido, cambio, fecha, h]
    );
    for (const it of items) {
      await c.query("INSERT INTO venta_items (venta_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?)", [r.insertId, it.nombre, it.precio, it.cantidad]);
    }
    await c.query("UPDATE pedidos SET pagado = 1 WHERE id IN (?)", [ids]);
    await c.query("DELETE FROM mesas_abiertas WHERE numero = ?", [mesa]);

    return {
      id: r.insertId, turno: turnos[0].id, mesa: mesa, comensales: comensales,
      items: items.map(function (i) { return { nombre: i.nombre, precio: i.precio, cantidad: i.cantidad }; }),
      subtotal: subtotal, descuento: descuento, propina: propina, total: total, metodo: metodo,
      recibido: recibido, cambio: cambio, fecha: fecha, hora: h
    };
  });

  avisarCambio();
  res.json(venta);
});

// ----- Ventas e informes (caja y administrador) -----
app.get("/api/ventas", permitir("caja"), async function (req, res) {
  const fecha = texto(req.query.fecha, 10) || hoy();
  res.json(await obtenerVentas("fecha = ?", [fecha]));
});

app.get("/api/turnos", permitir(), async function (req, res) {
  const [filas] = await db.consulta("SELECT * FROM turnos ORDER BY id DESC LIMIT 30");
  res.json(filas.map(formatoTurno));
});

// ----- Administrador: menú, configuración, claves, QR -----
function leerProducto(body) {
  const nombre = texto(body.nombre, 60);
  const categoria = texto(body.categoria, 30);
  const precio = entero(body.precio);
  exigir(nombre && categoria, "Escribe el nombre y la categoría.");
  exigir(precio >= 0 && precio <= 10000000, "Precio no válido.");
  const imagen = texto(body.imagen, 120);
  // Solo imágenes de la carpeta img/ o direcciones https (evita rutas raras)
  exigir(imagen === "" || /^img\/[\w.-]+$/.test(imagen) || /^https:\/\/[^\s"'<>]+$/.test(imagen), "La imagen debe ser img/archivo.jpg o una dirección https.");
  return {
    nombre: nombre, categoria: categoria, precio: precio, imagen: imagen,
    emoji: texto(body.emoji, 4) || "🍽️",
    descripcion: texto(body.descripcion, 255)
  };
}

app.post("/api/productos", permitir(), async function (req, res) {
  const p = leerProducto(req.body);
  const [r] = await db.consulta(
    "INSERT INTO productos (nombre, precio, categoria, emoji, imagen, descripcion) VALUES (?, ?, ?, ?, ?, ?)",
    [p.nombre, p.precio, p.categoria, p.emoji, p.imagen, p.descripcion]
  );
  avisarCambio();
  res.json(Object.assign({ id: r.insertId, disponible: true }, p));
});

app.put("/api/productos/:id", permitir(), async function (req, res) {
  const id = entero(req.params.id);
  const [filas] = await db.consulta("SELECT id FROM productos WHERE id = ?", [id]);
  exigir(filas.length === 1, "Producto no encontrado.", 404);

  if (req.body.disponible !== undefined) {
    await db.consulta("UPDATE productos SET disponible = ? WHERE id = ?", [req.body.disponible === true ? 1 : 0, id]);
  }
  if (req.body.precio !== undefined && Object.keys(req.body).length === 1) {
    const precio = entero(req.body.precio);
    exigir(precio >= 0 && precio <= 10000000, "Precio no válido.");
    await db.consulta("UPDATE productos SET precio = ? WHERE id = ?", [precio, id]);
  } else if (req.body.nombre !== undefined) {
    const p = leerProducto(req.body);
    await db.consulta(
      "UPDATE productos SET nombre = ?, precio = ?, categoria = ?, emoji = ?, imagen = ?, descripcion = ? WHERE id = ?",
      [p.nombre, p.precio, p.categoria, p.emoji, p.imagen, p.descripcion, id]
    );
  }
  avisarCambio();
  res.json({ ok: true });
});

app.delete("/api/productos/:id", permitir(), async function (req, res) {
  await db.consulta("DELETE FROM productos WHERE id = ?", [entero(req.params.id)]);
  avisarCambio();
  res.json({ ok: true });
});

app.post("/api/productos/restaurar", permitir(), async function (req, res) {
  await db.transaccion(async function (c) {
    await c.query("DELETE FROM productos");
    await c.query("ALTER TABLE productos AUTO_INCREMENT = 1");
    await db.insertarProductosIniciales(c);
  });
  avisarCambio();
  res.json({ ok: true });
});

app.put("/api/config", permitir(), async function (req, res) {
  const nombre = texto(req.body.nombre, 40);
  const mesas = entero(req.body.mesas);
  exigir(nombre, "Escribe el nombre del restaurante.");
  exigir(mesas >= 1 && mesas <= 40, "Las mesas deben ser entre 1 y 40.");
  // No se pueden quitar mesas que están en uso
  const [[uso]] = await db.consulta(
    "SELECT GREATEST(COALESCE((SELECT MAX(numero) FROM mesas_abiertas), 0), COALESCE((SELECT MAX(mesa) FROM pedidos WHERE pagado = 0), 0)) AS maxima"
  );
  exigir(uso.maxima <= mesas, "No puedes quitar mesas que están ocupadas (la mesa " + uso.maxima + " está en uso).");
  await db.consulta("UPDATE config SET nombre = ?, mesas = ? WHERE id = 1", [nombre, mesas]);
  avisarCambio();
  res.json({ nombre: nombre, mesas: mesas });
});

app.put("/api/claves", permitir(), async function (req, res) {
  const rol = texto(req.body.rol, 20);
  const clave = texto(req.body.clave, 50);
  exigir(db.ROLES.includes(rol), "Rol no válido.");
  exigir(clave.length >= 4, "La clave debe tener al menos 4 caracteres.");
  const sal = crypto.randomBytes(8).toString("hex");
  await db.consulta("UPDATE usuarios SET sal = ?, hash = ? WHERE rol = ?", [sal, db.hashClave(clave, sal), rol]);
  // Cierra las sesiones de ese rol (menos la del administrador que está cambiando)
  for (const [token, s] of sesiones) {
    if (s.rol === rol && rol !== "administrador") {
      sesiones.delete(token);
    }
  }
  res.json({ ok: true });
});

app.post("/api/reset", permitir(), async function (req, res) {
  await db.transaccion(async function (c) {
    await c.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const tabla of ["venta_items", "ventas", "turnos", "pedido_items", "pedidos", "mesas_abiertas"]) {
      await c.query("TRUNCATE TABLE " + tabla);   // nombres fijos escritos aquí, no vienen del usuario
    }
    await c.query("SET FOREIGN_KEY_CHECKS = 1");
  });
  avisarCambio();
  res.json({ ok: true });
});

// ----- Direcciones de red y QR -----
// Un computador puede tener varias direcciones (WiFi, Ethernet, adaptadores virtuales de VirtualBox/WSL/VPN...).
// Ponemos primero las que parecen WiFi/Ethernet real y dejamos al final las virtuales.
function direccionesLocales() {
  const lista = [];
  for (const [nombre, tarjetas] of Object.entries(os.networkInterfaces())) {
    for (const i of tarjetas) {
      if (i.family !== "IPv4" || i.internal) {
        continue;
      }
      const virtual = /virtual|vmware|vbox|virtualbox|vethernet|wsl|docker|hyper-v|loopback|tailscale|zerotier|vpn|tun|tap/i.test(nombre);
      const casa = /^192\.168\./.test(i.address) ? 0 : /^10\./.test(i.address) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(i.address) ? 2 : 3;
      lista.push({ ip: i.address, nombre: nombre, puntos: (virtual ? 10 : 0) + casa });
    }
  }
  lista.sort(function (a, b) {
    return a.puntos - b.puntos;
  });
  return lista;
}
function direccionLocal() {
  const lista = direccionesLocales();
  return lista.length > 0 ? lista[0].ip : "localhost";
}

let PUBLICO_PUERTO = PUERTO;
const PROTOCOLO = USA_HTTPS ? "https" : "http";

// La carta para los clientes también se ofrece por HTTP normal en otro puerto (por defecto 3001).
// Así el celular abre el QR SIN la advertencia del certificado. Este puerto SOLO sirve la carta
// (no tiene login ni módulos del personal), así que no expone nada delicado.
const PUERTO_CARTA = Number(process.env.PORT_CARTA) || PUERTO + 1;
const CARTA_HTTP = USA_HTTPS && process.env.CARTA_HTTP !== "off";

// El QR apunta a: (1) la dirección que escribió el administrador, (2) PUBLIC_URL si existe,
// (3) la IP elegida de la red, o (4) la IP más probable de tu WiFi.
app.get("/api/qr", permitir(), async function (req, res) {
  const base = texto(req.query.base, 200);
  const ip = texto(req.query.ip, 45);
  exigir(base === "" || /^https?:\/\/[^\s"'<>]+$/.test(base), "La dirección debe empezar con http:// o https://");
  const ips = direccionesLocales();
  exigir(ip === "" || ips.some(function (x) { return x.ip === ip; }), "Esa dirección de red no existe en este computador.");

  const direccion = ip || direccionLocal();
  const origen = base || process.env.PUBLIC_URL ||
    (CARTA_HTTP ? "http://" + direccion + ":" + PUERTO_CARTA : PROTOCOLO + "://" + direccion + ":" + PUBLICO_PUERTO);
  const url = origen.replace(/\/+$/, "") + "/carta.html";
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 280 });
  res.json({ url: url, svg: svg, esLocal: !base && !process.env.PUBLIC_URL, ips: ips, ipUsada: ip || direccionLocal(), https: USA_HTTPS });
});

// ----- Errores -----
app.use("/api", function (req, res) {
  res.status(404).json({ error: "No existe." });
});
app.use(function (err, req, res, next) {
  if (err instanceof ErrorApi) {
    return res.status(err.codigo).json({ error: err.message });
  }
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(400).json({ error: "Datos no válidos." });
  }
  console.error(err);
  res.status(500).json({ error: "Error del servidor." });
});

// ------------------------------------------------------------
//  6. Arrancar
// ------------------------------------------------------------
// Aplicación pública: solo la carta del cliente (páginas, imágenes, menú y avisos en tiempo real)
function crearAppCarta() {
  const publica = express();
  publica.disable("x-powered-by");
  publica.use(function (req, res, next) {
    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  publica.get("/", function (req, res) {
    res.redirect("/carta.html");
  });
  publica.get("/favicon.ico", function (req, res) {
    res.status(204).end();
  });
  publica.get("/api/menu", rutaMenu);
  publica.get("/api/eventos", rutaEventos);
  // Lista blanca: cualquier otra ruta (admin.html, caja.html, /api/login...) no existe aquí
  const PERMITIDO = /^\/(carta\.html|lista\.html|carta\/[\w.-]+|css\/[\w.-]+|img\/[\w.-]+|js\/(datos|lista)\.js)$/;
  publica.use(function (req, res, next) {
    return PERMITIDO.test(req.path) ? next() : res.status(404).send("No encontrado");
  });
  publica.use(express.static(path.join(__dirname, "public")));
  publica.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).end();
  });
  return publica;
}

async function arrancar() {
  await db.iniciarBD();
  if (CARTA_HTTP) {
    require("http").createServer(crearAppCarta()).listen(PUERTO_CARTA, "0.0.0.0");
  }
  const servidor = await crearServidor(app, USA_HTTPS, direccionesLocales().map(function (d) { return d.ip; }));
  servidor.listen(PUERTO, "0.0.0.0", function () {
    PUBLICO_PUERTO = servidor.address().port;
    console.log("\n  Restaurante funcionando ✔  (base de datos MySQL «" + db.BD.database + "», " + (USA_HTTPS ? "HTTPS" : "HTTP") + ")\n");
    console.log("  En este computador:  " + PROTOCOLO + "://localhost:" + PUBLICO_PUERTO);
    console.log("  Carta para el celular (mismo WiFi):");
    for (const d of direccionesLocales()) {
      if (CARTA_HTTP) {
        console.log("     http://" + d.ip + ":" + PUERTO_CARTA + "/carta.html   (" + d.nombre + ")");
      } else {
        console.log("     " + PROTOCOLO + "://" + d.ip + ":" + PUBLICO_PUERTO + "/carta.html   (" + d.nombre + ")");
      }
    }
    if (USA_HTTPS && !process.env.SSL_CERT) {
      console.log("\n  Nota: los módulos del personal usan HTTPS con certificado propio (autofirmado):");
      console.log("  el navegador avisará la primera vez; pulsa «Avanzado» → «Continuar». La carta del cliente no.");
    }
    console.log("\n  Claves de demostración: mesero 1111 · cocina 2222 · caja 3333 · administrador 4444");
    console.log("  (cámbialas desde el panel del administrador)\n");
  });
}

if (require.main === module) {
  arrancar().catch(function (error) {
    console.error("\n  ✖ No se pudo iniciar el servidor:\n  " + error.message + "\n");
    process.exit(1);
  });
}
module.exports = { app, arrancar };
