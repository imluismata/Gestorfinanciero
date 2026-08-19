const Prestamo = require("../models/prestamo.model");
const { exito, creado, error } = require("../utils/respuesta");
const { generarCuotas, fechaLocalDesdeInput } = require("../utils/fechas");
const {
  validarCuentaOrigen,
  prepararPagoCuota,
} = require("../services/prestamo.service");
const ErrorNegocio = require("../utils/errorNegocio");

// GET /api/prestamos
const listarPrestamos = async (req, res) => {
  try {
    const prestamos = await Prestamo.find().sort({ fechaInicio: -1 });
    return exito(res, prestamos);
  } catch (err) {
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// GET /api/prestamos/:id
const obtenerPrestamoPorId = async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id).populate(
      "cuentaOrigen"
    );

    if (!prestamo) {
      return error(res, "Prestamo no encontrado", 404);
    }

    return exito(res, prestamo);
  } catch (err) {
    if (err.name === "CastError") {
      return error(res, "El id del prestamo no tiene un formato valido", 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// POST /api/prestamos
// Genera el calendario de cuotas al crear: calcularlas al vuelo
// impediria marcar una cuota como pagada, que es justo lo que se
// necesita para dar seguimiento.
const crearPrestamo = async (req, res) => {
  try {
    const {
      nombre,
      acreedor,
      montoOriginal,
      tasaInteresAnual,
      fechaInicio,
      cantidadCuotas,
      montoCuota,
      diaPago,
      cuentaOrigen,
      moneda,
    } = req.body;

    const fecha = fechaLocalDesdeInput(fechaInicio);
    if (fechaInicio === undefined || Number.isNaN(fecha.getTime())) {
      return error(
        res,
        "La fecha de inicio es obligatoria y debe ser una fecha valida (formato AAAA-MM-DD)",
        400
      );
    }

    // cuentaOrigen es opcional (no todo prestamo se descuenta siempre de
    // la misma cuenta). Si se manda, la regla de que sea cuenta/efectivo
    // activo vive en services/prestamo.service.js.
    if (cuentaOrigen) {
      await validarCuentaOrigen(cuentaOrigen);
    }

    const prestamo = new Prestamo({
      nombre,
      acreedor,
      montoOriginal,
      tasaInteresAnual,
      fechaInicio: fecha,
      cantidadCuotas,
      montoCuota,
      diaPago,
      cuentaOrigen,
      moneda,
    });

    // cantidadCuotas y montoCuota y diaPago deben existir para generar
    // el calendario; si faltan, la validacion del schema los va a
    // rechazar antes de llegar aqui salvo que Mongoose todavia no haya
    // corrido: se valida a mano para dar un mensaje claro sin insertar.
    if (!cantidadCuotas || !montoCuota || !diaPago) {
      return error(
        res,
        "cantidadCuotas, montoCuota y diaPago son obligatorios para generar el calendario de cuotas",
        400
      );
    }

    prestamo.cuotas = generarCuotas(fecha, cantidadCuotas, montoCuota, diaPago);

    await prestamo.save();
    return creado(res, prestamo);
  } catch (err) {
    if (err instanceof ErrorNegocio) {
      return error(res, err.message, err.status);
    }
    if (err.name === "ValidationError") {
      return error(res, err.message, 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// DELETE /api/prestamos/:id
const eliminarPrestamo = async (req, res) => {
  try {
    const prestamo = await Prestamo.findByIdAndDelete(req.params.id);

    if (!prestamo) {
      return error(res, "Prestamo no encontrado", 404);
    }

    return exito(res, prestamo);
  } catch (err) {
    if (err.name === "CastError") {
      return error(res, "El id del prestamo no tiene un formato valido", 400);
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

// POST /api/prestamos/:id/cuotas/:numero/pagar
// Marcar una cuota pagada crea el Movimiento tipo cuota_prestamo que le
// corresponde (ver tabla de tipos en el skill): el gasto se registra en
// ese momento, no antes.
const pagarCuota = async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id);

    if (!prestamo) {
      return error(res, "Prestamo no encontrado", 404);
    }

    const numero = Number(req.params.numero);
    const { categoria, subcategoria, descripcion } = req.body;
    const fecha = req.body.fecha
      ? fechaLocalDesdeInput(req.body.fecha)
      : Date.now();

    // Toda la validacion (cuota existe, no esta pagada, origen y
    // categoria vienen, el origen es un metodo de pago valido) vive en
    // services/prestamo.service.js.
    const { cuota, metodoOrigen } = await prepararPagoCuota(
      prestamo,
      numero,
      req.body
    );

    // Requerido aqui adentro y no arriba del archivo: el modelo
    // Movimiento es responsabilidad de la otra persona del equipo y
    // puede no existir todavia mientras se desarrolla en paralelo.
    const Movimiento = require("../models/movimiento.model");

    const pago = await Movimiento.create({
      tipo: "cuota_prestamo",
      monto: cuota.monto,
      fecha,
      categoria,
      subcategoria,
      origen: metodoOrigen._id,
      destinoModelo: "Prestamo",
      destino: prestamo._id,
      descripcion: descripcion || `Cuota ${numero} de ${prestamo.nombre}`,
    });

    cuota.pagada = true;
    cuota.fechaPago = fecha;
    cuota.movimiento = pago._id;

    await prestamo.save();
    return exito(res, prestamo);
  } catch (err) {
    if (err instanceof ErrorNegocio) {
      return error(res, err.message, err.status);
    }
    if (err.name === "ValidationError") {
      return error(res, err.message, 400);
    }
    if (err.name === "CastError") {
      return error(
        res,
        "Alguno de los id enviados no tiene un formato valido",
        400
      );
    }
    console.error(err);
    return error(res, "Error del servidor", 500);
  }
};

module.exports = {
  listarPrestamos,
  obtenerPrestamoPorId,
  crearPrestamo,
  eliminarPrestamo,
  pagarCuota,
};
