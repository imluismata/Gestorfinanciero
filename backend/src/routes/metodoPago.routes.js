const express = require("express");
const router = express.Router();

const {
  listarMetodosPago,
  crearMetodoPago,
  actualizarMetodoPago,
  desactivarMetodoPago,
  obtenerEstadoMetodoPago,
} = require("../controllers/metodoPago.controller");

// Solo mapea URL + metodo a un handler. Nada de logica aqui.
router.get("/", listarMetodosPago);
router.post("/", crearMetodoPago);

// /:id/estado tiene un segmento mas que /:id, asi que no hay ambiguedad
// de orden entre ambas (Express no confundiria "estado" con un id).
router.get("/:id/estado", obtenerEstadoMetodoPago);

router.put("/:id", actualizarMetodoPago);
router.delete("/:id", desactivarMetodoPago);

module.exports = router;
