// El dinero se guarda en centavos (entero): 45.50 -> 4550. Asi evitamos
// los problemas de decimales de los floats (0.1 + 0.2 no da 0.3).

// pesos -> centavos. El round es por los decimales que se cuelan.
const aCentavos = (pesos) => Math.round(Number(pesos) * 100);

// centavos -> pesos
const aPesos = (centavos) => Number(centavos) / 100;

// centavos -> "RD$45.50"
const formatear = (centavos, moneda = "DOP") =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: moneda }).format(
    aPesos(centavos)
  );

module.exports = { aCentavos, aPesos, formatear };
