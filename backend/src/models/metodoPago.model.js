const mongoose = require("mongoose");

// discriminatorKey define el campo que guarda de que tipo es cada
// documento. Mongoose lo llena solo y lo usa para saber que schema
// aplicar al leer. Aqui se llama "tipo".
const opcionesBase = {
  discriminatorKey: "tipo",
  timestamps: true,
};

// ---------- Schema base: lo que comparten los tres tipos ----------
const metodoPagoSchema = new mongoose.Schema(
  {
    // Etiqueta legible que el usuario elige. NUNCA un numero de tarjeta.
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      maxlength: [60, "El nombre no puede pasar de 60 caracteres"],
    },

    banco: { type: String, trim: true },

    moneda: {
      type: String,
      enum: ["DOP", "USD"],
      default: "DOP",
    },

    // activo en false = desactivado. No se borra porque hay movimientos
    // historicos que lo referencian.
    activo: { type: Boolean, default: true },
  },
  opcionesBase
);

const MetodoPago = mongoose.model("MetodoPago", metodoPagoSchema);

// ---------- Variante: tarjeta de credito ----------
// Estos campos solo existen (y solo son obligatorios) en los documentos
// cuyo tipo es "tarjeta_credito".
const TarjetaCredito = MetodoPago.discriminator(
  "tarjeta_credito",
  new mongoose.Schema({
    // En centavos, igual que todo monto de la app (ver utils/dinero.js).
    limiteCredito: {
      type: Number,
      required: [true, "El limite de credito es obligatorio"],
      min: [0, "El limite no puede ser negativo"],
    },

    // Dia del mes en que corta el ciclo, del 1 al 31.
    // Se guarda como numero y no como fecha porque se repite cada mes.
    // Las fechas concretas se calculan en utils/fechas.js.
    diaCorte: {
      type: Number,
      required: [true, "El dia de corte es obligatorio"],
      min: [1, "El dia de corte va del 1 al 31"],
      max: [31, "El dia de corte va del 1 al 31"],
    },

    // Dia limite de pago. Normalmente cae en el mes siguiente al corte.
    diaLimitePago: {
      type: Number,
      required: [true, "El dia limite de pago es obligatorio"],
      min: [1, "El dia limite va del 1 al 31"],
      max: [31, "El dia limite va del 1 al 31"],
    },

    // Tasa anual en porcentaje (por ejemplo 60 para 60%).
    tasaInteresAnual: { type: Number, min: 0 },
  })
);

// ---------- Variante: cuenta de ahorro o corriente (debito) ----------
const Cuenta = MetodoPago.discriminator(
  "cuenta",
  new mongoose.Schema({
    // Saldo con el que arranca el seguimiento en la app, en centavos.
    // El saldo actual sale de saldoInicial mas los movimientos: nunca
    // se guarda un saldo actual (ver decision registrada en el skill).
    saldoInicial: { type: Number, default: 0 },

    esAhorro: { type: Boolean, default: true },
  })
);

// ---------- Variante: efectivo ----------
// No agrega campos propios, pero existe como tipo para registrar gastos
// en efectivo sin inventar una cuenta falsa.
const Efectivo = MetodoPago.discriminator("efectivo", new mongoose.Schema({}));

module.exports = { MetodoPago, TarjetaCredito, Cuenta, Efectivo };
