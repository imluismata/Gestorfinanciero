const { MetodoPago } = require("../models/metodoPago.model");
const { exito, creado, error } = require("../utils/respuesta");
const { calcularEstadoMetodoPago } = require("../services/metodoPago.service");

// Campos editables por PUT, segun el tipo. `tipo` y `activo` quedan
// afuera a proposito: el tipo no se puede cambiar (es el discriminador)
// y `activo` solo lo toca el DELETE. `saldoInicial` tambien queda
// afuera: es una foto del dia en que se empezo a usar la app, y
// editarla despues descuadra todo el historial hacia atras (ver skill).
const CAMPOS_EDITABLES = {
  tarjeta_credito: [
    "nombre",
    "banco",
    "moneda",
    "limiteCredito",
    "diaCorte",
    "diaLimitePago",
    "tasaInteresAnual",
  ],
  cuenta: ["nombre", "banco", "moneda", "esAhorro"],
  efectivo: ["nombre", "banco", "moneda"],
};

// GET /api/metodos-pago
// Por defecto solo los activos, para llenar selectores. Las pantallas
// de gestion piden ?incluirInactivos=true para verlos todos.
const listarMetodosPago = async (req, res) => {
  try {
    const filtro =
      req.query.incluirInactivos === "true" ? {} : { activo: true };
    const metodos = await MetodoPago.find(filtro).sort({ nombre: 1 });
    return exito(res, metodos);
  } catch (err) {
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// POST /api/metodos-pago
// El tipo decide que discriminador usar. Mongoose no acepta crear un
// documento con tipo invalido a traves de MetodoPago.create(), asi que
// se valida antes de tocar la base.
const crearMetodoPago = async (req, res) => {
  try {
    const { tipo } = req.body;
    const ModeloEspecifico = MetodoPago.discriminators[tipo];

    if (!ModeloEspecifico) {
      return error(res, "Tipo de metodo de pago no valido", 400);
    }

    const metodo = await ModeloEspecifico.create(req.body);
    return creado(res, metodo);
  } catch (err) {
    if (err.name === "ValidationError") {
      return error(res, err.message, 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// PUT /api/metodos-pago/:id
const actualizarMetodoPago = async (req, res) => {
  try {
    const metodo = await MetodoPago.findById(req.params.id);

    if (!metodo) {
      return error(res, "Metodo de pago no encontrado", 404);
    }

    if (req.body.tipo && req.body.tipo !== metodo.tipo) {
      return error(
        res,
        "El tipo de un metodo de pago no se puede cambiar",
        400
      );
    }

    const camposPermitidos = CAMPOS_EDITABLES[metodo.tipo] || [];
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        metodo[campo] = req.body[campo];
      }
    }

    await metodo.save();
    return exito(res, metodo);
  } catch (err) {
    if (err.name === "ValidationError") {
      return error(res, err.message, 400);
    }
    if (err.name === "CastError") {
      return error(res, "Id no valido", 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// DELETE /api/metodos-pago/:id
// Desactiva, nunca borra: hay movimientos historicos que lo referencian.
const desactivarMetodoPago = async (req, res) => {
  try {
    const metodo = await MetodoPago.findById(req.params.id);

    if (!metodo) {
      return error(res, "Metodo de pago no encontrado", 404);
    }

    metodo.activo = false;
    await metodo.save();
    return exito(res, metodo);
  } catch (err) {
    if (err.name === "CastError") {
      return error(res, "Id no valido", 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// GET /api/metodos-pago/:id/estado
// Saldo, disponible y proximas fechas. El calculo en si vive en
// services/metodoPago.service.js: este handler solo busca el
// documento, delega el calculo y responde.
const obtenerEstadoMetodoPago = async (req, res) => {
  try {
    const metodo = await MetodoPago.findById(req.params.id);

    if (!metodo) {
      return error(res, "Metodo de pago no encontrado", 404);
    }

    const estado = await calcularEstadoMetodoPago(metodo);
    return exito(res, estado);
  } catch (err) {
    if (err.name === "CastError") {
      return error(res, "Id no valido", 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

module.exports = {
  listarMetodosPago,
  crearMetodoPago,
  actualizarMetodoPago,
  desactivarMetodoPago,
  obtenerEstadoMetodoPago,
};
