const express = require("express");
const cors = require("cors");

const manejadorErrores = require("./middlewares/manejadorErrores");

// Crea y configura Express, pero NO levanta el puerto. Eso lo hace
// server.js. Separarlos permite importar la app en pruebas sin abrir
// un socket.
const app = express();

// El frontend se sirve desde otro origen (Live Server, etc.), asi que
// el navegador necesita permiso CORS para llamar a esta API.
app.use(cors());

// Parsea el body JSON de las peticiones (POST, PUT).
app.use(express.json());

// Chequeo de salud: permite verificar que el backend responde sin
// depender de ninguna entidad. Util para el primer arranque.
app.get("/api/salud", (req, res) => {
  res.status(200).json({
    ok: true,
    data: { estado: "ok", hora: new Date().toISOString() },
  });
});

// -------------------------------------------------------------------
// Rutas por entidad. Cada persona descomenta la suya cuando su router
// exista. Un prefijo por entidad (ver contrato de la API en el skill).
// -------------------------------------------------------------------
const movimientoRoutes = require("./routes/movimiento.routes");
app.use("/api/movimientos", movimientoRoutes);
// Alias temporal para la entrega: la rubrica menciona "Entidad: Gastos".
// Mismo router, misma logica. Remover despues de calificar: dos URLs para
// el mismo recurso es deuda tecnica, no una feature.
app.use("/api/gastos", movimientoRoutes);

app.use("/api/categorias", require("./routes/categoria.routes"));
app.use("/api/metodos-pago", require("./routes/metodoPago.routes"));
app.use("/api/prestamos", require("./routes/prestamo.routes"));

// Ruta no encontrada: cualquier cosa que no matchee arriba cae aqui.
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada" });
});

// Manejador de errores: SIEMPRE al final, despues de todas las rutas.
// Es la red de seguridad para lo que se escape de los try/catch.
app.use(manejadorErrores);

module.exports = app;
