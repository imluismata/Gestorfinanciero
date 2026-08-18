const { error } = require("../utils/respuesta");

// Primer nivel de validacion: presencia y tipo de los datos de entrada,
// antes de tocar MongoDB. Evita viajes innecesarios a la base y da
// mensajes claros. Las reglas de negocio por tipo (que combinacion de
// origen/destino/categoria es valida) viven en el hook del modelo.
//
// Este endpoint (POST/PUT /api/movimientos) crea consumos e ingresos.
// El pago de tarjeta y la cuota de prestamo tienen sus propios endpoints.
const TIPOS_PERMITIDOS = ["consumo", "ingreso"];

const validarMovimiento = (req, res, next) => {
  const { monto, tipo, fecha } = req.body;

  // monto: obligatorio, entero (centavos), no negativo.
  if (monto === undefined || monto === null || monto === "") {
    return error(res, "El monto es obligatorio");
  }
  if (typeof monto !== "number" || !Number.isInteger(monto)) {
    return error(res, "El monto debe ser un entero en centavos (ej. 4550)");
  }
  if (monto < 0) {
    return error(res, "El monto no puede ser negativo");
  }

  // tipo: si viene, debe ser uno de los que maneja este endpoint.
  if (tipo !== undefined && !TIPOS_PERMITIDOS.includes(tipo)) {
    return error(
      res,
      "Este endpoint solo crea consumos e ingresos. El pago de tarjeta y la cuota tienen su propia ruta."
    );
  }

  // fecha: si viene, debe ser una fecha valida.
  if (fecha !== undefined && Number.isNaN(new Date(fecha).getTime())) {
    return error(res, "La fecha no es valida");
  }

  return next();
};

module.exports = validarMovimiento;
