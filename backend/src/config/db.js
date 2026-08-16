const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

// Conexion unica a MongoDB. Se llama una vez desde server.js antes de
// levantar el puerto: si la base no responde, no tiene sentido arrancar.
const conectarDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB conectado");
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error.message);
    // Sin base de datos la API no sirve para nada: se corta el arranque.
    process.exit(1);
  }
};

module.exports = conectarDB;
