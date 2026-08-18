// Precarga un arbol razonable de categorias para que la app sea usable
// desde el primer dia. Todas con esSistema: true. El usuario puede
// desactivar las que no le sirvan y agregar las suyas.
//
// Idempotente: correrlo dos veces no duplica nada. El indice unico sobre
// { padre, nombre } lo garantiza a nivel de base; aqui ademas se captura
// el error de duplicado (11000) y se continua en vez de abortar.
//
// Uso:  npm run seed
//
// Los datos son genericos. Nunca incluir montos, saldos ni nombres reales.

const mongoose = require("mongoose");
const Categoria = require("../models/categoria.model");
const conectarDB = require("../config/db");

// Arbol de gasto: principal -> [subcategorias]
const ARBOL_GASTO = {
  alimentacion: ["supermercado", "restaurante", "delivery", "colmado"],
  transporte: ["uber", "combustible", "transporte publico", "mantenimiento"],
  vivienda: ["alquiler", "luz", "agua", "internet", "gas"],
  salud: ["consultas", "medicamentos", "seguro"],
  educacion: ["matricula", "materiales", "cursos"],
  entretenimiento: ["streaming", "salidas", "videojuegos"],
  deuda: ["cuota de prestamo", "pago de tarjeta"],
  personal: ["ropa", "cuidado personal"],
  otros: [],
};

// Arbol de ingreso
const ARBOL_INGRESO = {
  sueldo: ["nomina", "quincena", "regalia", "bonificacion"],
  freelance: ["proyectos", "consultoria"],
  "otros ingresos": ["devolucion", "regalo", "venta", "intereses"],
};

// Crea un documento ignorando el error de duplicado, para que el seed sea
// idempotente. Devuelve el documento existente o el recien creado.
const crearSiFalta = async (datos) => {
  try {
    return await Categoria.create(datos);
  } catch (err) {
    if (err.code === 11000) {
      // Ya existe: la buscamos para poder colgarle subcategorias.
      return Categoria.findOne({ nombre: datos.nombre, padre: datos.padre });
    }
    throw err;
  }
};

const sembrarArbol = async (arbol, aplicaA) => {
  for (const [nombrePrincipal, subs] of Object.entries(arbol)) {
    const principal = await crearSiFalta({
      nombre: nombrePrincipal,
      padre: null,
      aplicaA,
      esSistema: true,
    });

    for (const nombreSub of subs) {
      await crearSiFalta({
        nombre: nombreSub,
        padre: principal._id,
        aplicaA,
        esSistema: true,
      });
    }
  }
};

const sembrar = async () => {
  await conectarDB();

  console.log("Sembrando categorias de gasto...");
  await sembrarArbol(ARBOL_GASTO, "gasto");

  console.log("Sembrando categorias de ingreso...");
  await sembrarArbol(ARBOL_INGRESO, "ingreso");

  const total = await Categoria.countDocuments();
  console.log(`Listo. Categorias en la base: ${total}`);

  await mongoose.connection.close();
};

sembrar().catch((err) => {
  console.error("Error al sembrar:", err);
  process.exit(1);
});
