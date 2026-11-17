// login.js → pantalla de entrada del personal
const selRol = document.getElementById("selRol");
const inpClave = document.getElementById("inpClave");
const msg = document.getElementById("msg");

// Ponemos el nombre del restaurante (dato público)
fetch("/api/menu").then(function (r) { return r.json(); }).then(function (d) {
  document.getElementById("nombre").textContent = d.nombre;
});

async function entrar() {
  try {
    await iniciarSesion(selRol.value, inpClave.value);
    location.href = PAGINA_ROL[selRol.value];   // lo manda a su módulo
  } catch (error) {
    msg.innerHTML = '<div class="error">' + limpiar(error.message) + "</div>";
    inpClave.value = "";
    inpClave.focus();
  }
}

document.getElementById("btnEntrar").addEventListener("click", entrar);
inpClave.addEventListener("keydown", function (evento) {
  if (evento.key === "Enter") {
    entrar();
  }
});
