const mongoose = require("mongoose");

// Taxonomia de dos niveles auto-referenciada. Con `padre` en null es una
// categoria principal (transporte); con padre es una subcategoria (uber).
// El campo `aplicaA` separa el arbol de gasto del de ingreso.
// Ver references/categorias.md para las decisiones registradas.
const categoriaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      maxlength: [40, "El nombre no puede pasar de 40 caracteres"],
    },

    // null      = categoria principal (transporte, alimentacion...)
    // ObjectId  = subcategoria, y este campo apunta a su padre
    //
    // default null explicito: sin el, el campo quedaria undefined y el
    // indice unico de mas abajo no agruparia bien las categorias raiz.
    padre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria",
      default: null,
    },

    // Color hexadecimal para las graficas. Solo tiene sentido en
    // categorias principales; las subcategorias heredan el del padre.
    color: {
      type: String,
      trim: true,
      match: [/^#[0-9A-Fa-f]{6}$/, "El color debe ser hexadecimal, ej. #2E86DE"],
    },

    // Separa el arbol de gasto del de ingreso. Sin este campo, "sueldo"
    // apareceria en el selector al registrar una compra.
    //
    // En una subcategoria siempre coincide con el del padre: lo asigna
    // el hook de abajo, no el cliente.
    aplicaA: {
      type: String,
      enum: ["gasto", "ingreso"],
      default: "gasto",
    },

    // Las categorias del sistema (precargadas por el seed) se marcan
    // para poder distinguirlas de las que creo el usuario. No impide
    // desactivarlas, solo permite ofrecer un "restaurar por defecto".
    esSistema: {
      type: Boolean,
      default: false,
    },

    // Se desactiva, no se borra: hay movimientos historicos que la
    // referencian.
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indice unico compuesto: no puede haber dos "Uber" bajo transporte,
// pero si puede haber un "Otros" bajo cada categoria principal.
//
// La collation con strength 1 hace que la comparacion ignore mayusculas
// y acentos. Sin ella, "Uber", "uber" y "Úber" pasarian como tres
// subcategorias distintas y el usuario terminaria con duplicados que se
// ven iguales en pantalla.
categoriaSchema.index(
  { padre: 1, nombre: 1 },
  { unique: true, collation: { locale: "es", strength: 1 } }
);

// ---------- Validacion de profundidad ----------
// Se hace en un hook pre-save porque requiere consultar la base: hay que
// ir a buscar el documento padre para ver si el ya tiene uno. Un
// validador de schema comun no puede hacer consultas.
categoriaSchema.pre("save", async function (next) {
  // Si no tiene padre es una categoria raiz: nada que validar.
  if (!this.padre) return next();

  const padre = await this.constructor.findById(this.padre);

  if (!padre) {
    return next(new Error("La categoria padre no existe"));
  }

  // Si el padre ya tiene padre, este documento seria un tercer nivel.
  if (padre.padre) {
    return next(new Error("Solo se permiten dos niveles de categorias"));
  }

  // La subcategoria hereda el arbol del padre. Se asigna en vez de
  // validarse: si el cliente mando otra cosa, el valor correcto es
  // siempre el del padre y no hay razon para rechazar la operacion.
  this.aplicaA = padre.aplicaA;

  return next();
});

module.exports = mongoose.model("Categoria", categoriaSchema);
