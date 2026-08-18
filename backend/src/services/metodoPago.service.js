const { proximoCorte, limitePagoDeCorte } = require("../utils/fechas");

// Calcula el saldo/disponible de un metodo de pago a partir de sus
// movimientos. No conoce req ni res: recibe el documento ya cargado y
// devuelve un objeto plano, para poder testearlo sin levantar Express.
// El saldo nunca se lee de un campo guardado (ver decision registrada
// en references/modelo-financiero.md).
const calcularEstadoMetodoPago = async (metodo) => {
  // Requerido aqui adentro y no arriba del archivo: el modelo
  // Movimiento es responsabilidad de la otra persona del equipo y
  // puede no existir todavia mientras se desarrolla en paralelo.
  const Movimiento = require("../models/movimiento.model");

  if (metodo.tipo === "tarjeta_credito") {
    const [resultado] = await Movimiento.aggregate([
      {
        $match: {
          $or: [
            { origen: metodo._id, tipo: "consumo" },
            { destino: metodo._id, tipo: "pago_tarjeta" },
          ],
        },
      },
      {
        $group: {
          _id: null,
          saldo: {
            $sum: {
              $cond: [
                { $eq: ["$tipo", "consumo"] },
                "$monto",
                { $multiply: ["$monto", -1] },
              ],
            },
          },
        },
      },
    ]);

    const saldo = resultado ? resultado.saldo : 0;
    const corte = proximoCorte(metodo.diaCorte);

    return {
      tipo: metodo.tipo,
      saldo,
      disponible: metodo.limiteCredito - saldo,
      proximoCorte: corte,
      fechaLimitePago: limitePagoDeCorte(
        corte,
        metodo.diaCorte,
        metodo.diaLimitePago
      ),
    };
  }

  // cuenta o efectivo: lo que salio menos lo que entro, sin filtrar por
  // tipo de movimiento (un consumo con debito y un pago de tarjeta son
  // ambos dinero que salio de la cuenta).
  const [resultado] = await Movimiento.aggregate([
    { $match: { $or: [{ origen: metodo._id }, { destino: metodo._id }] } },
    {
      $group: {
        _id: null,
        neto: {
          $sum: {
            $cond: [
              { $eq: ["$origen", metodo._id] },
              { $multiply: ["$monto", -1] },
              "$monto",
            ],
          },
        },
      },
    },
  ]);

  const saldoInicial = metodo.saldoInicial || 0;
  const saldo = saldoInicial + (resultado ? resultado.neto : 0);

  return { tipo: metodo.tipo, saldo };
};

module.exports = { calcularEstadoMetodoPago };
