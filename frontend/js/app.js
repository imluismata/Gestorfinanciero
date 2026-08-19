// Punto de entrada del frontend: une los eventos de la pagina con las
// llamadas a la API. Cada persona engancha aqui las pantallas de su
// modulo.

// Al cargar la pagina, comprueba que el backend responde. Es un detalle
// tecnico de desarrollo (¿levante el servidor? ¿el .env esta bien?), no
// algo que el usuario final necesite ver: por eso solo queda en
// consola, sin indicador en la pantalla.
async function comprobarConexion() {
  try {
    await api.salud();
    console.log("Backend conectado");
  } catch (err) {
    console.error("No se pudo conectar con el backend:", err);
  }
}

// Pestañas del nav: muestra la seccion cuyo data-pantalla coincide con
// el boton clickeado y esconde el resto. Generico a proposito, para que
// cualquiera de los dos agregue pantallas nuevas sin tocar esta funcion.
function mostrarPantalla(nombre) {
  document.querySelectorAll(".nav-boton").forEach((boton) => {
    boton.classList.toggle("nav-boton--activo", boton.dataset.pantalla === nombre);
  });
  document.querySelectorAll(".pantalla").forEach((seccion) => {
    seccion.hidden = seccion.dataset.pantalla !== nombre;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  comprobarConexion();

  document.querySelectorAll(".nav-boton[data-pantalla]").forEach((boton) => {
    boton.addEventListener("click", () => mostrarPantalla(boton.dataset.pantalla));
  });

  // Aqui cada persona inicializa su pantalla:
  inicializarResumen(); // Persona A
  inicializarMovimientos(); // Persona A
  inicializarCategorias(); // Persona A
  inicializarMetodosPago(); // Persona B
  inicializarPrestamos(); // Persona B
});
