// Lectura unica de las variables de entorno. El resto del codigo importa
// de aqui en vez de tocar process.env directamente: asi se sabe de un
// vistazo que configuracion existe.
require("dotenv").config();

const env = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: 
    process.env.MONGODB_URI || "mongodb://localhost:27017/gestor_gastos",
  NODE_ENV: process.env.NODE_ENV || "development",
};

// Falla temprano y con un mensaje claro si falta lo imprescindible,
// en vez de reventar despues con un error de conexion confuso.
if (!env.MONGODB_URI) {
  console.error("Falta MONGODB_URI en el .env. Copia .env.example a .env.");
  process.exit(1);
}

module.exports = env;
