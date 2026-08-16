// Envoltura unica de respuestas. Toda la API usa el mismo formato para
// que el frontend tenga una sola funcion que interprete respuestas, en
// vez de un if distinto por endpoint.
//
//   Exito:  { ok: true,  data: ... }
//   Error:  { ok: false, error: "mensaje legible" }
//
// Uso en un controlador:
//   const { exito, creado, error } = require("../utils/respuesta");
//   return exito(res, movimiento);
//   return creado(res, nuevo);
//   return error(res, "No encontrado", 404);

const exito = (res, data, status = 200) =>
  res.status(status).json({ ok: true, data });

const creado = (res, data) => exito(res, data, 201);

const error = (res, mensaje, status = 400) =>
  res.status(status).json({ ok: false, error: mensaje });

module.exports = { exito, creado, error };
