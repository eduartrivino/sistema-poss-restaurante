// ============================================================
//  mesero.js  →  módulo del MESERO
//  Así trabaja un mesero:
//   1) Recibe a los clientes y abre una mesa
//   2) Toma el pedido y lo envía a la cocina
//   3) Entrega los platos que la cocina marca como "listo"
//   4) Cuando el cliente pide la cuenta, avisa al administrador
// ============================================================

if (!exigirRol("mesero")) { throw new Error("sin sesión"); }
document.getElementById("salir").addEventListener("click", cerrarSesion);

let mesaActual = null;          // mesa elegida (null = ninguna todavía)
let categoriaActual = "Todas";  // filtro de categoría
let pedidoNuevo = {};           // el pedido que se está armando: { idProducto: cantidad }

const contMesas = document.getElementById("mesas");
const contFiltros = document.getElementById("filtros");
const contCarta = document.getElementById("carta");
const contPedidos = document.getElementById("misPedidos");
const contListos = document.getElementById("listos");
const zonaAbrir = document.getElementById("zonaAbrir");
const zonaPedido = document.getElementById("zonaPedido");
const barra = document.getElementById("barra");
const txtResumen = document.getElementById("resumen");
const btnEnviar = document.getElementById("btnEnviar");
const inputNota = document.getElementById("nota");
const divMensaje = document.getElementById("mensaje");

function aviso(texto, esError) {
  mostrarMensaje(divMensaje, texto, esError);
}

// Ejecuta una acción en el servidor y muestra el error si lo hay
async function intentar(accion) {
  try {
    await accion();
  } catch (error) {
    aviso(error.message, true);
  }
  await cargarEstado();
  dibujarTodo();
}

// ------------------------------------------------------------
//  1. Mesas (con su estado)
// ------------------------------------------------------------
function dibujarMesas() {
  document.getElementById("resumenMesas").innerHTML = htmlResumenMesas();
  contMesas.innerHTML = "";

  for (let i = 1; i <= ESTADO.config.mesas; i++) {
    contMesas.appendChild(crearTarjetaMesa(i, i === mesaActual, function () {
      mesaActual = i;
      pedidoNuevo = {};
      inputNota.value = "";
      dibujarTodo();
    }));
  }
}

// Abrir una mesa libre: se anota cuántas personas llegaron
document.getElementById("btnAbrir").addEventListener("click", function () {
  const comensales = Number(document.getElementById("inpComensales").value);
  intentar(function () {
    return api("POST", "/api/mesas/" + mesaActual + "/abrir", { comensales: comensales });
  });
});

// El cliente pidió la cuenta: la mesa cambia de estado y la caja la ve
document.getElementById("btnCuenta").addEventListener("click", function () {
  intentar(async function () {
    await api("POST", "/api/mesas/" + mesaActual + "/cuenta", {});
    aviso("🧾 Cuenta solicitada. La caja ya la puede cobrar.", false);
  });
});

// Si los clientes se fueron sin pedir nada, se libera la mesa
document.getElementById("btnCancelar").addEventListener("click", function () {
  intentar(async function () {
    await api("POST", "/api/mesas/" + mesaActual + "/cancelar", {});
    mesaActual = null;
  });
});

// ------------------------------------------------------------
//  2. Carta para tomar el pedido (con fotos)
// ------------------------------------------------------------
function dibujarFiltros(productos) {
  contFiltros.innerHTML = "";
  for (const cat of ["Todas"].concat(listaCategorias(productos))) {
    const boton = document.createElement("button");
    boton.textContent = cat;
    if (cat === categoriaActual) {
      boton.className = "activo";
    }
    boton.addEventListener("click", function () {
      categoriaActual = cat;
      dibujarFiltros(productos);
      dibujarCarta();
    });
    contFiltros.appendChild(boton);
  }
}

function dibujarCarta() {
  let html = "";
  let categoriaPrevia = "";

  for (const p of leerProductos()) {
    if (categoriaActual !== "Todas" && p.categoria !== categoriaActual) {
      continue;
    }
    // Título de cada sección (igual que en la carta)
    if (p.categoria !== categoriaPrevia) {
      html += '<h3 class="titulo-seccion">' + limpiar(p.categoria) + "</h3>";
      categoriaPrevia = p.categoria;
    }

    const cantidad = pedidoNuevo[p.id] || 0;

    // Si el plato está agotado, no se puede pedir
    let controles;
    if (p.disponible) {
      controles =
        '<div class="cantidad">' +
        '<button class="secundario" data-id="' + p.id + '" data-accion="menos">−</button>' +
        "<strong>" + cantidad + "</strong>" +
        '<button data-id="' + p.id + '" data-accion="mas">+</button>' +
        "</div>";
    } else {
      controles = '<span class="estado entregado">Agotado</span>';
    }

    html +=
      '<div class="fila-plato' + (cantidad > 0 ? " en-pedido" : "") + (p.disponible ? "" : " agotado") + '">' +
      (p.imagen ? '<img class="mini-foto" src="' + limpiar(p.imagen) + '" alt="">' : "") +
      '<div class="fila-info"><strong>' + limpiar(p.nombre) + "</strong>" +
      (p.descripcion ? '<div class="gris fila-desc">' + limpiar(p.descripcion) + "</div>" : "") + "</div>" +
      '<div class="fila-precio">' + dinero(p.precio) + "</div>" +
      controles +
      "</div>";
  }
  contCarta.innerHTML = html;
}

// Un solo "oyente" para todos los botones + y −
contCarta.addEventListener("click", function (evento) {
  const boton = evento.target.closest("button");
  if (boton === null) {
    return;
  }

  const id = Number(boton.dataset.id);
  const actual = pedidoNuevo[id] || 0;

  if (boton.dataset.accion === "mas") {
    pedidoNuevo[id] = actual + 1;
  } else if (actual > 0) {
    pedidoNuevo[id] = actual - 1;
  }

  dibujarCarta();
  actualizarResumen();
});

// Cambiar entre "Tomar pedido" y "Ver carta"
document.getElementById("vistas").addEventListener("click", function (evento) {
  const boton = evento.target.closest("button");
  if (boton === null) {
    return;
  }
  const verCarta = boton.dataset.vista === "carta";
  document.getElementById("vistaPedido").style.display = verCarta ? "none" : "block";
  document.getElementById("vistaCarta").style.display = verCarta ? "block" : "none";
  for (const b of document.querySelectorAll("#vistas button")) {
    b.className = b === boton ? "activo" : "";
  }
});

// Resumen (unidades y total del pedido que se está armando)
function actualizarResumen() {
  let unidades = 0;
  let total = 0;

  for (const p of leerProductos()) {
    const cantidad = pedidoNuevo[p.id] || 0;
    unidades = unidades + cantidad;
    total = total + cantidad * p.precio;
  }

  if (unidades === 0) {
    txtResumen.textContent = "Pedido vacío";
    btnEnviar.disabled = true;
  } else {
    txtResumen.textContent = unidades + " producto(s) · " + dinero(total);
    btnEnviar.disabled = false;
  }
}

// ------------------------------------------------------------
//  3. Enviar el pedido a la cocina (se guarda en la lista "pedidos")
// ------------------------------------------------------------
btnEnviar.addEventListener("click", function () {
  if (mesaActual === null) {
    return;
  }

  // Solo mandamos "qué producto y cuántos": el servidor pone nombre y precio
  const items = [];
  for (const id in pedidoNuevo) {
    if (pedidoNuevo[id] > 0) {
      items.push({ id: Number(id), cantidad: pedidoNuevo[id] });
    }
  }

  intentar(async function () {
    await api("POST", "/api/pedidos", { mesa: mesaActual, items: items, nota: inputNota.value.trim() });
    pedidoNuevo = {};
    inputNota.value = "";
    aviso("✔ Pedido enviado a la cocina (Mesa " + mesaActual + ")", false);
  });
});

// ------------------------------------------------------------
//  4. Pedidos de la mesa elegida y su estado
// ------------------------------------------------------------
function dibujarMisPedidos() {
  const lista = pedidosSinPagar(mesaActual);

  if (lista.length === 0) {
    contPedidos.innerHTML = '<p class="gris">Esta mesa todavía no ha pedido nada.</p>';
    return;
  }

  let html = "";
  for (const pedido of lista) {
    let lineas = "";
    for (const item of pedido.items) {
      lineas = lineas + "<li>" + item.cantidad + " × " + limpiar(item.nombre) + "</li>";
    }

    html = html +
      '<div class="tarjeta">' +
      "<strong>Pedido #" + pedido.id + "</strong> · " + pedido.hora + " " +
      '<span class="estado ' + pedido.estado + '">' + NOMBRE_ESTADO[pedido.estado] + "</span>" +
      "<ul>" + lineas + "</ul>" +
      (pedido.nota ? '<div class="gris">Nota: ' + limpiar(pedido.nota) + "</div>" : "") +
      (pedido.estado === "listo" ? '<button data-entregar="' + pedido.id + '" style="margin-top:8px">Marcar entregado</button>' : "") +
      "</div>";
  }
  contPedidos.innerHTML = html;
}

// ------------------------------------------------------------
//  5. Aviso de pedidos listos (de cualquier mesa)
// ------------------------------------------------------------
function dibujarListos() {
  let html = "";

  for (const pedido of ESTADO.pedidos) {
    if (pedido.estado === "listo") {
      html = html +
        '<div class="aviso">🔔 <strong>Mesa ' + pedido.mesa + "</strong>: el pedido #" + pedido.id + " está listo en la cocina. " +
        '<button data-entregar="' + pedido.id + '" style="margin-left:8px">Marcar entregado</button></div>';
    }
  }

  contListos.innerHTML = html;
}

// Botón "Marcar entregado" (funciona en el aviso de arriba y en la lista de la mesa)
document.addEventListener("click", function (evento) {
  const boton = evento.target.closest("button[data-entregar]");
  if (boton === null) {
    return;
  }

  const id = Number(boton.dataset.entregar);
  intentar(function () {
    return api("PATCH", "/api/pedidos/" + id, { estado: "entregado" });
  });
});

// ------------------------------------------------------------
//  Dibujar todo según la mesa elegida
// ------------------------------------------------------------
function dibujarTodo() {
  dibujarMesas();
  dibujarListos();

  zonaAbrir.style.display = "none";
  zonaPedido.style.display = "none";
  barra.style.display = "none";

  if (mesaActual === null) {
    return;
  }

  if (estadoMesa(mesaActual) === "libre") {
    // Mesa libre: lo primero es abrirla
    zonaAbrir.style.display = "block";
    document.getElementById("tituloAbrir").textContent = "Abrir la Mesa " + mesaActual;
    return;
  }

  // Mesa ocupada: se toma el pedido
  zonaPedido.style.display = "block";
  barra.style.display = "block";

  const info = leerMesas()[mesaActual];
  document.getElementById("tituloPedido").textContent = "Pedido de la Mesa " + mesaActual;
  document.getElementById("tituloMesa").textContent = "Pedidos de la Mesa " + mesaActual;
  document.getElementById("infoMesa").textContent = info !== undefined
    ? info.comensales + " persona(s) · abierta a las " + info.hora + (info.cuenta ? " · 🧾 YA PIDIÓ LA CUENTA" : "")
    : "";

  dibujarFiltros(leerProductos());
  dibujarCarta();
  actualizarResumen();
  dibujarMisPedidos();
}

// Cuando cocina o caja cambian algo, el servidor avisa y se refresca sin perder el pedido que se arma
async function alCambio() {
  await cargarEstado();
  dibujarMesas();
  dibujarListos();
  if (mesaActual !== null && estadoMesa(mesaActual) !== "libre" && zonaPedido.style.display === "block") {
    dibujarCarta();
    actualizarResumen();
    dibujarMisPedidos();
  } else if (mesaActual !== null) {
    dibujarTodo();
  }
}

(async function iniciar() {
  await cargarEstado();
  dibujarTodo();
  escucharCambios(alCambio);
})();
