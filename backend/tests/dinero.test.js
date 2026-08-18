const { aCentavos, aPesos, formatear } = require("../src/utils/dinero");

describe("dinero: conversion pesos <-> centavos", () => {
  test("convierte pesos a centavos enteros", () => {
    expect(aCentavos(45.5)).toBe(4550);
    expect(aCentavos(19.99)).toBe(1999);
    expect(aCentavos(0)).toBe(0);
    expect(aCentavos(1200)).toBe(120000);
  });

  test("evita el error de punto flotante (0.1 + 0.2)", () => {
    // 0.1 + 0.2 === 0.30000000000000004; sin Math.round daria 30.0000...4
    expect(aCentavos(0.1 + 0.2)).toBe(30);
  });

  test("centavos vuelven a pesos", () => {
    expect(aPesos(4550)).toBe(45.5);
    expect(aPesos(0)).toBe(0);
  });

  test("ida y vuelta no pierde precision", () => {
    for (const pesos of [45.5, 19.99, 1200, 0.01, 999999.99]) {
      expect(aPesos(aCentavos(pesos))).toBeCloseTo(pesos, 2);
    }
  });

  test("formatea centavos como moneda legible", () => {
    // El simbolo/espaciado exactos dependen de ICU; se verifica el numero.
    expect(formatear(120000)).toMatch(/1,200\.00/);
    expect(formatear(4550)).toMatch(/45\.50/);
  });
});
