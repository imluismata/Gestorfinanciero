const mongoose = require("mongoose");

// Cada cuota es un subdocumento del prestamo. No es coleccion aparte
// porque una cuota no existe sin su prestamo ni se consulta sola.
const cuotaSchema = new mongoose.Schema(
  {
    numero: { type: Number, required: true }, // 1, 2, 3...
    fechaVencimiento: { type: Date, required: true },
    // En centavos, igual que todo monto de la app (ver utils/dinero.js).
    monto: {
      type: Number,
      required: true,
      min: [0, "El monto no puede ser negativo"],
    },
    pagada: { type: Boolean, default: false },
    fechaPago: { type: Date },

    // Referencia al Movimiento que se creo al pagar esta cuota. Permite
    // ir de la cuota al movimiento y viceversa.
    movimiento: { type: mongoose.Schema.Types.ObjectId, ref: "Movimiento" },
  },
  { _id: false } // no hace falta id propio: el numero ya identifica
);

const prestamoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del prestamo es obligatorio"],
      trim: true,
    },

    acreedor: { type: String, trim: true }, // banco, financiera o persona

    // En centavos.
    montoOriginal: {
      type: Number,
      required: [true, "El monto original es obligatorio"],
      min: [0, "El monto no puede ser negativo"],
    },

    tasaInteresAnual: {
      type: Number,
      min: [0, "La tasa no puede ser negativa"],
    },

    fechaInicio: {
      type: Date,
      required: [true, "La fecha de inicio es obligatoria"],
    },

    cantidadCuotas: {
      type: Number,
      required: [true, "La cantidad de cuotas es obligatoria"],
      min: [1, "Debe tener al menos una cuota"],
    },

    // En centavos.
    montoCuota: {
      type: Number,
      required: [true, "El monto de la cuota es obligatorio"],
      min: [0, "El monto no puede ser negativo"],
    },

    // Dia del mes en que vence cada cuota, del 1 al 31.
    diaPago: {
      type: Number,
      required: [true, "El dia de pago es obligatorio"],
      min: [1, "El dia de pago va del 1 al 31"],
      max: [31, "El dia de pago va del 1 al 31"],
    },

    // Cuenta desde la que se paga, si es descuento automatico. Opcional:
    // no todo prestamo se paga siempre desde la misma cuenta.
    cuentaOrigen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MetodoPago",
    },

    moneda: { type: String, enum: ["DOP", "USD"], default: "DOP" },

    cuotas: [cuotaSchema],
  },
  { timestamps: true }
);

// Campos calculados: se exponen como virtuals para no guardarlos. Un
// virtual se computa al leer y nunca se desincroniza (ver decision
// registrada en references/modelo-financiero.md: los saldos se
// calculan, no se guardan).
prestamoSchema.virtual("cuotasPagadas").get(function () {
  return this.cuotas.filter((c) => c.pagada).length;
});

prestamoSchema.virtual("saldoPendiente").get(function () {
  return this.cuotas
    .filter((c) => !c.pagada)
    .reduce((suma, c) => suma + c.monto, 0);
});

prestamoSchema.virtual("proximaCuota").get(function () {
  // Las cuotas se generan en orden, asi que la primera no pagada es la
  // proxima que vence.
  return this.cuotas.find((c) => !c.pagada) || null;
});

// Sin esto los virtuals no aparecen al convertir a JSON, y el frontend
// no los recibiria.
prestamoSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Prestamo", prestamoSchema);
