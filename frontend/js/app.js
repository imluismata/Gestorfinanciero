// Punto de entrada del frontend: une los eventos de la pagina con las
// llamadas a la API. Cada persona engancha aqui las pantallas de su
// modulo.

// Al cargar la pagina, comprueba que el backend responde y lo refleja en
// la cabecera. Sirve para saber de inmediato si falta levantar el
// servidor o configurar el .env, antes de pelear con cualquier feature.
async function comprobarConexion() {
  const indicador = document.getElementById("estado-conexion");
  try {
    await api.salud();
    indicador.textContent = "conectado";
    indicador.className = "conexion conexion--ok";
  } catch (err) {
    indicador.textContent = "sin conexion";
    indicador.className = "conexion conexion--error";
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  comprobarConexion();

  // Aqui cada persona inicializa su pantalla:
  //   inicializarMovimientos();  // Persona A
  //   inicializarMetodosPago();  // Persona B
});
