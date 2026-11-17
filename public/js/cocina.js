// ============================================================
//  cocina.js  →  módulo de la COCINA
//  Muestra los pedidos que envía el mesero y deja cambiar su estado:
//  recibido → preparando → listo   (el mesero lo marca "entregado")
// ============================================================

if (!exigirRol("cocina")) { throw new Error("sin sesión"); }
document.getElementById("salir").addEventListener("click", cerrarSesion);

// Qué estado sigue después de cada uno, y qué texto lleva el botón
const SIGUIENTE = {
  recibido:   { estado: "preparando", texto: "Empezar a preparar" },
  preparando: { estado: "listo",      texto: "Marcar listo" }
};

// Minutos que lleva esperando un pedido (usa la hora en que se creó)
function minutosEspera(pedido) {
  if (pedido.creado === undefined) {
    return 0;
  }
  return Math.floor((Date.now() - pedido.creado) / 60000);
}

function dibujarCocina() {
  const pedidos = ESTADO.pedidos;

  // Vaciamos las tres columnas
  document.getElementById("col-recibido").innerHTML = "";
  document.getElementById("col-preparando").innerHTML = "";
  document.getElementById("col-listo").innerHTML = "";

  let cuantos = 0;

  for (const pedido of pedidos) {
    // La cocina no necesita ver los pedidos ya entregados ni los ya pagados
    if (pedido.estado === "entregado" || pedido.pagado) {
      continue;
    }
    cuantos = cuantos + 1;

    let lineas = "";
    for (const item of pedido.items) {
      lineas = lineas + "<li><strong>" + item.cantidad + " ×</strong> " + limpiar(item.nombre) + "</li>";
    }

    // Tiempo de espera: se pone en rojo si pasa de 15 minutos
    const minutos = minutosEspera(pedido);
    const claseTiempo = minutos >= 15 && pedido.estado !== "listo" ? "tarde" : "gris";

    // Los pedidos "listos" esperan al mesero: no tienen botón
    let boton = "";
    if (SIGUIENTE[pedido.estado] !== undefined) {
      boton = '<button data-id="' + pedido.id + '" style="margin-top:8px">' + SIGUIENTE[pedido.estado].texto + "</button>";
    } else {
      boton = '<div class="gris" style="margin-top:8px">Esperando al mesero…</div>';
    }

    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta";
    tarjeta.innerHTML =
      "<strong>Mesa " + pedido.mesa + "</strong> · Pedido #" + pedido.id + " · " + pedido.hora +
      ' · <span class="' + claseTiempo + '">hace ' + minutos + " min</span>" +
      "<ul>" + lineas + "</ul>" +
      (pedido.nota ? '<div class="nota-cocina">Nota: ' + limpiar(pedido.nota) + "</div>" : "") +
      boton;

    document.getElementById("col-" + pedido.estado).appendChild(tarjeta);
  }

  // Mostramos u ocultamos el mensaje "no hay pedidos"
  document.getElementById("vacio").style.display = cuantos === 0 ? "block" : "none";
}

// Cuando se pulsa el botón de un pedido, avanza al siguiente estado (lo valida el servidor)
document.addEventListener("click", async function (evento) {
  const boton = evento.target.closest("button[data-id]");
  if (boton === null) {
    return;
  }
  const id = Number(boton.dataset.id);
  const pedido = ESTADO.pedidos.find(function (p) {
    return p.id === id;
  });
  if (pedido === undefined || SIGUIENTE[pedido.estado] === undefined) {
    return;
  }
  try {
    await api("PATCH", "/api/pedidos/" + id, { estado: SIGUIENTE[pedido.estado].estado });
  } catch (error) {
    alert(error.message);
  }
  await cargarEstado();
  dibujarCocina();
});

async function refrescar() {
  await cargarEstado();
  dibujarCocina();
}

(async function iniciar() {
  await refrescar();
  escucharCambios(refrescar);                 // llega un pedido nuevo → se actualiza solo
  setInterval(dibujarCocina, 30000);          // cada 30 s se refrescan los minutos de espera
})();
