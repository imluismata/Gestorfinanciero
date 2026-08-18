module.exports = {
  // La primera corrida descarga el binario de mongod (mongodb-memory-server),
  // asi que se da margen. Las siguientes reutilizan el binario cacheado.
  testTimeout: 60000,
};
