// Manejador de errores centralizado. Se registra al final de app.js y
// captura lo que se escape de los try/catch de los controladores.
//
// Convierte los errores tipicos de Mongoose a codigos HTTP correctos y
// nunca devuelve el objeto de error crudo al cliente.
// eslint-disable-next-line no-unused-vars
const manejadorErrores = (err, req, res, next) => {
  // Se registra para depurar; al cliente se le da un mensaje limpio.
  console.error(err);

  // Datos que no cumplen el schema: culpa del cliente.
  if (err.name === "ValidationError") {
    return res.status(400).json({ ok: false, error: err.message });
  }

  // Id con formato invalido (por ejemplo "abc" donde se espera ObjectId).
  if (err.name === "CastError") {
    return res.status(400).json({ ok: false, error: "Id no valido" });
  }

  // Violacion del indice unico (por ejemplo dos "uber" bajo transporte).
  if (err.code === 11000) {
    return res.status(400).json({ ok: false, error: "El registro ya existe" });
  }

  // Cualquier otra cosa es un fallo inesperado del servidor.
  return res.status(500).json({ ok: false, error: "Error del servidor" });
};

module.exports = manejadorErrores;
