// ============================================================
//  layout.js  →  el "marco" de las pantallas del personal:
//  barra lateral con los módulos + barra superior con el título y el usuario.
//  Se ejecuta ANTES del código de cada página y reemplaza el encabezado simple.
// ============================================================
(function () {
  const rol = sessionStorage.getItem("rol");
  const principal = document.querySelector("main");
  const encabezado = document.querySelector("header");
  if (!rol || !principal || !encabezado) {
    return;   // sin sesión: la página se encargará de mandar al inicio
  }

  const NOMBRE_ROL = { mesero: "Mesero", cocina: "Cocina", caja: "Caja", administrador: "Administrador" };
  const MODULOS = [
    { pagina: "mesero.html", rol: "mesero", icono: "🛎", texto: "Salón y pedidos" },
    { pagina: "cocina.html", rol: "cocina", icono: "👨‍🍳", texto: "Cocina" },
    { pagina: "caja.html", rol: "caja", icono: "💵", texto: "Caja" },
    { pagina: "admin.html", rol: "administrador", icono: "⚙️", texto: "Administración" }
  ];
  const actual = location.pathname.split("/").pop();
  const titulo = encabezado.querySelector("h1") ? encabezado.querySelector("h1").textContent.trim() : document.title;

  let enlaces = "";
  for (const m of MODULOS) {
    if (rol !== "administrador" && rol !== m.rol) {
      continue;   // cada empleado solo ve su módulo
    }
    enlaces += '<a class="lateral-enlace' + (m.pagina === actual ? " activo" : "") + '" href="' + m.pagina + '"><span>' + m.icono + "</span> " + m.texto + "</a>";
  }

  const aside = document.createElement("aside");
  aside.className = "lateral";
  aside.innerHTML =
    '<div class="lateral-marca"><div class="logo-letra">F</div><div><strong id="marcaNombre">Restaurante</strong><small>Sistema de pedidos</small></div></div>' +
    '<div class="lateral-seccion">Operación</div>' + enlaces +
    '<div class="lateral-pie"><a href="#" id="salir" class="lateral-enlace"><span>🚪</span> Cerrar sesión</a></div>';

  const barra = document.createElement("div");
  barra.className = "barra-sup";
  barra.innerHTML =
    '<button id="btnMenu" class="btn-menu" aria-label="Abrir menú">☰</button>' +
    '<div><div class="barra-titulo">' + titulo + '</div><div class="barra-ruta">' + (NOMBRE_ROL[rol] || rol) + " · <span id=\"rutaNombre\">Restaurante</span></div></div>" +
    '<div class="usuario"><div class="usuario-texto"><strong>' + (NOMBRE_ROL[rol] || rol) + "</strong><small>Sesión activa</small></div>" +
    '<div class="avatar">' + (NOMBRE_ROL[rol] || "?").charAt(0) + "</div></div>";

  // Armamos: [lateral] [contenido: barra + main]
  const app = document.createElement("div");
  app.className = "app";
  const contenido = document.createElement("div");
  contenido.className = "contenido";
  document.body.insertBefore(app, encabezado);
  encabezado.remove();
  app.appendChild(aside);
  app.appendChild(contenido);
  contenido.appendChild(barra);
  contenido.appendChild(principal);
  const barraPedido = document.querySelector(".barra-carrito");   // la barra de "Enviar a cocina" también va dentro del contenido
  if (barraPedido) {
    contenido.appendChild(barraPedido);
  }
  document.body.classList.add("con-marco");

  // En el celular el menú lateral se abre con ☰
  document.getElementById("btnMenu").addEventListener("click", function () {
    aside.classList.toggle("abierto");
  });
  contenido.addEventListener("click", function () {
    aside.classList.remove("abierto");
  });

  // Nombre del restaurante (dato público)
  fetch("/api/menu").then(function (r) { return r.json(); }).then(function (d) {
    document.getElementById("marcaNombre").textContent = d.nombre;
    document.getElementById("rutaNombre").textContent = d.nombre;
    document.querySelector(".logo-letra").textContent = d.nombre.charAt(0).toUpperCase();
  }).catch(function () {});
})();
