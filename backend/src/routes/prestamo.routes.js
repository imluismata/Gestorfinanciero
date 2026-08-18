const express = require("express");
const router = express.Router();

const {
  listarPrestamos,
  obtenerPrestamoPorId,
  crearPrestamo,
  eliminarPrestamo,
  pagarCuota,
} = require("../controllers/prestamo.controller");

router.get("/", listarPrestamos);
router.post("/", crearPrestamo);

router.post("/:id/cuotas/:numero/pagar", pagarCuota);

router.get("/:id", obtenerPrestamoPorId);
router.delete("/:id", eliminarPrestamo);

module.exports = router;
