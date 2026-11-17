// ============================================================
//  caja.js  →  módulo de la CAJA
//  Así trabaja un cajero:
//   1) Abre la caja al empezar el turno (efectivo inicial)
//   2) Cobra las mesas que piden la cuenta (descuento, propina, método de pago) y entrega el recibo
//   3) Al terminar, cuenta el efectivo y cierra la caja (arqueo: ¿sobra o falta dinero?)
// ============================================================

if (!exigirRol("caja")) { throw new Error("sin sesión"); }
document.getElementById("salir").addEventListener("click", cerrarSesion);

let mesaElegida = null;
let datosCaja = { turno: null, resumen: null, pendientes: [], ventas: [] };
let ultimoCierre = null;

const contMesas = document.getElementById("mesas");
const contCuenta = document.getElementById("cuenta");
const contRecibo = document.getElementById("zonaRecibo");

// ------------------------------------------------------------
//  Cargar datos del servidor
// ------------------------------------------------------------
async function refrescar() {
  await cargarEstado();
  datosCaja = await api("GET", "/api/caja");
  dibujarTodo();
}

function dibujarTodo() {
  const abierta = datosCaja.turno !== null;
  document.getElementById("zonaCerrada").style.display = abierta ? "none" : "block";
  document.getElementById("zonaAbierta").style.display = abierta ? "block" : "none";

  if (!abierta) {
    dibujarUltimoCierre();
    return;
  }
  dibujarMesas();
  dibujarCuenta();
  dibujarResumenTurno();
}

// ------------------------------------------------------------
//  Abrir caja
// ------------------------------------------------------------
document.getElementById("btnAbrirCaja").addEventListener("click", async function () {
  try {
    await api("POST", "/api/caja/abrir", { inicial: Number(document.getElementById("inpInicial").value) });
    ultimoCierre = null;
    await refrescar();
  } catch (error) {
    mostrarMensaje(document.getElementById("msgAbrir"), error.message, true);
  }
});

function dibujarUltimoCierre() {
  const cont = document.getElementById("ultimoCierre");
  if (ultimoCierre === null) {
    cont.innerHTML = "";
    return;
  }
  cont.innerHTML = '<div class="tarjeta login">' + htmlCierre(ultimoCierre) + "</div>";
}

// Texto del resultado de un cierre (sobra / falta / cuadra)
function htmlCierre(t) {
  const d = t.diferencia;
  const texto = d === 0 ? "✔ La caja cuadra exacta." : d > 0 ? "Sobran " + dinero(d) + "." : "Faltan " + dinero(-d) + ".";
  return "<h3>Caja cerrada · Turno " + t.id + "</h3>" +
    "<p>Efectivo esperado: <strong>" + dinero(t.resumen.esperadoEfectivo) + "</strong><br>" +
    "Efectivo contado: <strong>" + dinero(t.contado) + "</strong></p>" +
    '<div class="' + (d === 0 ? "aviso" : "alerta") + '">' + texto + "</div>";
}

// ------------------------------------------------------------
//  Pestañas
// ------------------------------------------------------------
function mostrarPestana(nombre) {
  document.getElementById("tab-cobrar").style.display = nombre === "cobrar" ? "block" : "none";
  document.getElementById("tab-turno").style.display = nombre === "turno" ? "block" : "none";
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
//  Mesas
// ------------------------------------------------------------
function dibujarMesas() {
  document.getElementById("resumenMesas").innerHTML = htmlResumenMesas();
  contMesas.innerHTML = "";
  for (let i = 1; i <= ESTADO.config.mesas; i++) {
    contMesas.appendChild(crearTarjetaMesa(i, i === mesaElegida, function () {
      mesaElegida = i;
      contRecibo.innerHTML = "";
      dibujarMesas();
      dibujarCuenta();
    }));
  }
}

// ------------------------------------------------------------
//  Cuenta de la mesa y formulario de cobro
// ------------------------------------------------------------
function productosJuntos(mesa) {
  const juntos = {};
  for (const pedido of pedidosSinPagar(mesa)) {
    for (const item of pedido.items) {
      if (juntos[item.nombre] === undefined) {
        juntos[item.nombre] = { nombre: item.nombre, precio: item.precio, cantidad: 0 };
      }
      juntos[item.nombre].cantidad += item.cantidad;
    }
  }
  return Object.values(juntos);
}

function dibujarCuenta() {
  if (mesaElegida === null) {
    contCuenta.innerHTML = "";
    return;
  }
  const subtotal = subtotalMesa(mesaElegida);
  if (subtotal === 0) {
    contCuenta.innerHTML = '<div class="tarjeta"><strong>Mesa ' + mesaElegida + "</strong>: no tiene cuenta pendiente.</div>";
    return;
  }

  // Guardamos lo que el cajero ya había escrito para no borrarlo al refrescar
  const previo = leerFormulario();

  const sinEntregar = pedidosSinPagar(mesaElegida).filter(function (p) {
    return p.estado !== "entregado";
  }).length;
  const info = leerMesas()[mesaElegida];

  let filas = "";
  for (const x of productosJuntos(mesaElegida)) {
    filas += "<tr><td>" + x.cantidad + " × " + limpiar(x.nombre) + '</td><td class="num">' + dinero(x.cantidad * x.precio) + "</td></tr>";
  }

  contCuenta.innerHTML =
    '<div class="tarjeta"><h2>Cuenta de la mesa ' + mesaElegida + "</h2>" +
    (info ? '<p class="gris">' + info.comensales + " persona(s) · abierta a las " + info.hora + "</p>" : "") +
    (estadoMesa(mesaElegida) === "cuenta" ? '<div class="aviso">🧾 El cliente ya pidió la cuenta.</div>' : "") +
    (sinEntregar > 0 ? '<div class="alerta">Ojo: hay ' + sinEntregar + " pedido(s) sin entregar todavía.</div>" : "") +
    "<table>" + filas + "</table>" +
    "<p><strong>Subtotal: " + dinero(subtotal) + "</strong></p>" +

    '<label>Descuento</label><div class="fila-botones">' +
    '<select id="selDescTipo" style="width:auto"><option value="pct">%</option><option value="valor">$</option></select>' +
    '<input type="number" id="inpDesc" min="0" value="0" style="width:120px"></div>' +
    '<p class="gris" style="font-size:13px">La caja puede dar hasta 20 %. Más lo autoriza el administrador.</p>' +

    '<label for="selPropina">Propina</label>' +
    '<select id="selPropina"><option value="0">Sin propina</option><option value="10">10 % (sugerida)</option><option value="15">15 %</option></select>' +

    '<label for="selMetodo">Método de pago</label>' +
    '<select id="selMetodo"><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select>' +

    '<div id="zonaEfectivo"><label for="inpRecibido">Efectivo recibido</label>' +
    '<input type="number" id="inpRecibido" min="0" step="500"></div>' +

    '<label for="inpDividir">Dividir la cuenta entre (solo informativo)</label>' +
    '<input type="number" id="inpDividir" min="1" max="30" value="1" style="width:100px">' +

    "<h3>Total a cobrar: <span id=\"spanTotal\"></span></h3>" +
    '<p id="pCambio">Cambio: <strong id="spanCambio">$ 0</strong></p>' +
    '<p id="pDividir" class="gris"></p>' +
    '<div id="msgCobro"></div>' +
    '<button id="btnCobrar">Cobrar y generar recibo</button></div>';

  // Restauramos lo escrito
  for (const id in previo) {
    document.getElementById(id).value = previo[id];
  }
  for (const id of ["selDescTipo", "inpDesc", "selPropina", "selMetodo", "inpRecibido", "inpDividir"]) {
    document.getElementById(id).addEventListener("input", recalcular);
  }
  document.getElementById("btnCobrar").addEventListener("click", cobrar);
  recalcular();
}

const CAMPOS = ["selDescTipo", "inpDesc", "selPropina", "selMetodo", "inpRecibido", "inpDividir"];
function leerFormulario() {
  const valores = {};
  if (document.getElementById("selMetodo") === null) {
    return valores;
  }
  for (const id of CAMPOS) {
    valores[id] = document.getElementById(id).value;
  }
  return valores;
}

// Mismos cálculos que hace el servidor (el servidor es quien manda; esto es solo para mostrar)
function calcular() {
  const subtotal = subtotalMesa(mesaElegida);
  const tipo = document.getElementById("selDescTipo").value;
  const valor = Math.max(0, Number(document.getElementById("inpDesc").value) || 0);
  const descuento = tipo === "pct" ? Math.round(subtotal * Math.min(valor, 100) / 100) : Math.min(valor, subtotal);
  const propinaPct = Number(document.getElementById("selPropina").value);
  const base = subtotal - descuento;
  const propina = Math.round(base * propinaPct / 100);
  return {
    subtotal: subtotal, descuento: descuento, propinaPct: propinaPct, propina: propina, total: base + propina,
    metodo: document.getElementById("selMetodo").value,
    recibido: Number(document.getElementById("inpRecibido").value) || 0,
    tipo: tipo, valor: valor
  };
}

function recalcular() {
  const d = calcular();
  document.getElementById("spanTotal").textContent = dinero(d.total);
  const efectivo = d.metodo === "efectivo";
  document.getElementById("zonaEfectivo").style.display = efectivo ? "block" : "none";
  document.getElementById("pCambio").style.display = efectivo ? "block" : "none";
  document.getElementById("spanCambio").textContent = dinero(Math.max(0, d.recibido - d.total));

  const n = Math.max(1, Number(document.getElementById("inpDividir").value) || 1);
  document.getElementById("pDividir").textContent = n > 1 ? "Cada persona paga aprox. " + dinero(Math.ceil(d.total / n)) + " (" + n + " personas)." : "";
}

async function cobrar() {
  const d = calcular();
  try {
    const venta = await api("POST", "/api/cobrar", {
      mesa: mesaElegida, metodo: d.metodo, descuentoTipo: d.tipo, descuento: d.valor,
      propinaPct: d.propinaPct, recibido: d.recibido
    });
    mesaElegida = null;
    await refrescar();
    mostrarRecibo(venta);
  } catch (error) {
    mostrarMensaje(document.getElementById("msgCobro"), error.message, true);
  }
}

// ------------------------------------------------------------
//  Recibo imprimible
// ------------------------------------------------------------
function mostrarRecibo(venta) {
  let lineas = "";
  for (const item of venta.items) {
    lineas += '<div class="linea"><span>' + item.cantidad + " × " + limpiar(item.nombre) + "</span><span>" + dinero(item.cantidad * item.precio) + "</span></div>";
  }
  let extra = "";
  if (venta.descuento > 0) {
    extra += '<div class="linea"><span>Descuento</span><span>-' + dinero(venta.descuento) + "</span></div>";
  }
  extra += '<div class="linea"><span>Propina</span><span>' + dinero(venta.propina) + "</span></div>";

  let efectivo = "";
  if (venta.metodo === "efectivo") {
    efectivo = '<div class="linea"><span>Recibido</span><span>' + dinero(venta.recibido) + "</span></div>" +
      '<div class="linea"><span>Cambio</span><span>' + dinero(venta.cambio) + "</span></div>";
  }

  contRecibo.innerHTML =
    '<div class="recibo imprimir">' +
    '<div style="text-align:center"><strong>' + limpiar(ESTADO.config.nombre) + "</strong><br>" +
    "Recibo N.º " + venta.id + "<br>" + venta.fecha + " " + limpiar(venta.hora) + "<br>Mesa " + venta.mesa +
    (venta.comensales ? " · " + venta.comensales + " pers." : "") + "</div><hr>" +
    lineas + "<hr>" +
    '<div class="linea"><span>Subtotal</span><span>' + dinero(venta.subtotal) + "</span></div>" + extra +
    '<div class="linea"><strong>TOTAL</strong><strong>' + dinero(venta.total) + "</strong></div>" +
    '<div class="linea"><span>Pago</span><span>' + venta.metodo + "</span></div>" + efectivo + "<hr>" +
    '<div style="text-align:center; font-size:12px">Documento interno.<br>No es factura electrónica.<br>¡Gracias por su visita!</div></div>' +
    '<div style="text-align:center"><button id="btnImprimir">🖨 Imprimir recibo</button></div>';
  document.getElementById("btnImprimir").addEventListener("click", function () {
    window.print();
  });
  mostrarPestana("cobrar");
  contRecibo.scrollIntoView({ behavior: "smooth" });
}

// ------------------------------------------------------------
//  Turno: resumen, ventas y cierre
// ------------------------------------------------------------
function dibujarResumenTurno() {
  const t = datosCaja.turno;
  const r = datosCaja.resumen;
  let filas = "";
  for (const v of datosCaja.ventas) {
    filas += "<tr><td>" + v.id + "</td><td>" + limpiar(v.hora) + "</td><td>Mesa " + v.mesa + "</td><td>" + v.metodo + '</td><td class="num">' + dinero(v.total) +
      '</td><td><button class="secundario" data-venta="' + v.id + '">Ver recibo</button></td></tr>';
  }
  document.getElementById("resumenTurno").innerHTML =
    '<div class="tarjeta"><p>Turno <strong>' + t.id + "</strong> · abierto a las " + limpiar(t.horaApertura) + " · efectivo inicial " + dinero(t.inicial) + "</p>" +
    "<p><strong>Vendido: " + dinero(r.total) + "</strong> (" + r.ventas + " cuentas) · Propinas: " + dinero(r.propinas) + " · Descuentos: " + dinero(r.descuentos) + "</p>" +
    "<p>Efectivo: " + dinero(r.efectivo) + " · Tarjeta: " + dinero(r.tarjeta) + " · Transferencia: " + dinero(r.transferencia) + "</p>" +
    "<p><strong>Efectivo que debería haber en el cajón: " + dinero(r.esperadoEfectivo) + "</strong></p>" +
    (datosCaja.pendientes.length > 0 ? '<div class="alerta">Mesas con cuenta sin cobrar: ' + datosCaja.pendientes.join(", ") + ". No podrás cerrar hasta cobrarlas.</div>" : "") +
    (filas ? '<table><tr><th>#</th><th>Hora</th><th>Mesa</th><th>Pago</th><th class="num">Total</th><th></th></tr>' + filas + "</table>" : '<p class="gris">Todavía no hay ventas en este turno.</p>') + "</div>";
}

document.getElementById("resumenTurno").addEventListener("click", function (e) {
  const b = e.target.closest("button[data-venta]");
  if (b === null) {
    return;
  }
  const venta = datosCaja.ventas.find(function (v) {
    return v.id === Number(b.dataset.venta);
  });
  if (venta) {
    mostrarRecibo(venta);
  }
});

document.getElementById("btnCerrarCaja").addEventListener("click", async function () {
  const contado = document.getElementById("inpContado").value;
  if (contado === "") {
    mostrarMensaje(document.getElementById("msgCierre"), "Escribe el efectivo que contaste.", true);
    return;
  }
  if (!confirm("¿Cerrar la caja? No podrás cobrar hasta abrir un nuevo turno.")) {
    return;
  }
  try {
    ultimoCierre = await api("POST", "/api/caja/cerrar", { contado: Number(contado) });
    document.getElementById("inpContado").value = "";
    contRecibo.innerHTML = "";
    mesaElegida = null;
    await refrescar();
  } catch (error) {
    mostrarMensaje(document.getElementById("msgCierre"), error.message, true);
  }
});

// Si el mesero pide una cuenta, la caja la ve al instante
(async function iniciar() {
  await refrescar();
  escucharCambios(refrescar);
})();
