// ============================================================
//  admin.js  →  módulo del ADMINISTRADOR
//  Ventas, menú (platos, precios, agotados), QR para el celular y ajustes.
//  (El cobro lo hace la caja; el administrador lo supervisa.)
// ============================================================

if (!exigirRol("administrador")) { throw new Error("sin sesión"); }
if (sessionStorage.getItem("rol") !== "administrador") { throw new Error("solo administrador"); }
document.getElementById("salir").addEventListener("click", cerrarSesion);

const NOMBRES_PESTANAS = ["ventas", "menu", "qr", "ajustes"];

function mostrarPestana(nombre) {
  for (const n of NOMBRES_PESTANAS) {
    document.getElementById("tab-" + n).style.display = n === nombre ? "block" : "none";
  }
  for (const b of document.querySelectorAll("#pestanas button")) {
    b.className = b.dataset.tab === nombre ? "activo" : "";
  }
}
document.getElementById("pestanas").addEventListener("click", function (e) {
  const b = e.target.closest("button");
  if (b !== null) {
    mostrarPestana(b.dataset.tab);
  }
});

// ------------------------------------------------------------
//  Ventas del día, ranking y turnos de caja
// ------------------------------------------------------------
async function dibujarVentas() {
  const ventas = await api("GET", "/api/ventas");
  const cont = document.getElementById("resumenVentas");

  if (ventas.length === 0) {
    cont.innerHTML = '<p class="gris">Todavía no hay ventas hoy.</p>';
  } else {
    let total = 0, propinas = 0, descuentos = 0, personas = 0;
    const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    const ranking = {};
    for (const v of ventas) {
      total += v.total; propinas += v.propina; descuentos += v.descuento || 0; personas += v.comensales || 0;
      porMetodo[v.metodo] += v.total;
      for (const it of v.items) {
        ranking[it.nombre] = (ranking[it.nombre] || 0) + it.cantidad;
      }
    }
    const top = Object.keys(ranking).map(function (n) {
      return { nombre: n, cantidad: ranking[n] };
    }).sort(function (a, b) {
      return b.cantidad - a.cantidad;
    }).slice(0, 5);

    let filasTop = "";
    for (const t of top) {
      filasTop += "<tr><td>" + limpiar(t.nombre) + '</td><td class="num">' + t.cantidad + " uds</td></tr>";
    }
    function dato(clase, titulo, valor) {
      return '<div class="dato ' + clase + '"><span>' + titulo + "</span><strong>" + valor + "</strong></div>";
    }
    cont.innerHTML =
      '<div class="resumen">' +
      dato("d-listo", "Vendido hoy", dinero(total)) + dato("d-ocupada", "Cuentas", ventas.length) +
      dato("d-cuenta", "Propinas", dinero(propinas)) + dato("d-libre", "Personas atendidas", personas) + "</div>" +
      '<div class="tarjeta"><h3>Por método de pago</h3><table>' +
      '<tr><td>Efectivo</td><td class="num">' + dinero(porMetodo.efectivo) + "</td></tr>" +
      '<tr><td>Tarjeta</td><td class="num">' + dinero(porMetodo.tarjeta) + "</td></tr>" +
      '<tr><td>Transferencia</td><td class="num">' + dinero(porMetodo.transferencia) + "</td></tr>" +
      '<tr><td>Descuentos dados</td><td class="num">' + dinero(descuentos) + "</td></tr></table></div>" +
      '<div class="tarjeta"><h3>Platos más vendidos hoy</h3><table>' + filasTop + "</table></div>";
  }

  const turnos = await api("GET", "/api/turnos");
  let filas = "";
  for (const t of turnos) {
    let estado = '<span class="estado preparando">Abierto</span>';
    let dif = "";
    if (t.cerrado) {
      estado = '<span class="estado entregado">Cerrado ' + limpiar(t.horaCierre) + "</span>";
      dif = t.diferencia === 0 ? "Cuadra" : (t.diferencia > 0 ? "Sobra " : "Falta ") + dinero(Math.abs(t.diferencia));
    }
    filas += "<tr><td>" + t.id + "</td><td>" + t.fecha + " " + limpiar(t.horaApertura) + "</td><td>" + estado + '</td><td class="num">' +
      dinero(t.inicial) + '</td><td class="num">' + (t.cerrado ? dinero(t.resumen.total) : "—") + "</td><td>" + dif + "</td></tr>";
  }
  document.getElementById("listaTurnos").innerHTML = filas
    ? '<div class="tarjeta" style="overflow-x:auto"><table><tr><th>#</th><th>Apertura</th><th>Estado</th><th class="num">Inicial</th><th class="num">Vendido</th><th>Arqueo</th></tr>' + filas + "</table></div>"
    : '<p class="gris">Todavía no se ha abierto ninguna caja.</p>';
}

// ------------------------------------------------------------
//  Menú
// ------------------------------------------------------------
function dibujarMenu() {
  const productos = leerProductos();
  let filas = "";
  for (const p of productos) {
    filas +=
      "<tr><td style=\"width:90px\">" + fotoHTML(p) + "</td>" +
      "<td><strong>" + limpiar(p.nombre) + '</strong><br><span class="gris">' + limpiar(p.categoria) + "</span></td>" +
      '<td style="width:130px"><input type="number" min="0" step="500" value="' + p.precio + '" data-precio="' + p.id + '" style="margin:0"></td>' +
      '<td><span class="estado ' + (p.disponible ? "listo" : "entregado") + '">' + (p.disponible ? "Disponible" : "Agotado") + "</span></td>" +
      '<td><button class="secundario" data-alternar="' + p.id + '">' + (p.disponible ? "Marcar agotado" : "Marcar disponible") + "</button> " +
      '<button class="secundario" data-borrar="' + p.id + '">Eliminar</button></td></tr>';
  }
  document.getElementById("listaMenu").innerHTML =
    '<div class="tarjeta" style="overflow-x:auto"><table class="tabla-menu"><tr><th></th><th>Plato</th><th>Precio</th><th>Estado</th><th></th></tr>' + filas + "</table></div>";

  let opciones = "";
  for (const cat of listaCategorias(productos)) {
    opciones += '<option value="' + limpiar(cat) + '">';
  }
  document.getElementById("listaCategorias").innerHTML = opciones;
}

async function refrescarMenu() {
  await cargarEstado();
  dibujarMenu();
}

async function conError(accion) {
  try {
    await accion();
  } catch (error) {
    alert(error.message);
  }
  await refrescarMenu();
}

document.getElementById("listaMenu").addEventListener("change", function (e) {
  const campo = e.target.closest("input[data-precio]");
  if (campo !== null) {
    conError(function () {
      return api("PUT", "/api/productos/" + campo.dataset.precio, { precio: Number(campo.value) });
    });
  }
});

document.getElementById("listaMenu").addEventListener("click", function (e) {
  const b = e.target.closest("button");
  if (b === null) {
    return;
  }
  if (b.dataset.alternar !== undefined) {
    const p = leerProductos().find(function (x) {
      return x.id === Number(b.dataset.alternar);
    });
    conError(function () {
      return api("PUT", "/api/productos/" + p.id, { disponible: !p.disponible });
    });
  }
  if (b.dataset.borrar !== undefined && confirm("¿Eliminar este plato de la carta?")) {
    conError(function () {
      return api("DELETE", "/api/productos/" + b.dataset.borrar);
    });
  }
});

document.getElementById("btnAgregar").addEventListener("click", async function () {
  const msg = document.getElementById("msgNuevo");
  try {
    await api("POST", "/api/productos", {
      nombre: document.getElementById("nuevoNombre").value,
      categoria: document.getElementById("nuevaCategoria").value,
      precio: document.getElementById("nuevoPrecio").value,
      descripcion: document.getElementById("nuevaDescripcion").value,
      emoji: document.getElementById("nuevoEmoji").value,
      imagen: document.getElementById("nuevaImagen").value
    });
    for (const id of ["nuevoNombre", "nuevaCategoria", "nuevoPrecio", "nuevaDescripcion", "nuevaImagen"]) {
      document.getElementById(id).value = "";
    }
    mostrarMensaje(msg, "✔ Plato agregado a la carta.", false);
    await refrescarMenu();
  } catch (error) {
    mostrarMensaje(msg, error.message, true);
  }
});

document.getElementById("btnRestaurar").addEventListener("click", function () {
  if (confirm("¿Restaurar la carta original del restaurante? Se perderán tus cambios en el menú.")) {
    conError(function () {
      return api("POST", "/api/productos/restaurar", {});
    });
  }
});

// ------------------------------------------------------------
//  QR para el celular
// ------------------------------------------------------------
async function generarQR() {
  const alerta = document.getElementById("alertaQR");
  try {
    const base = document.getElementById("inpBase").value.trim();
    const selIp = document.getElementById("selIp");
    let ruta = "/api/qr?";
    if (base) {
      ruta += "base=" + encodeURIComponent(base);
    } else if (selIp !== null) {
      ruta += "ip=" + encodeURIComponent(selIp.value);
    }
    const r = await api("GET", ruta);

    // Lista de direcciones de red (si el computador tiene varias, se puede elegir cuál usar)
    if (document.getElementById("selIp") === null && r.ips.length > 0) {
      let opciones = "";
      for (const d of r.ips) {
        opciones += '<option value="' + limpiar(d.ip) + '">' + limpiar(d.ip) + " (" + limpiar(d.nombre) + ")</option>";
      }
      document.getElementById("zonaIps").innerHTML =
        '<label for="selIp">Dirección de red de este computador (elige la del WiFi)</label><select id="selIp">' + opciones + "</select>";
      document.getElementById("selIp").addEventListener("change", generarQR);
    }

    alerta.innerHTML = r.esLocal
      ? '<div class="aviso">Este QR usa la dirección de tu WiFi. El celular debe estar <b>conectado al mismo WiFi</b> y el servidor debe estar encendido. Si no abre, elige otra dirección de la lista, o prueba escribiendo la dirección en el navegador del celular.</div>'
      : "";
    // El SVG lo genera nuestro propio servidor, por eso es seguro mostrarlo
    if (document.getElementById("selDiseno").value === "portada") {
      // La portada del restaurante, con el QR del sistema puesto encima del espacio del QR
      document.getElementById("zonaQR").innerHTML =
        '<div class="portada imprimir"><img src="img/portada.png" alt="Portada del restaurante">' +
        '<div class="portada-qr">' + r.svg + "</div></div>" +
        '<p class="gris" style="text-align:center; word-break:break-all">' + limpiar(r.url) + "</p>";
    } else {
      document.getElementById("zonaQR").innerHTML =
        '<div class="tarjeta imprimir tarjeta-qr"><h2>' + limpiar(ESTADO.config.nombre) + "</h2>" + r.svg +
        "<p><strong>Escanea para ver nuestra carta</strong></p>" +
        '<p class="gris" style="word-break:break-all">' + limpiar(r.url) + "</p></div>";
    }
  } catch (error) {
    mostrarMensaje(alerta, error.message, true);
  }
}
document.getElementById("btnGenerar").addEventListener("click", generarQR);
document.getElementById("selDiseno").addEventListener("change", generarQR);
document.getElementById("btnImprimirQR").addEventListener("click", function () {
  window.print();
});

// ------------------------------------------------------------
//  Ajustes
// ------------------------------------------------------------
document.getElementById("btnConfig").addEventListener("click", async function () {
  const msg = document.getElementById("msgConfig");
  try {
    await api("PUT", "/api/config", { nombre: document.getElementById("cfgNombre").value, mesas: document.getElementById("cfgMesas").value });
    mostrarMensaje(msg, "✔ Guardado.", false);
    await refrescarMenu();
  } catch (error) {
    mostrarMensaje(msg, error.message, true);
  }
});

document.getElementById("btnClave").addEventListener("click", async function () {
  const msg = document.getElementById("msgClave");
  try {
    await api("PUT", "/api/claves", { rol: document.getElementById("claveRol").value, clave: document.getElementById("claveNueva").value });
    document.getElementById("claveNueva").value = "";
    mostrarMensaje(msg, "✔ Clave cambiada.", false);
  } catch (error) {
    mostrarMensaje(msg, error.message, true);
  }
});

document.getElementById("btnBorrar").addEventListener("click", async function () {
  if (confirm("¿Seguro? Se borrarán pedidos, ventas, turnos y mesas abiertas. El menú no se toca.")) {
    await api("POST", "/api/reset", {});
    await dibujarVentas();
  }
});

(async function iniciar() {
  await cargarEstado();
  document.getElementById("cfgNombre").value = ESTADO.config.nombre;
  document.getElementById("cfgMesas").value = ESTADO.config.mesas;
  dibujarMenu();
  await dibujarVentas();
  generarQR();
  escucharCambios(async function () {
    await cargarEstado();
    dibujarMenu();
    dibujarVentas();
  });
})();
