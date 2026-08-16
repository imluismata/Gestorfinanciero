const app = require("./app");
const conectarDB = require("./config/db");
const { PORT } = require("./config/env");

// Arranque de la aplicacion: primero la base de datos, luego el puerto.
const iniciar = async () => {
  await conectarDB();
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
};

iniciar();
