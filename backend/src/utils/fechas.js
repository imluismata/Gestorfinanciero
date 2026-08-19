// Toda la aritmetica de fechas del proyecto vive aqui. Repartirla entre
// controladores garantiza que cada uno maneje distinto el caso del dia
// 31 en febrero.

// Convierte el string de un <input type="date"> ("2026-08-19") a un
// Date en medianoche LOCAL, no UTC.
//
// `new Date("2026-08-19")` a secas se interpreta, por spec de
// ECMAScript, como medianoche UTC. En un huso horario negativo (como
// Republica Dominicana, UTC-4), esa medianoche UTC cae la noche
// anterior en hora local. Como diaDelMes/generarCuotas leen el año,
// mes y dia con getFullYear/getMonth/getDate -- getters en hora local,
// no UTC -- terminaban leyendo el dia de ayer. Por eso todo dato que
// venga de un <input type="date"> pasa por aqui antes de convertirse
// en Date, en vez de usar `new Date(valor)` directo.
const fechaLocalDesdeInput = (valor) => {
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return new Date(`${valor}T00:00:00`);
  }
  return new Date(valor);
};

// Devuelve una fecha para el dia indicado dentro del mes dado.
// Si el dia no existe en ese mes (31 en febrero, 31 en abril),
// devuelve el ultimo dia del mes.
//
// El truco: pedir el dia 0 del mes SIGUIENTE devuelve el ultimo dia
// del mes actual, sin necesidad de tabla de dias por mes ni logica
// de años bisiestos.
const diaDelMes = (anio, mes, dia) => {
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  return new Date(anio, mes, Math.min(dia, ultimoDia));
};

// Proxima fecha de corte de una tarjeta, contada desde hoy.
const proximoCorte = (diaCorte, desde = new Date()) => {
  const candidato = diaDelMes(desde.getFullYear(), desde.getMonth(), diaCorte);

  // Si el corte de este mes ya paso, el proximo es el del mes que viene.
  if (candidato >= desde) return candidato;
  return diaDelMes(desde.getFullYear(), desde.getMonth() + 1, diaCorte);
};

// Fecha limite de pago correspondiente a un corte dado.
// Si el dia limite es menor o igual al de corte, cae en el mes
// siguiente (corta el 25, se paga el 15 del mes que viene).
// Si es mayor, cae en el mismo mes (corta el 5, se paga el 20).
const limitePagoDeCorte = (fechaCorte, diaCorte, diaLimitePago) => {
  const mesDestino =
    diaLimitePago <= diaCorte
      ? fechaCorte.getMonth() + 1
      : fechaCorte.getMonth();
  return diaDelMes(fechaCorte.getFullYear(), mesDestino, diaLimitePago);
};

// Genera el calendario de cuotas de un prestamo.
const generarCuotas = (fechaInicio, cantidadCuotas, montoCuota, diaPago) => {
  const cuotas = [];

  // Determina en que mes cae la primera cuota: este mes si el dia de
  // pago todavia no ha pasado, el siguiente si ya paso.
  const primera = diaDelMes(
    fechaInicio.getFullYear(),
    fechaInicio.getMonth(),
    diaPago
  );
  const desplazamiento = primera >= fechaInicio ? 0 : 1;

  for (let i = 0; i < cantidadCuotas; i++) {
    cuotas.push({
      numero: i + 1,
      fechaVencimiento: diaDelMes(
        fechaInicio.getFullYear(),
        fechaInicio.getMonth() + desplazamiento + i,
        diaPago
      ),
      monto: montoCuota,
      pagada: false,
    });
  }

  return cuotas;
};

module.exports = {
  diaDelMes,
  proximoCorte,
  limitePagoDeCorte,
  generarCuotas,
  fechaLocalDesdeInput,
};
