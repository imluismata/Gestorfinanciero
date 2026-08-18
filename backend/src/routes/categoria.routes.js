const express = require("express");
const router = express.Router();

const {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  desactivarCategoria,
} = require("../controllers/categoria.controller");

// Las rutas solo mapean URL -> controlador. Cero logica aqui.
router.get("/", obtenerCategorias);
router.post("/", crearCategoria);
router.get("/:id", obtenerCategoriaPorId);
router.put("/:id", actualizarCategoria);
router.delete("/:id", desactivarCategoria);

module.exports = router;
