const express = require("express");
const router = express.Router();

const {
  registrarPagoTarjeta,
} = require("../controllers/movimiento.controller");

// NOTA DE EQUIPO: Persona A agrega aqui las rutas del CRUD de
// Movimiento (GET /, GET /resumen, GET /:id, POST /, PUT /:id,
// DELETE /:id). Las rutas literales como /resumen y /pago-tarjeta van
// SIEMPRE antes de /:id: Express evalua en orden y /:id capturaria esas
// palabras como si fueran un id.
router.post("/pago-tarjeta", registrarPagoTarjeta);

module.exports = router;
