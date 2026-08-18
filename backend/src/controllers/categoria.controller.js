const Categoria = require("../models/categoria.model");
const { exito, creado, error } = require("../utils/respuesta");

// GET /api/categorias
// Devuelve el arbol (raices con sus subcategorias) o la lista plana.
// Query opcional:
//   ?aplicaA=gasto|ingreso  -> un solo arbol (obligatorio al llenar un selector)
//   ?soloActivas=true       -> excluye las desactivadas
//   ?plano=true             -> lista sin anidar
const obtenerCategorias = async (req, res) => {
  try {
    const filtro = {};

    if (req.query.aplicaA) {
      filtro.aplicaA = req.query.aplicaA;
    }
    if (req.query.soloActivas === "true") {
      filtro.activo = true;
    }

    // Una sola consulta trae todo; la jerarquia se arma en memoria. Son
    // decenas de documentos, no miles: cargarlos completos es mas barato
    // que una consulta por cada categoria principal.
    const todas = await Categoria.find(filtro).sort({ nombre: 1 });

    if (req.query.plano === "true") {
      return exito(res, todas);
    }

    const raices = todas.filter((c) => c.padre === null);

    const arbol = raices.map((raiz) => ({
      ...raiz.toObject(),
      // toString() en ambos lados: comparar un ObjectId con === falla
      // siempre porque son objetos distintos aunque valgan lo mismo.
      subcategorias: todas.filter(
        (c) => c.padre && c.padre.toString() === raiz._id.toString()
      ),
    }));

    return exito(res, arbol);
  } catch (err) {
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// GET /api/categorias/:id
const obtenerCategoriaPorId = async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);

    if (!categoria) {
      return error(res, "Categoria no encontrada", 404);
    }

    return exito(res, categoria);
  } catch (err) {
    // CastError: el id no tiene formato de ObjectId. Culpa del cliente.
    if (err.name === "CastError") {
      return error(res, "Id no valido", 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// POST /api/categorias
// Crea una categoria principal (sin padre) o una subcategoria (con padre).
// El hook del modelo valida la profundidad y hereda `aplicaA` del padre.
const crearCategoria = async (req, res) => {
  try {
    const { nombre, padre, color, aplicaA } = req.body;

    const categoria = await Categoria.create({
      nombre,
      padre: padre || null,
      color,
      aplicaA,
    });

    return creado(res, categoria);
  } catch (err) {
    // ValidationError (schema) y los Error del hook pre-save llegan aqui.
    if (err.name === "ValidationError" || err.name === "Error") {
      return error(res, err.message, 400);
    }
    // Indice unico: ya existe una categoria con ese nombre bajo el mismo padre.
    if (err.code === 11000) {
      return error(res, "Ya existe una categoria con ese nombre", 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// PUT /api/categorias/:id
// Solo se actualiza nombre y color. Cambiar `padre` esta prohibido: los
// gastos historicos quedarian con una categoria que ya no corresponde a
// su subcategoria. Para corregir un error: desactivar y crear otra.
const actualizarCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);

    if (!categoria) {
      return error(res, "Categoria no encontrada", 404);
    }

    // Rechazar cualquier intento de reparentar.
    if (
      req.body.padre !== undefined &&
      String(req.body.padre) !== String(categoria.padre)
    ) {
      return error(
        res,
        "No se puede cambiar el padre de una categoria. Desactivela y cree una nueva.",
        400
      );
    }

    if (req.body.nombre !== undefined) categoria.nombre = req.body.nombre;
    if (req.body.color !== undefined) categoria.color = req.body.color;

    await categoria.save();
    return exito(res, categoria);
  } catch (err) {
    if (err.name === "CastError") {
      return error(res, "Id no valido", 400);
    }
    if (err.name === "ValidationError") {
      return error(res, err.message, 400);
    }
    if (err.code === 11000) {
      return error(res, "Ya existe una categoria con ese nombre", 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// DELETE /api/categorias/:id
// Desactiva (activo: false), no borra. No se puede desactivar una
// categoria principal que tenga subcategorias activas: primero hay que
// desactivar las hijas, para que el alcance de la accion sea explicito.
const desactivarCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);

    if (!categoria) {
      return error(res, "Categoria no encontrada", 404);
    }

    // Si es una categoria principal, revisar que no tenga hijas activas.
    if (!categoria.padre) {
      const hijasActivas = await Categoria.countDocuments({
        padre: categoria._id,
        activo: true,
      });

      if (hijasActivas > 0) {
        return error(
          res,
          "Primero desactive las subcategorias activas de esta categoria",
          400
        );
      }
    }

    categoria.activo = false;
    await categoria.save();

    return exito(res, categoria);
  } catch (err) {
    if (err.name === "CastError") {
      return error(res, "Id no valido", 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

module.exports = {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  desactivarCategoria,
};
