const request = require("supertest");
const app = require("../src/app");
const Categoria = require("../src/models/categoria.model");
const { Cuenta } = require("../src/models/metodoPago.model");
const { conectar, limpiar, desconectar } = require("./helpers/db");

beforeAll(conectar);
afterEach(limpiar);
afterAll(desconectar);

// Escenario minimo de gasto: una cuenta (origen) y una subcategoria de
// gasto con su padre.
const escenarioGasto = async () => {
  const cuenta = await Cuenta.create({ nombre: "Ahorros BHD", saldoInicial: 0 });
  const raiz = await Categoria.create({ nombre: "transporte", aplicaA: "gasto" });
  const sub = await Categoria.create({ nombre: "uber", padre: raiz._id });
  return { cuenta, raiz, sub };
};

describe("POST /api/movimientos (consumo)", () => {
  test("crea un consumo y DERIVA la categoria del padre de la subcategoria", async () => {
    const { cuenta, raiz, sub } = await escenarioGasto();

    const res = await request(app).post("/api/movimientos").send({
      tipo: "consumo",
      monto: 4550,
      origen: cuenta._id.toString(),
      subcategoria: sub._id.toString(),
      descripcion: "Uber al trabajo",
    });

    expect(res.status).toBe(201);
    // La categoria NO la manda el cliente: la deriva el servidor.
    expect(res.body.data.categoria).toBe(raiz._id.toString());
    expect(res.body.data.subcategoria).toBe(sub._id.toString());
    expect(res.body.data.monto).toBe(4550);
  });

  test("rechaza un consumo sin origen (400)", async () => {
    const { sub } = await escenarioGasto();
    const res = await request(app)
      .post("/api/movimientos")
      .send({ tipo: "consumo", monto: 4550, subcategoria: sub._id.toString() });

    expect(res.status).toBe(400);
  });

  test("rechaza monto con decimales (400)", async () => {
    const { cuenta, sub } = await escenarioGasto();
    const res = await request(app).post("/api/movimientos").send({
      tipo: "consumo",
      monto: 45.5,
      origen: cuenta._id.toString(),
      subcategoria: sub._id.toString(),
    });

    expect(res.status).toBe(400);
  });

  test("rechaza clasificar un consumo con una categoria de ingreso", async () => {
    const cuenta = await Cuenta.create({ nombre: "Ahorros", saldoInicial: 0 });
    const raizIng = await Categoria.create({ nombre: "sueldo", aplicaA: "ingreso" });
    const subIng = await Categoria.create({ nombre: "quincena", padre: raizIng._id });

    const res = await request(app).post("/api/movimientos").send({
      tipo: "consumo",
      monto: 4550,
      origen: cuenta._id.toString(),
      subcategoria: subIng._id.toString(),
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no corresponde/);
  });
});

describe("CRUD de un movimiento", () => {
  test("crea, lista, edita y elimina", async () => {
    const { cuenta, sub } = await escenarioGasto();

    const creado = await request(app).post("/api/movimientos").send({
      tipo: "consumo",
      monto: 1000,
      origen: cuenta._id.toString(),
      subcategoria: sub._id.toString(),
    });
    const id = creado.body.data._id;

    const lista = await request(app).get("/api/movimientos");
    expect(lista.status).toBe(200);
    expect(lista.body.data.movimientos).toHaveLength(1);
    expect(lista.body.data.paginacion.total).toBe(1);

    const edit = await request(app)
      .put(`/api/movimientos/${id}`)
      .send({ monto: 2000 });
    expect(edit.status).toBe(200);
    expect(edit.body.data.monto).toBe(2000);

    const del = await request(app).delete(`/api/movimientos/${id}`);
    expect(del.status).toBe(200);

    const vacia = await request(app).get("/api/movimientos");
    expect(vacia.body.data.movimientos).toHaveLength(0);
  });
});

describe("GET /api/movimientos/resumen", () => {
  test("400 si falta el parametro agrupar", async () => {
    const res = await request(app).get("/api/movimientos/resumen");
    expect(res.status).toBe(400);
  });

  test("agrupa el gasto por categoria y suma los montos", async () => {
    const { cuenta, sub } = await escenarioGasto();
    const enviar = (monto) =>
      request(app).post("/api/movimientos").send({
        tipo: "consumo",
        monto,
        origen: cuenta._id.toString(),
        subcategoria: sub._id.toString(),
      });
    await enviar(1000);
    await enviar(500);

    const res = await request(app).get(
      "/api/movimientos/resumen?agrupar=categoria"
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].total).toBe(1500);
    expect(res.body.data[0].cantidad).toBe(2);
    expect(res.body.data[0].nombre).toBe("transporte");
  });
});
