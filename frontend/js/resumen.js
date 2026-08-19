// Pantalla de Resumen (Persona A). El dashboard: balance del mes,
// tendencia mensual (barras), gasto por categoria y movimientos
// recientes. Todo sale de /api/movimientos/resumen y /api/movimientos.
// El grafico se dibuja con barras CSS: sin librerias ni CDN.

function inicializarResumen() {
  const seccion = document.getElementById("pantalla-resumen");
  if (!seccion) return;

  seccion.innerHTML = `
    <div class="encabezado-pantalla">
      <div>
        <h2>Resumen</h2>
        <p>Tu balance y tus gastos de un vistazo</p>
      </div>
    </div>
    <div id="resumen-cuerpo"></div>
  `;

  cargarResumen();
}

async function cargarResumen() {
  const cont = document.getElementById("resumen-cuerpo");
  mostrarCargando(cont, "Calculando tu resumen...");
  try {
    const [porMes, porCategoria, recientes] = await Promise.all([
      api.resumenMovimientos("?agrupar=mes"),
      api.resumenMovimientos("?agrupar=categoria"),
      api.listarMovimientos("?limite=5"),
    ]);
    renderResumen(cont, porMes, porCategoria, recientes.movimientos);
  } catch (err) {
    mostrarError(cont, err.message);
  }
}

function renderResumen(cont, porMes, porCategoria, recientes) {
  if (!porMes.length && !recientes.length) {
    cont.innerHTML = `<div class="vacio"><strong>Aún no hay datos</strong>
      Registra algunos movimientos y aquí verás tu balance y tus gráficos.</div>`;
    return;
  }

  cont.innerHTML = `
    <div class="resumen-grid">
      <div class="resumen-col">
        ${cardBalance(porMes)}
        ${cardTendencia(porMes)}
      </div>
      <div class="resumen-col">
        ${cardCategorias(porCategoria)}
        ${cardRecientes(recientes)}
      </div>
    </div>
  `;
}

// Clave "YYYY-MM" del mes actual, en hora local.
function claveMesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nombreMes(clave) {
  const [a, m] = clave.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
}

function mesCorto(clave) {
  const [a, m] = clave.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("es-DO", { month: "short" });
}

// ---------- Tarjeta de balance del mes ----------
function cardBalance(porMes) {
  const clave = claveMesActual();
  const mes =
    porMes.find((x) => x._id === clave) ||
    porMes[porMes.length - 1] || // si no hay datos este mes, el ultimo con datos
    { _id: clave, ingresos: 0, gastos: 0, balance: 0 };

  const positivo = mes.balance >= 0;

  return `
    <div class="tarjeta card-balance">
      <span class="card-balance__etiqueta">Balance de ${escapar(nombreMes(mes._id))}</span>
      <div class="card-balance__monto monto ${positivo ? "" : "card-balance__monto--neg"}">
        ${positivo ? "" : "-"}${escapar(formatearMoneda(Math.abs(mes.balance)))}
      </div>
      <div class="card-balance__detalle">
        <div>
          <span class="mini-etiqueta">Ingresos</span>
          <span class="monto card-balance__ing">+${escapar(formatearMoneda(mes.ingresos))}</span>
        </div>
        <div>
          <span class="mini-etiqueta">Gastos</span>
          <span class="monto card-balance__gas">-${escapar(formatearMoneda(mes.gastos))}</span>
        </div>
      </div>
    </div>
  `;
}

// ---------- Grafico de tendencia mensual (barras CSS) ----------
function cardTendencia(porMes) {
  const meses = porMes.slice(-6); // ultimos 6 meses
  const max = Math.max(1, ...meses.map((m) => Math.max(m.ingresos, m.gastos)));

  const columnas = meses
    .map(
      (m) => `
      <div class="chart-col" title="${escapar(nombreMes(m._id))}">
        <div class="chart-bars">
          <span class="chart-bar chart-bar--ing" style="height:${(m.ingresos / max) * 100}%"></span>
          <span class="chart-bar chart-bar--gas" style="height:${(m.gastos / max) * 100}%"></span>
        </div>
        <span class="chart-label">${escapar(mesCorto(m._id))}</span>
      </div>`
    )
    .join("");

  return `
    <div class="tarjeta card-chart">
      <div class="card-chart__cabecera">
        <h3>Tendencia mensual</h3>
        <div class="chart-leyenda">
          <span class="chart-leyenda__item"><i class="punto punto--ing"></i>Ingresos</span>
          <span class="chart-leyenda__item"><i class="punto punto--gas"></i>Gastos</span>
        </div>
      </div>
      <div class="chart">${columnas || '<p class="campo-ayuda">Sin datos todavía.</p>'}</div>
    </div>
  `;
}

// ---------- Gasto por categoria (barras de progreso) ----------
function cardCategorias(porCategoria) {
  const top = porCategoria.slice(0, 6);
  const max = Math.max(1, ...top.map((c) => c.total));

  const filas = top
    .map((c) => {
      const nombre = c.nombre || "Sin categoría";
      const color = c.color || "var(--color-primario)";
      return `
      <div class="cat-fila">
        <div class="cat-fila__top">
          <span class="cat-fila__nombre">${escapar(nombre)}</span>
          <span class="cat-fila__monto monto">${escapar(formatearMoneda(c.total))}</span>
        </div>
        <div class="cat-barra">
          <span class="cat-barra__relleno" style="width:${(c.total / max) * 100}%; background:${color}"></span>
        </div>
      </div>`;
    })
    .join("");

  return `
    <div class="tarjeta card-lado">
      <h3>Gasto por categoría</h3>
      ${filas || '<p class="campo-ayuda">Aún no hay gastos registrados.</p>'}
    </div>
  `;
}

// ---------- Movimientos recientes ----------
function cardRecientes(recientes) {
  const filas = recientes
    .map((m) => {
      const ingreso = m.tipo === "ingreso";
      const color = ingreso
        ? "var(--color-primario)"
        : m.categoria?.color || "var(--color-texto-suave)";
      const titulo = m.descripcion || m.categoria?.nombre || "Movimiento";
      const signo = ingreso ? "+" : "-";
      return `
      <div class="rec-fila">
        <span class="rec-fila__punto" style="background:${color}"></span>
        <span class="rec-fila__nombre">${escapar(titulo)}</span>
        <span class="rec-fila__monto monto ${ingreso ? "rec-fila__monto--ing" : ""}">${signo}${escapar(formatearMoneda(m.monto))}</span>
      </div>`;
    })
    .join("");

  return `
    <div class="tarjeta card-lado">
      <h3>Recientes</h3>
      ${filas || '<p class="campo-ayuda">Sin movimientos recientes.</p>'}
    </div>
  `;
}
