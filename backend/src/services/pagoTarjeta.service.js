const { MetodoPago } = require("../models/metodoPago.model");
const ErrorNegocio = require("../utils/errorNegocio");

// Valida un pago de tarjeta y devuelve los dos documentos ya
// resueltos. Es la "validacion cruzada de tipos" que ARQUITECTURA.md
// pide sacar del controlador: no toca req ni res, solo lanza
// ErrorNegocio cuando algo no cumple una regla del dominio.
const validarPagoTarjeta = async ({ origen, destino, monto }) => {
  // !monto trataria 0 como "falta el campo" en vez de "monto invalido"
  // (0 es falsy en JS), por eso la presencia y el valor se chequean
  // por separado.
  if (!origen || !destino || monto === undefined) {
    throw new ErrorNegocio("origen, destino y monto son obligatorios");
  }

  if (monto <= 0) {
    throw new ErrorNegocio("El monto debe ser mayor que cero");
  }

  // Una sola consulta para traer los dos documentos, en vez de dos
  // findById. Se identifican por id y no por posicion: MongoDB no
  // garantiza el orden de los resultados de un $in.
  const metodos = await MetodoPago.find({ _id: { $in: [origen, destino] } });
  const cuentaOrigen = metodos.find((m) => m._id.toString() === origen);
  const tarjetaDestino = metodos.find((m) => m._id.toString() === destino);

  if (!cuentaOrigen || !tarjetaDestino) {
    throw new ErrorNegocio("El origen o el destino no existe");
  }

  if (cuentaOrigen.tipo === "tarjeta_credito") {
    throw new ErrorNegocio("No se puede pagar una tarjeta con otra tarjeta");
  }

  if (tarjetaDestino.tipo !== "tarjeta_credito") {
    throw new ErrorNegocio("El destino debe ser una tarjeta de credito");
  }

  if (!cuentaOrigen.activo || !tarjetaDestino.activo) {
    throw new ErrorNegocio("El origen o el destino esta desactivado");
  }

  return { cuentaOrigen, tarjetaDestino };
};

module.exports = { validarPagoTarjeta };
