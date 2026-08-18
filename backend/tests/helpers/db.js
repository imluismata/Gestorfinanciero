const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Base de datos en memoria para los tests de integracion. Levanta un
// MongoDB efimero, real pero sin instalar nada, para probar los
// controladores y modelos de punta a punta. Se destruye al terminar.

let mongod;

// Levanta el servidor en memoria y conecta mongoose a el.
const conectar = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

// Vacia todas las colecciones entre pruebas, para que una no ensucie a
// la siguiente. Mas rapido que reconectar cada vez.
const limpiar = async () => {
  const colecciones = mongoose.connection.collections;
  for (const nombre of Object.keys(colecciones)) {
    await colecciones[nombre].deleteMany({});
  }
};

// Cierra la conexion y apaga el servidor en memoria.
const desconectar = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

module.exports = { conectar, limpiar, desconectar };
