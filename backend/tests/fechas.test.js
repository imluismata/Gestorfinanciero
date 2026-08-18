const {
  diaDelMes,
  proximoCorte,
  limitePagoDeCorte,
  generarCuotas,
} = require("../src/utils/fechas");

describe("fechas: diaDelMes (el caso del 31 en meses cortos)", () => {
  test("un dia que existe se devuelve tal cual", () => {
    const d = diaDelMes(2026, 2, 15); // 15 de marzo (mes 2)
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
  });

  test("31 de febrero cae en el ultimo dia del mes (año no bisiesto)", () => {
    const d = diaDelMes(2026, 1, 31); // feb 2026 no es bisiesto
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(28);
  });

  test("31 de febrero en año bisiesto da 29", () => {
    const d = diaDelMes(2024, 1, 31); // 2024 si es bisiesto
    expect(d.getDate()).toBe(29);
  });

  test("31 de abril (mes de 30) da 30", () => {
    const d = diaDelMes(2026, 3, 31); // abril
    expect(d.getDate()).toBe(30);
  });
});

describe("fechas: proximoCorte", () => {
  test("si el corte del mes aun no pasa, es este mes", () => {
    const corte = proximoCorte(25, new Date(2026, 2, 10)); // 10 de marzo
    expect(corte.getMonth()).toBe(2); // marzo
    expect(corte.getDate()).toBe(25);
  });

  test("si el corte del mes ya paso, es el mes siguiente", () => {
    const corte = proximoCorte(25, new Date(2026, 2, 26)); // 26 de marzo
    expect(corte.getMonth()).toBe(3); // abril
    expect(corte.getDate()).toBe(25);
  });
});

describe("fechas: limitePagoDeCorte", () => {
  test("si el limite <= corte, cae el mes siguiente", () => {
    const corte = new Date(2026, 2, 25); // corta el 25 de marzo
    const limite = limitePagoDeCorte(corte, 25, 15);
    expect(limite.getMonth()).toBe(3); // abril
    expect(limite.getDate()).toBe(15);
  });

  test("si el limite > corte, cae el mismo mes", () => {
    const corte = new Date(2026, 2, 5); // corta el 5 de marzo
    const limite = limitePagoDeCorte(corte, 5, 20);
    expect(limite.getMonth()).toBe(2); // marzo
    expect(limite.getDate()).toBe(20);
  });
});

describe("fechas: generarCuotas", () => {
  test("genera la cantidad pedida, numeradas y sin pagar", () => {
    const cuotas = generarCuotas(new Date(2026, 0, 10), 3, 500000, 15);
    expect(cuotas).toHaveLength(3);
    expect(cuotas.map((c) => c.numero)).toEqual([1, 2, 3]);
    expect(cuotas.every((c) => c.pagada === false)).toBe(true);
    expect(cuotas.every((c) => c.monto === 500000)).toBe(true);
  });

  test("la primera cuota cae este mes si el dia de pago aun no paso", () => {
    const cuotas = generarCuotas(new Date(2026, 0, 5), 2, 100, 15);
    // dia 15 no ha pasado el 5 de enero -> primera cuota 15 de enero
    expect(cuotas[0].fechaVencimiento.getMonth()).toBe(0);
    expect(cuotas[0].fechaVencimiento.getDate()).toBe(15);
  });

  test("la primera cuota salta al mes siguiente si el dia ya paso", () => {
    const cuotas = generarCuotas(new Date(2026, 0, 20), 2, 100, 15);
    // dia 15 ya paso el 20 de enero -> primera cuota 15 de febrero
    expect(cuotas[0].fechaVencimiento.getMonth()).toBe(1);
    expect(cuotas[0].fechaVencimiento.getDate()).toBe(15);
  });
});
