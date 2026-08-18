const { Types } = require("mongoose");
const Movimiento = require("../src/models/movimiento.model");
const ErrorNegocio = require("../src/utils/errorNegocio");

// Estas pruebas usan doc.validate(), que corre los validadores del schema
// y el hook pre("validate") SIN conectarse a MongoDB. Verifican el
// contrato de la tabla TIPOS_MOVIMIENTO, que es la fuente de verdad del
// dominio y el bug mas caro si se rompe.

const id = () => new Types.ObjectId();

describe("Movimiento: listas derivadas de tipos", () => {
  test("TIPOS_GASTO y TIPOS_INGRESO salen de la tabla", () => {
    expect(Movimiento.TIPOS_GASTO).toEqual(
      expect.arrayContaining(["consumo", "cuota_prestamo"])
    );
    expect(Movimiento.TIPOS_INGRESO).toEqual(["ingreso"]);
  });

  test("transferencia esta fuera de la v1", () => {
    expect(Movimiento.TIPOS).not.toContain("transferencia");
  });
});

describe("Movimiento: validacion por tipo (hook)", () => {
  test("un consumo valido (origen + categoria) pasa", async () => {
    const m = new Movimiento({
      tipo: "consumo",
      monto: 4550,
      fecha: new Date(),
      origen: id(),
      categoria: id(),
    });
    await expect(m.validate()).resolves.toBeUndefined();
  });

  test("un consumo sin origen es rechazado con 400", async () => {
    const m = new Movimiento({
      tipo: "consumo",
      monto: 4550,
      fecha: new Date(),
      categoria: id(),
    });
    await expect(m.validate()).rejects.toThrow(/origen/);
    // El error es de negocio (400), no un fallo del servidor (500).
    const err = await m.validate().catch((e) => e);
    expect(err).toBeInstanceOf(ErrorNegocio);
    expect(err.status).toBe(400);
  });

  test("un ingreso valido (destino + categoria) pasa", async () => {
    const m = new Movimiento({
      tipo: "ingreso",
      monto: 45000,
      fecha: new Date(),
      destino: id(),
      destinoModelo: "MetodoPago",
      categoria: id(),
    });
    await expect(m.validate()).resolves.toBeUndefined();
  });

  test("un ingreso no puede llevar origen (prohibido)", async () => {
    const m = new Movimiento({
      tipo: "ingreso",
      monto: 45000,
      fecha: new Date(),
      origen: id(),
      destino: id(),
      destinoModelo: "MetodoPago",
      categoria: id(),
    });
    await expect(m.validate()).rejects.toThrow(/origen/);
  });

  test("un pago_tarjeta no puede llevar categoria (prohibida)", async () => {
    const m = new Movimiento({
      tipo: "pago_tarjeta",
      monto: 850000,
      fecha: new Date(),
      origen: id(),
      destino: id(),
      destinoModelo: "MetodoPago",
      categoria: id(),
    });
    await expect(m.validate()).rejects.toThrow(/categoria/);
  });

  test("origen y destino no pueden ser el mismo", async () => {
    const mismo = id();
    const m = new Movimiento({
      tipo: "pago_tarjeta",
      monto: 850000,
      fecha: new Date(),
      origen: mismo,
      destino: mismo,
      destinoModelo: "MetodoPago",
    });
    await expect(m.validate()).rejects.toThrow(/no pueden ser el mismo/);
  });

  test("un tipo invalido es rechazado", async () => {
    const m = new Movimiento({ tipo: "cripto", monto: 100, fecha: new Date() });
    await expect(m.validate()).rejects.toThrow();
  });
});

describe("Movimiento: monto en centavos", () => {
  test("un monto con decimales es rechazado (debe ser entero)", async () => {
    const m = new Movimiento({
      tipo: "consumo",
      monto: 45.5,
      fecha: new Date(),
      origen: id(),
      categoria: id(),
    });
    await expect(m.validate()).rejects.toThrow(/entero/);
  });

  test("un monto negativo es rechazado", async () => {
    const m = new Movimiento({
      tipo: "consumo",
      monto: -100,
      fecha: new Date(),
      origen: id(),
      categoria: id(),
    });
    await expect(m.validate()).rejects.toThrow(/negativo/);
  });
});
