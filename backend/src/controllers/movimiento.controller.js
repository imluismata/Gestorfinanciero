const { creado, error } = require("../utils/respuesta");
const { validarPagoTarjeta } = require("../services/pagoTarjeta.service");
const ErrorNegocio = require("../utils/errorNegocio");

// NOTA DE EQUIPO: este archivo es de Persona A (CRUD completo de
// Movimiento: obtenerMovimientos, crearMovimiento, etc.). Persona B solo
// aporta este fragmento porque el pago de tarjeta cuelga de la misma
// URL /api/movimientos (ver contrato de la API en el skill). Al
// integrar, el resto de las funciones de Movimiento se agregan en este
// mismo archivo junto a esta.

// POST /api/movimientos/pago-tarjeta
// Abono desde una cuenta (o efectivo) hacia una tarjeta de credito. No
// reutiliza el POST general de movimientos: sus campos y validaciones
// son distintos (ver references/modelo-financiero.md, seccion 8). Las
// reglas del dominio viven en services/pagoTarjeta.service.js: este
// handler solo las invoca, crea el Movimiento y responde.
const registrarPagoTarjeta = async (req, res) => {
  try {
    const { origen, destino, monto, fecha, descripcion } = req.body;

    const { cuentaOrigen, tarjetaDestino } = await validarPagoTarjeta({
      origen,
      destino,
      monto,
    });

    // Requerido aqui adentro y no arriba del archivo: el modelo
    // Movimiento es responsabilidad de la otra persona del equipo y
    // puede no existir todavia mientras se desarrolla en paralelo.
    const Movimiento = require("../models/movimiento.model");

    // Una sola insercion: no se actualiza ningun saldo porque ninguno
    // esta almacenado (los saldos se derivan, nunca se guardan).
    const pago = await Movimiento.create({
      tipo: "pago_tarjeta",
      monto,
      fecha: fecha || Date.now(),
      origen: cuentaOrigen._id,
      destinoModelo: "MetodoPago",
      destino: tarjetaDestino._id,
      descripcion,
    });

    return creado(res, pago);
  } catch (err) {
    if (err instanceof ErrorNegocio) {
      return error(res, err.message, err.status);
    }
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

module.exports = { registrarPagoTarjeta };
