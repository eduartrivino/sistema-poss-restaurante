// ============================================================
//  carta.js  →  carta digital para el CLIENTE (la que abre el QR)
//  Solo muestra la carta con fotos. El pedido lo toma el mesero.
// ============================================================
let categoriaActual = "Todas";
let productos = [];

const contFiltros = document.getElementById("filtros");
const contCarta = document.getElementById("carta");

function dibujarFiltros() {
  contFiltros.innerHTML = "";
  for (const cat of ["Todas"].concat(listaCategorias(productos))) {
    const boton = document.createElement("button");
    boton.textContent = cat;
    if (cat === categoriaActual) {
      boton.className = "activo";
    }
    boton.addEventListener("click", function () {
      categoriaActual = cat;
      dibujar();
    });
    contFiltros.appendChild(boton);
  }
}

function dibujarCarta() {
  let html = "";
  for (const cat of listaCategorias(productos)) {
    if (categoriaActual !== "Todas" && cat !== categoriaActual) {
      continue;
    }
    html += "<h2>" + limpiar(cat) + '</h2><div class="cuadricula">';
    for (const p of productos) {
      if (p.categoria !== cat) {
        continue;
      }
      html +=
        '<div class="tarjeta plato' + (p.disponible ? "" : " agotado") + '">' +
        fotoHTML(p) +
        '<div class="plato-info"><strong>' + limpiar(p.nombre) + "</strong>" +
        '<p class="gris">' + limpiar(p.descripcion || "") + "</p>" +
        '<div class="precio">' + dinero(p.precio) + "</div>" +
        (p.disponible ? "" : '<span class="estado entregado">Agotado hoy</span>') +
        "</div></div>";
    }
    html += "</div>";
  }
  contCarta.innerHTML = html;
}

function dibujar() {
  dibujarFiltros();
  dibujarCarta();
}

// La carta es pública: no necesita clave
async function cargar() {
  const r = await fetch("/api/menu");
  const d = await r.json();
  productos = d.productos;
  document.getElementById("nombre").textContent = d.nombre;
  document.title = "Carta · " + d.nombre;
  dibujar();
}

cargar();
escucharCambios(cargar);   // si el administrador cambia un precio o agota un plato, se actualiza sola
