// Error para violaciones de una regla de negocio (el cliente mando algo
// que no se puede hacer), no una falla inesperada del servidor. Los
// services lo lanzan con el status HTTP que corresponde; el controlador
// solo necesita un catch generico que lo traduzca, en vez de repetir el
// mismo mapeo mensaje->status en cada funcion.
class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.name = "ErrorNegocio";
    this.status = status;
  }
}

module.exports = ErrorNegocio;
