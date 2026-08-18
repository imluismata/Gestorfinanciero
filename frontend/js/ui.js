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

// ---------------------------------------------------------------
// Iconos: SVG en linea, dibujados a mano, sin CDN ni fuente de iconos
// externa (Material Symbols, etc.). Trazo simple estilo "outline",
// hereda color con currentColor para que cada pantalla los tiña con su
// propio acento.
// ---------------------------------------------------------------
const ICONOS = {
  tarjeta: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
  cuenta: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="21" x2="5" y2="10"/><line x1="9" y1="21" x2="9" y2="10"/><line x1="15" y1="21" x2="15" y2="10"/><line x1="19" y1="21" x2="19" y2="10"/><polygon points="12 3 21 9 3 9"/></svg>`,
  efectivo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>`,
  prestamo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
  lapiz: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  bloquear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg>`,
  papelera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  masCirculo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  cheque: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

// Devuelve el SVG de un icono por nombre, o cadena vacia si no existe.
function icono(nombre) {
  return ICONOS[nombre] || "";
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

// ---------------------------------------------------------------
// Dinero: espejo en el navegador de backend/src/utils/dinero.js.
// El frontend no puede hacer require() de codigo del backend (no hay
// bundler), asi que la misma regla -- todo monto se guarda y viaja en
// centavos -- se repite aqui, en un solo lugar, para no formatear
// dinero distinto en cada pantalla.
// ---------------------------------------------------------------

// Convierte lo que escribe el usuario (pesos) a centavos para mandar a
// la API. Acepta tanto un numero como el texto formateado con comas de
// los campos de dinero ("3,401.58"). Math.round evita que 19.99 * 100
// llegue como 1998.9999...
function aCentavos(pesos) {
  const limpio = typeof pesos === "string" ? pesos.replace(/,/g, "") : pesos;
  return Math.round(Number(limpio) * 100);
}

// Centavos guardados -> numero en pesos, para calculos.
function aPesos(centavos) {
  return Number(centavos) / 100;
}

// Centavos -> texto de moneda para mostrar en pantalla.
function formatearMoneda(centavos, moneda = "DOP") {
  if (centavos === null || centavos === undefined || Number.isNaN(centavos)) {
    return "—";
  }
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: moneda }).format(aPesos(centavos));
}

// Fecha guardada (ISO) -> "15 ago 2026", el formato corto que se lee de
// un vistazo en una lista o una tarjeta.
function formatearFecha(fechaISO) {
  if (!fechaISO) return "—";
  return new Date(fechaISO).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

// "1200000.5" -> "1,200,000.5". Separa el entero en grupos de tres y
// deja el decimal (maximo 2 cifras) tal cual, sin redondear todavia:
// el redondeo real pasa en aCentavos al mandar el formulario.
function formatearValorMiles(valor) {
  const limpio = String(valor ?? "").replace(/[^\d.]/g, "");
  const [enteroBruto, ...resto] = limpio.split(".");
  const entero = enteroBruto.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimal = resto.length > 0 ? "." + resto.join("").slice(0, 2) : "";
  return entero + decimal;
}

// Conecta un <input type="text"> para que se reformatee con comas de
// miles en cada tecla. Un <input type="number"> nunca podria hacer
// esto: el navegador rechaza la coma como caracter invalido. Mantiene
// el cursor en su lugar relativo al final, para no saltar al escribir
// en medio del numero.
function activarFormatoMiles(input) {
  input.addEventListener("input", () => {
    const distanciaDelFinal = input.value.length - input.selectionStart;
    input.value = formatearValorMiles(input.value);
    const posicion = Math.max(0, input.value.length - distanciaDelFinal);
    input.setSelectionRange(posicion, posicion);
  });
}

// Arma un <select> a partir de una lista de { valor, texto }. Evita
// repetir el mismo bucle de <option> en cada pantalla que llena un
// selector.
function llenarSelect(select, opciones, { placeholder } = {}) {
  select.innerHTML = "";

  if (placeholder) {
    const vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = placeholder;
    select.appendChild(vacio);
  }

  for (const { valor, texto } of opciones) {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = texto;
    select.appendChild(option);
  }
}
