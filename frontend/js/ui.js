// Helpers de interfaz compartidos por los dos modulos. Centralizan los
// tres estados visibles que toda operacion debe mostrar (cargando, error,
// exito) y el escape de texto para no inyectar HTML del usuario.

// Escapa texto antes de meterlo en el DOM con innerHTML. Sin esto, un
// gasto llamado "<img onerror=...>" ejecutaria codigo. Regla del skill:
// no construir HTML concatenando datos del usuario sin escapar.
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : String(texto);
  return div.innerHTML;
}

// Muestra un estado de carga dentro de un contenedor.
function mostrarCargando(contenedor, mensaje = "Cargando...") {
  contenedor.innerHTML = `<p class="estado estado--cargando">${escapar(mensaje)}</p>`;
}

// Muestra un estado de error dentro de un contenedor.
function mostrarError(contenedor, mensaje) {
  contenedor.innerHTML = `<p class="estado estado--error">${escapar(mensaje)}</p>`;
}

// Mensaje breve de exito (toast). Aparece y se va solo a los 3 segundos.
function mostrarExito(mensaje) {
  const toast = document.createElement("div");
  toast.className = "toast toast--exito";
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Confirmacion antes de una accion destructiva. El skill exige que
// eliminar siempre pida confirmacion; se centraliza aqui.
function confirmar(mensaje) {
  return window.confirm(mensaje);
}
