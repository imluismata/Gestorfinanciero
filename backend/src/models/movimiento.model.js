const mongoose = require("mongoose");

// ---------- Fuente unica de verdad de los tipos ----------
// Cada entrada declara que exige el tipo y como afecta al patrimonio.
// La validacion y los reportes leen de aqui, asi que agregar un tipo
// nuevo es agregar una entrada, no buscar condicionales por el codigo.
//
//   origen / destino / categoria: "requerido" | "prohibido"
//   efecto: "gasto" | "ingreso" | "neutro"
//
// NOTA (decision del equipo): `transferencia` (cuenta -> cuenta) queda
// fuera de la v1. Se agrega despues con una sola entrada aqui, sin tocar
// validacion ni reportes (eso es el principio Open/Closed en accion).
const TIPOS_MOVIMIENTO = {
  consumo: {
    origen: "requerido",
    destino: "prohibido",
    categoria: "requerido",
    efecto: "gasto",
  },
  ingreso: {
    origen: "prohibido",
    destino: "requerido",
    categoria: "requerido",
    efecto: "ingreso",
  },
  pago_tarjeta: {
    origen: "requerido",
    destino: "requerido",
    categoria: "prohibido",
    efecto: "neutro",
  },
  cuota_prestamo: {
    origen: "requerido",
    destino: "requerido",
    categoria: "requerido",
    efecto: "gasto",
  },
};

// Listas derivadas. Se calculan una vez al cargar el modulo para no
// recorrer el objeto en cada consulta, y para que ningun reporte tenga
// los tipos escritos a mano.
const TIPOS = Object.keys(TIPOS_MOVIMIENTO);

const TIPOS_GASTO = TIPOS.filter((t) => TIPOS_MOVIMIENTO[t].efecto === "gasto");

const TIPOS_INGRESO = TIPOS.filter(
  (t) => TIPOS_MOVIMIENTO[t].efecto === "ingreso"
);

const TIPOS_NEUTRO = TIPOS.filter((t) => TIPOS_MOVIMIENTO[t].efecto === "neutro");

const movimientoSchema = new mongoose.Schema(
  {
    // El monto se guarda como ENTERO en centavos ($45.50 -> 4550) y
    // siempre positivo. El signo no vive en el numero sino en el tipo.
    // Guardar centavos evita los errores de punto flotante; el frontend
    // convierte pesos<->centavos en sus bordes (ver utils/dinero.js).
    monto: {
      type: Number,
      required: [true, "El monto es obligatorio"],
      min: [0, "El monto no puede ser negativo"],
      validate: {
        validator: Number.isInteger,
        message: "El monto debe ser un entero en centavos",
      },
    },

    tipo: {
      type: String,
      enum: { values: TIPOS, message: "Tipo de movimiento no valido" },
      default: "consumo",
    },

    // Fecha en que ocurrio el movimiento. Distinta de createdAt, que es
    // cuando se registro en la app.
    fecha: {
      type: Date,
      required: [true, "La fecha es obligatoria"],
      default: Date.now,
    },

    descripcion: {
      type: String,
      trim: true,
      maxlength: [200, "La descripcion no puede pasar de 200 caracteres"],
    },

    // ---------- Clasificacion ----------
    // Obligatoria o prohibida segun el tipo; lo valida el hook de abajo.
    // Este campo NO lo envia el cliente: el controlador lo deriva del
    // padre de la subcategoria. Ver references/categorias.md.
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria",
    },

    subcategoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria",
    },

    // ---------- Direccion del dinero ----------
    // De donde sale. Siempre un metodo de pago.
    origen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MetodoPago",
    },

    // A donde va. Puede ser un metodo de pago (pago de tarjeta, ingreso)
    // o un prestamo (cuota). refPath le dice a Mongoose que lea el nombre
    // del modelo desde otro campo del mismo documento, para que un solo
    // campo apunte a dos colecciones distintas segun el caso.
    destinoModelo: {
      type: String,
      enum: ["MetodoPago", "Prestamo"],
    },
    destino: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "destinoModelo",
    },
  },
  { timestamps: true }
);

// ---------- Validacion por tipo ----------
// Va en un hook y no en validadores de campo porque las reglas dependen
// del tipo, y tenerlas juntas permite leerlas de corrido contra la tabla
// de TIPOS_MOVIMIENTO.
//
// pre("validate") y no pre("save"): asi los errores salen antes de tocar
// la base. Se marcan con `esValidacion` para que el controlador los mapee
// a 400 (dato invalido del cliente) y no a 500 (fallo del servidor).
const errorTipo = (mensaje) =>
  Object.assign(new Error(mensaje), { esValidacion: true });

movimientoSchema.pre("validate", function (next) {
  const reglas = TIPOS_MOVIMIENTO[this.tipo];

  if (!reglas) {
    return next(errorTipo("Tipo de movimiento no valido"));
  }

  // Se recorren los tres campos con las mismas dos comprobaciones, en
  // vez de escribir seis condicionales a mano.
  for (const campo of ["origen", "destino", "categoria"]) {
    const exigencia = reglas[campo];
    const tieneValor = Boolean(this[campo]);

    if (exigencia === "requerido" && !tieneValor) {
      return next(
        errorTipo(`El campo ${campo} es obligatorio para el tipo ${this.tipo}`)
      );
    }

    if (exigencia === "prohibido" && tieneValor) {
      return next(errorTipo(`El campo ${campo} no aplica al tipo ${this.tipo}`));
    }
  }

  // Mover dinero de un sitio a si mismo no representa nada.
  if (this.origen && this.destino && this.origen.equals(this.destino)) {
    return next(errorTipo("El origen y el destino no pueden ser el mismo"));
  }

  return next();
});

// Casi todas las consultas filtran por tipo y ordenan por fecha.
movimientoSchema.index({ tipo: 1, fecha: -1 });

// Para calcular saldos: hay que buscar por ambos extremos.
movimientoSchema.index({ origen: 1 });
movimientoSchema.index({ destino: 1 });

// Para los reportes agrupados.
movimientoSchema.index({ categoria: 1 });

module.exports = mongoose.model("Movimiento", movimientoSchema);
module.exports.TIPOS_MOVIMIENTO = TIPOS_MOVIMIENTO;
module.exports.TIPOS = TIPOS;
module.exports.TIPOS_GASTO = TIPOS_GASTO;
module.exports.TIPOS_INGRESO = TIPOS_INGRESO;
module.exports.TIPOS_NEUTRO = TIPOS_NEUTRO;
