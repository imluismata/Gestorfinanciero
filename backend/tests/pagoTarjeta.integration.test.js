const request = require("supertest");
const app = require("../src/app");
const Categoria = require("../src/models/categoria.model");
const { Cuenta, TarjetaCredito } = require("../src/models/metodoPago.model");
const { conectar, limpiar, desconectar } = require("./helpers/db");

beforeAll(conectar);
afterEach(limpiar);
afterAll(desconectar);

const crearInstrumentos = async () => {
  const cuenta = await Cuenta.create({ nombre: "Ahorros BHD", saldoInicial: 0 });
  const tarjeta = await TarjetaCredito.create({
    nombre: "Popular Visa",
    limiteCredito: 10000000, // en centavos
    diaCorte: 25,
    diaLimitePago: 15,
  });
  return { cuenta, tarjeta };
};

describe("POST /api/movimientos/pago-tarjeta", () => {
  test("registra un pago de cuenta a tarjeta", async () => {
    const { cuenta, tarjeta } = await crearInstrumentos();

    const res = await request(app).post("/api/movimientos/pago-tarjeta").send({
      origen: cuenta._id.toString(),
      destino: tarjeta._id.toString(),
      monto: 850000,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.tipo).toBe("pago_tarjeta");
    expect(res.body.data.monto).toBe(850000);
  });

  test("rechaza pagar una tarjeta con otra tarjeta (400)", async () => {
    const { tarjeta } = await crearInstrumentos();
    const otra = await TarjetaCredito.create({
      nombre: "Otra Visa",
      limiteCredito: 5000000,
      diaCorte: 10,
      diaLimitePago: 1,
    });

    const res = await request(app).post("/api/movimientos/pago-tarjeta").send({
      origen: tarjeta._id.toString(),
      destino: otra._id.toString(),
      monto: 1000,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/otra tarjeta/);
  });

  test("rechaza si el destino no es una tarjeta (400)", async () => {
    const a = await Cuenta.create({ nombre: "A", saldoInicial: 0 });
    const b = await Cuenta.create({ nombre: "B", saldoInicial: 0 });

    const res = await request(app)
      .post("/api/movimientos/pago-tarjeta")
      .send({ origen: a._id.toString(), destino: b._id.toString(), monto: 1000 });

    expect(res.status).toBe(400);
  });
});

describe("regla critica: los neutros no inflan el gasto", () => {
  test("un pago de tarjeta NO aparece en el total por categoria", async () => {
    const { cuenta, tarjeta } = await crearInstrumentos();
    const raiz = await Categoria.create({ nombre: "transporte", aplicaA: "gasto" });
    const sub = await Categoria.create({ nombre: "uber", padre: raiz._id });

    // Un consumo real (efecto gasto).
    await request(app).post("/api/movimientos").send({
      tipo: "consumo",
      monto: 1500,
      origen: cuenta._id.toString(),
      subcategoria: sub._id.toString(),
    });

    // Un pago de tarjeta (efecto neutro): NO debe contar en el gasto.
    await request(app).post("/api/movimientos/pago-tarjeta").send({
      origen: cuenta._id.toString(),
      destino: tarjeta._id.toString(),
      monto: 999999,
    });

    const res = await request(app).get(
      "/api/movimientos/resumen?agrupar=categoria"
    );

    expect(res.status).toBe(200);
    const total = res.body.data.reduce((suma, g) => suma + g.total, 0);
    // Solo el consumo de 1500 cuenta; el pago de 999999 queda fuera.
    expect(total).toBe(1500);
  });
});
