const express = require("express");
const router = express.Router();

const {
  obtenerMovimientos,
  obtenerResumen,
  obtenerMovimientoPorId,
  crearMovimiento,
  actualizarMovimiento,
  eliminarMovimiento,
  registrarPagoTarjeta,
} = require("../controllers/movimiento.controller");
const validarMovimiento = require("../middlewares/validarMovimiento");

// IMPORTANTE: las rutas literales (/resumen, /pago-tarjeta) van ANTES que
// /:id. Express evalua en orden y /:id capturaria esas palabras como si
// fueran un id.
router.get("/resumen", obtenerResumen);
router.post("/pago-tarjeta", registrarPagoTarjeta); // aporte de Persona B

router.get("/", obtenerMovimientos);
router.post("/", validarMovimiento, crearMovimiento);

router.get("/:id", obtenerMovimientoPorId);
router.put("/:id", validarMovimiento, actualizarMovimiento);
router.delete("/:id", eliminarMovimiento);

module.exports = router;
