const { MetodoPago } = require("../models/metodoPago.model");
const ErrorNegocio = require("../utils/errorNegocio");

// Valida la cuenta de origen opcional de un prestamo. Con una tarjeta
// de credito no se paga un prestamo (tabla de tipos de movimiento en
// el skill).
const validarCuentaOrigen = async (cuentaOrigenId) => {
  const metodo = await MetodoPago.findById(cuentaOrigenId);

  if (!metodo || !metodo.activo) {
    throw new ErrorNegocio(
      "La cuenta de origen indicada no existe o esta desactivada"
    );
  }

  if (metodo.tipo === "tarjeta_credito") {
    throw new ErrorNegocio(
      "La cuenta de origen no puede ser una tarjeta de credito: un prestamo se paga desde una cuenta o efectivo"
    );
  }

  return metodo;
};

// Valida todo lo necesario para pagar una cuota (que exista, que no
// este pagada, que origen y categoria vengan, que el origen sea un
// metodo de pago valido) y devuelve la cuota y el metodo de origen ya
// resueltos. El controlador solo se encarga de crear el Movimiento y
// guardar el prestamo con eso.
const prepararPagoCuota = async (prestamo, numero, datos) => {
  const cuota = prestamo.cuotas.find((c) => c.numero === numero);

  if (!cuota) {
    throw new ErrorNegocio(
      `La cuota numero ${numero} no existe en este prestamo`,
      404
    );
  }

  if (cuota.pagada) {
    throw new ErrorNegocio(
      `La cuota numero ${numero} ya esta marcada como pagada`
    );
  }

  // origen y categoria son requeridos para un cuota_prestamo. origen
  // usa la cuenta guardada en el prestamo si el body no manda otra.
  const origenId = datos.origen || prestamo.cuentaOrigen;

  if (!origenId) {
    throw new ErrorNegocio(
      "Falta indicar la cuenta o efectivo de origen (origen) para registrar el pago"
    );
  }

  if (!datos.categoria) {
    throw new ErrorNegocio(
      "Falta la categoria para registrar el pago de la cuota"
    );
  }

  const metodoOrigen = await MetodoPago.findById(origenId);

  if (!metodoOrigen || !metodoOrigen.activo) {
    throw new ErrorNegocio(
      "La cuenta o efectivo de origen no existe o esta desactivado"
    );
  }

  if (metodoOrigen.tipo === "tarjeta_credito") {
    throw new ErrorNegocio(
      "El origen del pago de una cuota no puede ser una tarjeta de credito"
    );
  }

  return { cuota, metodoOrigen };
};

module.exports = { validarCuentaOrigen, prepararPagoCuota };
