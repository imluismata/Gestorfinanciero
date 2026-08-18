// Unico archivo que conoce la URL base de la API. Si cambia el puerto o
// se despliega, se toca este archivo y no diez.
const API_BASE = "http://localhost:3000/api";

// Envoltura unica de fetch. Todas las llamadas pasan por aqui, asi que:
//  - el manejo de errores es uno solo,
//  - siempre se manda/lee JSON,
//  - se desempaqueta { ok, data } en un solo lugar.
//
// Lanza un Error con el mensaje del servidor cuando algo falla, para que
// quien llama use try/catch y pinte el estado de error.
async function pedir(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE}${ruta}`, {
      headers: { "Content-Type": "application/json" },
      ...opciones,
    });
  } catch {
    // Falla de red: el servidor no responde (apagado, CORS, sin internet).
    throw new Error("No se pudo conectar con el servidor");
  }

  const cuerpo = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !cuerpo.ok) {
    throw new Error(cuerpo.error || "Error inesperado");
  }

  return cuerpo.data;
}

// Objeto api: cada persona agrega aqui las funciones de su modulo.
// Ejemplo (Persona A):
//   listarMovimientos: (query = "") => pedir(`/movimientos${query}`),
//   crearMovimiento:   (datos) => pedir("/movimientos", {
//     method: "POST", body: JSON.stringify(datos),
//   }),
const api = {
  // Chequeo de salud del backend. Sirve para verificar la conexion.
  salud: () => pedir("/salud"),

  // ---- Movimientos y Categorias (Persona A) ----

  // ---- Metodos de pago y Prestamos (Persona B) ----
  listarMetodosPago: (query = "") => pedir(`/metodos-pago${query}`),
  crearMetodoPago: (datos) => pedir("/metodos-pago", { method: "POST", body: JSON.stringify(datos) }),
  actualizarMetodoPago: (id, datos) => pedir(`/metodos-pago/${id}`, { method: "PUT", body: JSON.stringify(datos) }),
  desactivarMetodoPago: (id) => pedir(`/metodos-pago/${id}`, { method: "DELETE" }),
  estadoMetodoPago: (id) => pedir(`/metodos-pago/${id}/estado`),

  listarPrestamos: () => pedir("/prestamos"),
  obtenerPrestamo: (id) => pedir(`/prestamos/${id}`),
  crearPrestamo: (datos) => pedir("/prestamos", { method: "POST", body: JSON.stringify(datos) }),
  eliminarPrestamo: (id) => pedir(`/prestamos/${id}`, { method: "DELETE" }),
  pagarCuota: (idPrestamo, numero, datos) => pedir(`/prestamos/${idPrestamo}/cuotas/${numero}/pagar`, { method: "POST", body: JSON.stringify(datos) }),
};
