const Movimiento = require("../models/movimiento.model");
const Categoria = require("../models/categoria.model");
const { exito, creado, error } = require("../utils/respuesta");

const { TIPOS_GASTO, TIPOS_INGRESO } = Movimiento;

// Error de validacion marcado, para que el catch lo mapee a 400 y no a 500.
const errorValidacion = (mensaje) =>
  Object.assign(new Error(mensaje), { esValidacion: true });

// Mapea un error atrapado al codigo HTTP correcto. Un solo lugar para no
// repetir la escalera de if en cada handler.
const responderError = (res, err) => {
  if (err.esValidacion) return error(res, err.message, 400);
  if (err.name === "ValidationError") return error(res, err.message, 400);
  if (err.name === "CastError") return error(res, "Id no valido", 400);
  console.error(err);
  return error(res, "Error del servidor", 500);
};

// Deriva la categoria del movimiento a partir de la subcategoria enviada
// por el cliente, y valida que el arbol corresponda al tipo. Nunca confia
// en la `categoria` que manda el cliente: la deriva del padre de la
// subcategoria (ver references/categorias.md).
const resolverCategoria = async ({ categoria, subcategoria, tipo }) => {
  let categoriaId = categoria || null;
  const subcategoriaId = subcategoria || null;

  if (subcategoriaId) {
    const sub = await Categoria.findById(subcategoriaId);
    if (!sub || !sub.activo) {
      throw errorValidacion("La subcategoria no existe o esta desactivada");
    }
    // Sin padre es una categoria principal mandada en el campo equivocado.
    if (!sub.padre) {
      throw errorValidacion(
        "El valor enviado como subcategoria es una categoria principal"
      );
    }
    // La categoria SIEMPRE sale del padre de la subcategoria.
    categoriaId = sub.padre;
  }

  if (!categoriaId) {
    throw errorValidacion("La categoria es obligatoria");
  }

  // El arbol de la categoria debe corresponder al tipo: un consumo no se
  // clasifica con "sueldo" ni un ingreso con "supermercado".
  const arbolEsperado = tipo === "ingreso" ? "ingreso" : "gasto";
  const cat = await Categoria.findById(categoriaId);
  if (!cat || !cat.activo) {
    throw errorValidacion("La categoria no existe o esta desactivada");
  }
  if (cat.aplicaA !== arbolEsperado) {
    throw errorValidacion("La categoria no corresponde a este tipo de movimiento");
  }

  return { categoria: categoriaId, subcategoria: subcategoriaId };
};

// GET /api/movimientos
// Lista movimientos. Por defecto solo los de efecto gasto e ingreso; los
// neutros (pagos de tarjeta) aparecen con ?incluirNeutros=true.
// Filtros: ?tipo= ?categoria= ?desde= ?hasta=  Paginacion: ?pagina= ?limite=
const obtenerMovimientos = async (req, res) => {
  try {
    const filtro = {};

    if (req.query.incluirNeutros !== "true") {
      filtro.tipo = { $in: [...TIPOS_GASTO, ...TIPOS_INGRESO] };
    }
    if (req.query.tipo) {
      filtro.tipo = req.query.tipo;
    }
    if (req.query.categoria) {
      filtro.categoria = req.query.categoria;
    }
    if (req.query.desde || req.query.hasta) {
      filtro.fecha = {};
      if (req.query.desde) filtro.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtro.fecha.$lte = new Date(req.query.hasta);
    }

    // Paginacion: sin ella, la lista crece sin limite y se vuelve lenta
    // e ilegible a los meses de uso diario.
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite, 10) || 20));
    const salto = (pagina - 1) * limite;

    const [movimientos, total] = await Promise.all([
      Movimiento.find(filtro)
        .sort({ fecha: -1 })
        .skip(salto)
        .limit(limite)
        .populate("categoria", "nombre color")
        .populate("subcategoria", "nombre")
        .populate("origen", "nombre tipo")
        .populate("destino", "nombre tipo"),
      Movimiento.countDocuments(filtro),
    ]);

    return exito(res, {
      movimientos,
      paginacion: { pagina, limite, total, paginas: Math.ceil(total / limite) },
    });
  } catch (err) {
    return responderError(res, err);
  }
};

// GET /api/movimientos/resumen?agrupar=categoria|mes
// El reporte central. Devuelve totales; el balance se calcula en el
// servidor para que todos los consumidores vean el mismo numero.
const obtenerResumen = async (req, res) => {
  try {
    const { agrupar } = req.query;

    // Adivinar la intencion del cliente esconde errores del frontend.
    if (agrupar !== "categoria" && agrupar !== "mes") {
      return error(res, "El parametro 'agrupar' debe ser 'categoria' o 'mes'");
    }

    // Rango de fechas opcional, comun a ambos reportes.
    const matchFecha = {};
    if (req.query.desde) matchFecha.$gte = new Date(req.query.desde);
    if (req.query.hasta) matchFecha.$lte = new Date(req.query.hasta);
    const filtroFecha = Object.keys(matchFecha).length ? { fecha: matchFecha } : {};

    if (agrupar === "categoria") {
      const porCategoria = await Movimiento.aggregate([
        // Sin este $match los totales incluyen pagos de tarjeta y
        // transferencias, e inflan el gasto real. Es el filtro mas
        // importante de la app.
        { $match: { tipo: { $in: TIPOS_GASTO }, ...filtroFecha } },
        {
          $group: {
            _id: "$categoria",
            total: { $sum: "$monto" },
            cantidad: { $sum: 1 },
          },
        },
        // El $lookup va DESPUES del $group: aqui solo quedan tantos
        // documentos como categorias, asi que la union es barata.
        {
          $lookup: {
            from: "categorias",
            localField: "_id",
            foreignField: "_id",
            as: "cat",
          },
        },
        {
          $project: {
            total: 1,
            cantidad: 1,
            nombre: { $arrayElemAt: ["$cat.nombre", 0] },
            color: { $arrayElemAt: ["$cat.color", 0] },
          },
        },
        { $sort: { total: -1 } },
      ]);

      return exito(res, porCategoria);
    }

    // agrupar === "mes": ingresos, gastos y balance por mes.
    const porMes = await Movimiento.aggregate([
      { $match: { tipo: { $in: [...TIPOS_GASTO, ...TIPOS_INGRESO] }, ...filtroFecha } },
      {
        $group: {
          // Formato "2026-03". Incluir el año es obligatorio: agrupar solo
          // por mes mezclaria marzo de años distintos.
          _id: { $dateToString: { format: "%Y-%m", date: "$fecha" } },
          ingresos: {
            $sum: { $cond: [{ $in: ["$tipo", TIPOS_INGRESO] }, "$monto", 0] },
          },
          gastos: {
            $sum: { $cond: [{ $in: ["$tipo", TIPOS_GASTO] }, "$monto", 0] },
          },
        },
      },
      // El balance se calcula aqui, no en el frontend, para que todos los
      // consumidores de la API vean el mismo numero.
      { $addFields: { balance: { $subtract: ["$ingresos", "$gastos"] } } },
      { $sort: { _id: 1 } },
    ]);

    return exito(res, porMes);
  } catch (err) {
    return responderError(res, err);
  }
};

// GET /api/movimientos/:id
const obtenerMovimientoPorId = async (req, res) => {
  try {
    const movimiento = await Movimiento.findById(req.params.id)
      .populate("categoria")
      .populate("subcategoria")
      .populate("origen")
      .populate("destino");

    if (!movimiento) {
      return error(res, "Movimiento no encontrado", 404);
    }
    return exito(res, movimiento);
  } catch (err) {
    return responderError(res, err);
  }
};

// POST /api/movimientos
// Crea un consumo o un ingreso. El pago de tarjeta y la cuota de prestamo
// tienen sus propios endpoints (campos y validaciones distintos).
const crearMovimiento = async (req, res) => {
  try {
    const { monto, tipo = "consumo", fecha, descripcion, origen, destino } =
      req.body;

    if (tipo !== "consumo" && tipo !== "ingreso") {
      return error(
        res,
        "Este endpoint solo crea consumos e ingresos"
      );
    }

    // Deriva y valida la categoria contra el arbol correcto.
    const { categoria, subcategoria } = await resolverCategoria({
      categoria: req.body.categoria,
      subcategoria: req.body.subcategoria,
      tipo,
    });

    // Se arma segun el tipo: un consumo sale de un origen; un ingreso
    // entra a un destino. El hook del modelo valida la combinacion final.
    const datos = {
      monto,
      tipo,
      fecha: fecha || Date.now(),
      descripcion,
      categoria,
      subcategoria,
    };

    if (tipo === "consumo") {
      datos.origen = origen;
    } else {
      datos.destino = destino;
      datos.destinoModelo = "MetodoPago";
    }

    const movimiento = await Movimiento.create(datos);
    return creado(res, movimiento);
  } catch (err) {
    return responderError(res, err);
  }
};

// PUT /api/movimientos/:id
// Reemplaza los campos editables de un consumo o ingreso.
const actualizarMovimiento = async (req, res) => {
  try {
    const movimiento = await Movimiento.findById(req.params.id);
    if (!movimiento) {
      return error(res, "Movimiento no encontrado", 404);
    }

    const tipo = req.body.tipo || movimiento.tipo;
    if (tipo !== "consumo" && tipo !== "ingreso") {
      return error(res, "Este endpoint solo edita consumos e ingresos");
    }

    // Si tocan la clasificacion, re-derivar y re-validar la categoria.
    if (
      req.body.categoria !== undefined ||
      req.body.subcategoria !== undefined
    ) {
      const { categoria, subcategoria } = await resolverCategoria({
        categoria: req.body.categoria,
        subcategoria: req.body.subcategoria,
        tipo,
      });
      movimiento.categoria = categoria;
      movimiento.subcategoria = subcategoria;
    }

    if (req.body.monto !== undefined) movimiento.monto = req.body.monto;
    if (req.body.fecha !== undefined) movimiento.fecha = req.body.fecha;
    if (req.body.descripcion !== undefined)
      movimiento.descripcion = req.body.descripcion;
    if (req.body.origen !== undefined && tipo === "consumo")
      movimiento.origen = req.body.origen;
    if (req.body.destino !== undefined && tipo === "ingreso")
      movimiento.destino = req.body.destino;

    await movimiento.save();
    return exito(res, movimiento);
  } catch (err) {
    return responderError(res, err);
  }
};

// DELETE /api/movimientos/:id
// Un movimiento SI se borra de verdad (a diferencia de los catalogos):
// es un hecho puntual, no un catalogo referenciado por otros.
const eliminarMovimiento = async (req, res) => {
  try {
    const movimiento = await Movimiento.findByIdAndDelete(req.params.id);
    if (!movimiento) {
      return error(res, "Movimiento no encontrado", 404);
    }
    return exito(res, { eliminado: movimiento._id });
  } catch (err) {
    return responderError(res, err);
  }
};

module.exports = {
  obtenerMovimientos,
  obtenerResumen,
  obtenerMovimientoPorId,
  crearMovimiento,
  actualizarMovimiento,
  eliminarMovimiento,
};
