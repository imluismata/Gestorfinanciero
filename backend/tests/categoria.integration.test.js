const request = require("supertest");
const { Types } = require("mongoose");
const app = require("../src/app");
const Categoria = require("../src/models/categoria.model");
const { conectar, limpiar, desconectar } = require("./helpers/db");

beforeAll(async () => {
  await conectar();
  // Construye el indice unico { padre, nombre } antes de las pruebas de
  // duplicados; si no, la primera insercion podria ganarle a su creacion.
  await Categoria.init();
});
afterEach(limpiar);
afterAll(desconectar);

describe("POST /api/categorias", () => {
  test("crea una categoria principal", async () => {
    const res = await request(app)
      .post("/api/categorias")
      .send({ nombre: "transporte" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.nombre).toBe("transporte");
    expect(res.body.data.padre).toBeNull();
    expect(res.body.data.aplicaA).toBe("gasto");
    expect(res.body.data.activo).toBe(true);
  });

  test("una subcategoria hereda aplicaA del padre (ignora el enviado)", async () => {
    const padre = await Categoria.create({ nombre: "sueldo", aplicaA: "ingreso" });
    const res = await request(app)
      .post("/api/categorias")
      .send({ nombre: "quincena", padre: padre._id.toString(), aplicaA: "gasto" });

    expect(res.status).toBe(201);
    expect(res.body.data.aplicaA).toBe("ingreso");
  });

  test("rechaza un tercer nivel (solo se permiten 2)", async () => {
    const raiz = await Categoria.create({ nombre: "transporte" });
    const sub = await Categoria.create({ nombre: "uber", padre: raiz._id });
    const res = await request(app)
      .post("/api/categorias")
      .send({ nombre: "nieto", padre: sub._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test("rechaza un duplicado bajo el mismo padre", async () => {
    await request(app).post("/api/categorias").send({ nombre: "transporte" });
    const res = await request(app)
      .post("/api/categorias")
      .send({ nombre: "transporte" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/categorias", () => {
  test("devuelve el arbol con subcategorias anidadas", async () => {
    const raiz = await Categoria.create({ nombre: "transporte" });
    await Categoria.create({ nombre: "uber", padre: raiz._id });

    const res = await request(app).get("/api/categorias?aplicaA=gasto");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].subcategorias).toHaveLength(1);
    expect(res.body.data[0].subcategorias[0].nombre).toBe("uber");
  });
});

describe("PUT /api/categorias/:id", () => {
  test("no permite cambiar el padre", async () => {
    const a = await Categoria.create({ nombre: "transporte" });
    const b = await Categoria.create({ nombre: "salud" });
    const sub = await Categoria.create({ nombre: "uber", padre: a._id });

    const res = await request(app)
      .put(`/api/categorias/${sub._id}`)
      .send({ padre: b._id.toString() });

    expect(res.status).toBe(400);
  });

  test("actualiza el nombre", async () => {
    const c = await Categoria.create({ nombre: "transporte" });
    const res = await request(app)
      .put(`/api/categorias/${c._id}`)
      .send({ nombre: "movilidad" });

    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe("movilidad");
  });
});

describe("DELETE /api/categorias/:id", () => {
  test("no desactiva una principal con hijas activas", async () => {
    const raiz = await Categoria.create({ nombre: "transporte" });
    await Categoria.create({ nombre: "uber", padre: raiz._id });

    const res = await request(app).delete(`/api/categorias/${raiz._id}`);
    expect(res.status).toBe(400);
  });

  test("desactiva (no borra) y sigue en la base", async () => {
    const c = await Categoria.create({ nombre: "transporte" });
    const res = await request(app).delete(`/api/categorias/${c._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(false);
    expect(await Categoria.findById(c._id)).not.toBeNull();
  });

  test("404 si el id no existe, 400 si el id es invalido", async () => {
    const idInexistente = new Types.ObjectId();
    const r404 = await request(app).delete(`/api/categorias/${idInexistente}`);
    const r400 = await request(app).delete("/api/categorias/abc");

    expect(r404.status).toBe(404);
    expect(r400.status).toBe(400);
  });
});
