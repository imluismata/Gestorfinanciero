// TODO EL DINERO SE GUARDA COMO ENTERO EN CENTAVOS.
//
//   $45.50  ->  se guarda como 4550
//   RD$1,200.00  ->  se guarda como 120000
//
// Por que centavos y no decimales: los numeros con punto flotante de
// JavaScript no representan bien los decimales (0.1 + 0.2 === 0.30000000000000004).
// En una app de dinero eso produce centavos que aparecen y desaparecen.
// Con enteros la suma es exacta, y lo es tambien dentro de las
// agregaciones de MongoDB ($sum sobre enteros no pierde precision).
//
// Regla: el modelo y la base SIEMPRE manejan centavos (enteros). La
// conversion a/desde pesos ocurre solo en los bordes: al recibir del
// cliente (aCentavos) y al mostrar (formatear).

// Convierte un valor en pesos (lo que escribe el usuario) a centavos.
// Math.round evita que 19.99 * 100 se guarde como 1998.9999999998.
const aCentavos = (pesos) => Math.round(Number(pesos) * 100);

// Convierte centavos guardados a pesos, para calculos o para mostrar.
const aPesos = (centavos) => Number(centavos) / 100;

// Formatea centavos como texto de moneda. Uso tipico en el frontend,
// pero vive aqui para que el formato sea uno solo en todo el proyecto.
const formatear = (centavos, moneda = "DOP") =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: moneda,
  }).format(aPesos(centavos));

module.exports = { aCentavos, aPesos, formatear };
