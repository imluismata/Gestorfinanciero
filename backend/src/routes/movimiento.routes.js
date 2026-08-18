const express = require("express");
const router = express.Router();

const {
  obtenerMovimientos,
  obtenerResumen,
  obtenerMovimientoPorId,
  crearMovimiento,
  actualizarMovimiento,
  eliminarMovimiento,
} = require("../controllers/movimiento.controller");
const validarMovimiento = require("../middlewares/validarMovimiento");

// IMPORTANTE: las rutas literales van ANTES que /:id. Express evalua en
// orden y /:id capturaria "resumen" como si fuera un id.
router.get("/resumen", obtenerResumen);

router.get("/", obtenerMovimientos);
router.post("/", validarMovimiento, crearMovimiento);

router.get("/:id", obtenerMovimientoPorId);
router.put("/:id", validarMovimiento, actualizarMovimiento);
router.delete("/:id", eliminarMovimiento);

module.exports = router;
