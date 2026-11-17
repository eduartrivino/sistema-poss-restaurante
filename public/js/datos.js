// ============================================================
//  datos.js  →  lo que usan TODAS las páginas
//   - Hablar con el servidor (función api)
//   - Guardar la sesión (el "token" que da el servidor al entrar)
//   - Mantener una copia del estado del restaurante y actualizarla en tiempo real
//   - Funciones de ayuda (dinero, limpiar, fotoHTML...)
// ============================================================

const PAGINA_ROL = { mesero: "mesero.html", cocina: "cocina.html", caja: "caja.html", administrador: "admin.html" };
const NOMBRE_ESTADO = { recibido: "Recibido", preparando: "En preparación", listo: "Listo", entregado: "Entregado" };
const NOMBRE_ESTADO_MESA = { libre: "Libre", ocupada: "Ocupada", cuenta: "Pidió la cuenta" };

// ------------------------------------------------------------
//  Comunicación con el servidor
// ------------------------------------------------------------
// Ejemplo:  const venta = await api("POST", "/api/cobrar", { mesa: 3, metodo: "efectivo" });
// Si el servidor responde con un error, lanza un Error con el mensaje para mostrarlo.
async function api(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: {} };
  const token = sessionStorage.getItem("token");
  if (token) {
    opciones.headers.Authorization = "Bearer " + token;
  }
  if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(ruta, opciones);
  const datos = await respuesta.json().catch(function () {
    return {};
  });

  if (respuesta.status === 401 && ruta !== "/api/login") {
    cerrarSesion();                       // la sesión venció o no existe
  }
  if (!respuesta.ok) {
    throw new Error(datos.error || "Error del servidor");
  }
  return datos;
}

// ------------------------------------------------------------
//  Sesión del personal
// ------------------------------------------------------------
async function iniciarSesion(rol, clave) {
  const r = await api("POST", "/api/login", { rol: rol, clave: clave });
  sessionStorage.setItem("token", r.token);
  sessionStorage.setItem("rol", r.rol);
}

// Si no hay sesión (o el rol no corresponde) vuelve al inicio. El administrador entra a todo.
function exigirRol(rolPermitido) {
  const rol = sessionStorage.getItem("rol");
  if (rol === null || (rol !== "administrador" && rol !== rolPermitido)) {
    location.href = "index.html";
    return false;
  }
  return true;
}

function cerrarSesion() {
  api("POST", "/api/logout").catch(function () {});
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("rol");
  location.href = "index.html";
}

// ------------------------------------------------------------
//  Estado del restaurante (copia en el navegador, se refresca sola)
// ------------------------------------------------------------
let ESTADO = { config: { nombre: "Restaurante", mesas: 8 }, productos: [], mesas: {}, pedidos: [], turno: null };

async function cargarEstado() {
  ESTADO = await api("GET", "/api/estado");
}

// El servidor avisa (SSE) cada vez que algo cambia en cualquier pantalla.
// Entonces volvemos a pedir el estado y ejecutamos la función "alCambio".
function escucharCambios(alCambio) {
  const fuente = new EventSource("/api/eventos");
  fuente.addEventListener("cambio", alCambio);
}

function leerProductos() { return ESTADO.productos; }
function leerMesas() { return ESTADO.mesas; }

function pedidosSinPagar(mesa) {
  return ESTADO.pedidos.filter(function (p) {
    return p.mesa === mesa && !p.pagado;
  });
}

function subtotalMesa(mesa) {
  let suma = 0;
  for (const pedido of pedidosSinPagar(mesa)) {
    for (const item of pedido.items) {
      suma += item.cantidad * item.precio;
    }
  }
  return suma;
}

// "libre", "ocupada" o "cuenta" (el cliente pidió la cuenta)
function estadoMesa(mesa) {
  const info = ESTADO.mesas[mesa];
  if (info === undefined) {
    return pedidosSinPagar(mesa).length > 0 ? "ocupada" : "libre";
  }
  return info.cuenta ? "cuenta" : "ocupada";
}

// ------------------------------------------------------------
//  Funciones de ayuda
// ------------------------------------------------------------

// 22000 → "$ 22.000"
function dinero(numero) {
  return "$ " + Number(numero).toLocaleString("es-CO");
}

// Seguridad: evita que un texto escrito por una persona se ejecute como HTML.
function limpiar(texto) {
  return String(texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// HTML de la foto de un plato. Si la imagen no carga, se queda el emoji.
function fotoHTML(producto) {
  let img = "";
  if (producto.imagen) {
    img = '<img src="' + limpiar(producto.imagen) + '" alt="' + limpiar(producto.nombre) + '" loading="lazy">';
  }
  return '<div class="foto"><span class="foto-emoji">' + limpiar(producto.emoji || "🍽️") + "</span>" + img + "</div>";
}
// Las imágenes que fallan se quitan (el evento "error" no sube, por eso se escucha en la fase de captura)
document.addEventListener("error", function (e) {
  if (e.target.tagName === "IMG") {
    e.target.remove();
  }
}, true);

function listaCategorias(productos) {
  const categorias = [];
  for (const p of productos) {
    if (!categorias.includes(p.categoria)) {
      categorias.push(p.categoria);
    }
  }
  return categorias;
}

// Muestra un mensaje en un contenedor y lo borra a los 3,5 segundos
function mostrarMensaje(contenedor, texto, esError) {
  contenedor.innerHTML = '<div class="' + (esError ? "error" : "aviso") + '">' + limpiar(texto) + "</div>";
  setTimeout(function () {
    contenedor.innerHTML = "";
  }, 3500);
}

// ------------------------------------------------------------
//  Tarjetas de mesa y contadores (los usan el mesero y la caja)
// ------------------------------------------------------------

// Cuatro contadores arriba del salón: libres, ocupadas, cuentas y pedidos listos
function htmlResumenMesas() {
  let libres = 0, ocupadas = 0, cuentas = 0;
  for (let i = 1; i <= ESTADO.config.mesas; i++) {
    const e = estadoMesa(i);
    if (e === "libre") { libres++; } else if (e === "cuenta") { cuentas++; } else { ocupadas++; }
  }
  const listos = ESTADO.pedidos.filter(function (p) {
    return p.estado === "listo";
  }).length;
  function caja(clase, titulo, numero) {
    return '<div class="dato ' + clase + '"><span>' + titulo + "</span><strong>" + numero + "</strong></div>";
  }
  return caja("d-libre", "Libres", libres) + caja("d-ocupada", "Ocupadas", ocupadas) +
    caja("d-cuenta", "Cuentas", cuentas) + caja("d-listo", "Pedidos listos", listos);
}

// Una tarjeta de mesa: encabezado de color según el estado, datos y total
function crearTarjetaMesa(i, elegida, alClick) {
  const estado = estadoMesa(i);
  const info = ESTADO.mesas[i];
  const listos = pedidosSinPagar(i).filter(function (p) {
    return p.estado === "listo";
  }).length;

  let cuerpo = '<div class="mesa-vacia">Disponible</div>';
  if (estado !== "libre") {
    cuerpo =
      '<div class="mesa-datos">' + (info ? "👥 " + info.comensales + " pers. · desde " + limpiar(info.hora) : "En servicio") + "</div>" +
      '<div class="mesa-total">' + dinero(subtotalMesa(i)) + "</div>" +
      (listos > 0 ? '<span class="insignia-listo">🔔 ' + listos + " listo" + (listos > 1 ? "s" : "") + "</span>" : "");
  }

  const div = document.createElement("div");
  div.className = "mesa " + estado + (elegida ? " elegida" : "");
  div.innerHTML =
    '<div class="mesa-cab"><strong>Mesa ' + i + '</strong><span class="mesa-estado">' + NOMBRE_ESTADO_MESA[estado] + "</span></div>" +
    '<div class="mesa-cuerpo">' + cuerpo + "</div>";
  div.addEventListener("click", alClick);
  return div;
}
