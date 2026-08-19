// Pantalla de Movimientos: historial por dia + formulario para gastos e
// ingresos. Usa los helpers de ui.js (dinero, fechas, escape, selects).

// Iconos SVG: flecha abajo = gasto, flecha arriba = ingreso.
const MOV_ICO = {
  gasto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
  ingreso: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
};

const movEstado = {
  cache: [],
  pagina: 1,
  paginas: 1,
  filtro: "todos", // todos | gasto | ingreso
  tipoForm: "consumo", // consumo | ingreso
  editandoId: null,
  arboles: { gasto: [], ingreso: [] },
  metodos: [],
  cargado: false, // ya se cargaron categorias + metodos
};

const esGasto = (m) => m.tipo === "consumo" || m.tipo === "cuota_prestamo";
const esIngreso = (m) => m.tipo === "ingreso";

// ISO -> "YYYY-MM-DD" en hora local (para el input date).
function movFechaLocal(fecha) {
  const d = new Date(fecha);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// "Hoy", "Ayer" o la fecha corta.
function movEtiquetaDia(fechaISO) {
  const hoy = movFechaLocal(new Date());
  const ayer = movFechaLocal(new Date(Date.now() - 86400000));
  if (fechaISO === hoy) return "Hoy";
  if (fechaISO === ayer) return "Ayer";
  return new Date(fechaISO + "T00:00:00").toLocaleDateString("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function movHora(fecha) {
  return new Date(fecha).toLocaleTimeString("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inicializarMovimientos() {
  const seccion = document.getElementById("pantalla-movimientos");
  if (!seccion) return;

  seccion.innerHTML = `
    <div class="encabezado-pantalla">
      <div>
        <h2>Movimientos</h2>
        <p>Registra y revisa tu actividad financiera</p>
      </div>
      <button class="btn btn-primario" id="mov-nuevo">${icono("masCirculo")} Nuevo movimiento</button>
    </div>

    <div class="mov-barra">
      <div class="mov-filtros">
        <button class="mov-filtro mov-filtro--activo" data-filtro="todos">Todos</button>
        <button class="mov-filtro" data-filtro="gasto">Gastos</button>
        <button class="mov-filtro" data-filtro="ingreso">Ingresos</button>
      </div>
      <span class="mov-conteo" id="mov-conteo"></span>
    </div>

    <div class="tarjeta panel-formulario" id="mov-form-panel" hidden></div>

    <div id="mov-lista"></div>
  `;

  document.getElementById("mov-nuevo").addEventListener("click", () => {
    if (movEstado.editandoId || !document.getElementById("mov-form-panel").hidden) {
      cerrarFormularioMov();
    } else {
      abrirFormularioMov();
    }
  });

  seccion.querySelectorAll(".mov-filtro").forEach((btn) => {
    btn.addEventListener("click", () => {
      movEstado.filtro = btn.dataset.filtro;
      seccion.querySelectorAll(".mov-filtro").forEach((b) =>
        b.classList.toggle("mov-filtro--activo", b === btn)
      );
      renderListaMov();
    });
  });

  // Delegacion: editar / eliminar / cargar mas se resuelven aqui aunque
  // la lista se vuelva a pintar.
  document.getElementById("mov-lista").addEventListener("click", (e) => {
    const accionBtn = e.target.closest("[data-accion]");
    if (!accionBtn) return;
    const id = accionBtn.closest("[data-id]")?.dataset.id;
    if (accionBtn.dataset.accion === "editar") editarMovimiento(id);
    if (accionBtn.dataset.accion === "eliminar") eliminarMovimientoUI(id);
    if (accionBtn.dataset.accion === "cargar-mas") cargarMovimientos(true);
  });

  cargarMovimientos();
}

// ---------- Carga de datos ----------
async function cargarMovimientos(anexar = false) {
  const cont = document.getElementById("mov-lista");
  if (!anexar) {
    movEstado.pagina = 1;
    mostrarCargando(cont, "Cargando movimientos...");
  }

  try {
    const query = `?pagina=${movEstado.pagina}&limite=20`;
    const data = await api.listarMovimientos(query);
    movEstado.paginas = data.paginacion.paginas;
    movEstado.total = data.paginacion.total;
    movEstado.cache = anexar
      ? movEstado.cache.concat(data.movimientos)
      : data.movimientos;
    renderListaMov();
  } catch (err) {
    mostrarError(cont, err.message);
  }
}

// Carga categorias y metodos de pago una sola vez (para el formulario).
async function cargarCatalogosMov() {
  if (movEstado.cargado) return;
  const [gasto, ingreso, metodos] = await Promise.all([
    api.listarCategorias("?aplicaA=gasto&soloActivas=true"),
    api.listarCategorias("?aplicaA=ingreso&soloActivas=true"),
    api.listarMetodosPago("?activo=true"),
  ]);
  movEstado.arboles.gasto = gasto;
  movEstado.arboles.ingreso = ingreso;
  // El endpoint puede devolver un arreglo directo o {metodos:[...]}.
  movEstado.metodos = Array.isArray(metodos) ? metodos : metodos.metodos || [];
  movEstado.cargado = true;
}

// ---------- Render de la lista ----------
function renderListaMov() {
  const cont = document.getElementById("mov-lista");
  const conteo = document.getElementById("mov-conteo");

  let items = movEstado.cache;
  if (movEstado.filtro === "gasto") items = items.filter(esGasto);
  if (movEstado.filtro === "ingreso") items = items.filter(esIngreso);

  conteo.textContent = movEstado.total
    ? `${movEstado.total} movimiento${movEstado.total === 1 ? "" : "s"}`
    : "";

  if (!items.length) {
    cont.innerHTML = `<div class="vacio"><strong>Sin movimientos</strong>
      Registra tu primer gasto o ingreso con el botón de arriba.</div>`;
    return;
  }

  // Agrupa por dia conservando el orden (la API los trae por fecha desc).
  const grupos = [];
  const indice = {};
  for (const m of items) {
    const dia = movFechaLocal(m.fecha);
    if (!(dia in indice)) {
      indice[dia] = grupos.length;
      grupos.push([dia, []]);
    }
    grupos[indice[dia]][1].push(m);
  }

  let html = "";
  for (const [dia, movs] of grupos) {
    html += `<div class="mov-dia">${escapar(movEtiquetaDia(dia))}</div>`;
    html += `<div class="tarjeta mov-grupo">${movs.map(filaMovHTML).join("")}</div>`;
  }

  // Boton "cargar mas" solo si el filtro es "todos" (los otros filtran el
  // cache ya cargado) y quedan paginas.
  if (movEstado.filtro === "todos" && movEstado.pagina < movEstado.paginas) {
    html += `<div class="mov-cargar-mas">
      <button class="btn btn-secundario" data-accion="cargar-mas">Cargar más movimientos</button>
    </div>`;
  }

  cont.innerHTML = html;
}

function filaMovHTML(m) {
  const ingreso = esIngreso(m);
  const color = ingreso
    ? "var(--color-primario)"
    : m.categoria?.color || "var(--color-texto-suave)";

  const titulo = m.descripcion || m.categoria?.nombre || "Movimiento";
  const sub = [m.categoria?.nombre, m.subcategoria?.nombre]
    .filter(Boolean)
    .join(" · ");

  const signo = ingreso ? "+" : "-";
  const montoClase = ingreso ? "mov-fila__monto--ingreso" : "";

  return `
    <div class="mov-fila" data-id="${m._id}">
      <span class="mov-fila__icono" style="color:${color}; background:${color}1f">
        ${ingreso ? MOV_ICO.ingreso : MOV_ICO.gasto}
      </span>
      <div class="mov-fila__info">
        <div class="mov-fila__titulo">${escapar(titulo)}</div>
        ${sub ? `<div class="mov-fila__sub">${escapar(sub)}</div>` : ""}
      </div>
      <div class="mov-fila__derecha">
        <div class="mov-fila__monto monto ${montoClase}">${signo}${escapar(formatearMoneda(m.monto))}</div>
        <div class="mov-fila__hora">${escapar(movHora(m.fecha))}</div>
      </div>
      <div class="mov-fila__acciones">
        <button class="btn-icono" data-accion="editar" title="Editar">${icono("lapiz")}</button>
        <button class="btn-icono btn-icono--peligro" data-accion="eliminar" title="Eliminar">${icono("papelera")}</button>
      </div>
    </div>`;
}

// ---------- Formulario ----------
async function abrirFormularioMov(mov = null) {
  const panel = document.getElementById("mov-form-panel");
  panel.hidden = false;

  // Carga de catalogos; si falla o no hay metodos, se avisa.
  panel.innerHTML = `<p class="estado estado--cargando">Cargando formulario...</p>`;
  try {
    await cargarCatalogosMov();
  } catch (err) {
    panel.innerHTML = `<p class="estado estado--error">${escapar(err.message)}</p>`;
    return;
  }

  if (!movEstado.metodos.length) {
    panel.innerHTML = `<div class="vacio"><strong>Necesitas un método de pago</strong>
      Crea una cuenta, tarjeta o efectivo en la pantalla <em>Métodos de pago</em> antes de registrar un movimiento.</div>`;
    return;
  }

  movEstado.editandoId = mov ? mov._id : null;
  movEstado.tipoForm = mov ? mov.tipo : "consumo";

  panel.innerHTML = `
    <h3 id="mov-form-titulo">${mov ? "Editar movimiento" : "Nuevo movimiento"}</h3>
    <form id="mov-form">
      <div class="seg">
        <button type="button" class="seg-boton" data-tipo="consumo">Gasto</button>
        <button type="button" class="seg-boton" data-tipo="ingreso">Ingreso</button>
      </div>

      <div class="campo-fila">
        <div class="campo campo-monto">
          <label for="mov-monto">Monto</label>
          <span class="campo-monto__prefijo">RD$</span>
          <input id="mov-monto" type="text" inputmode="decimal" placeholder="0.00" autocomplete="off" />
        </div>
        <div class="campo">
          <label for="mov-fecha">Fecha</label>
          <input id="mov-fecha" type="date" />
        </div>
      </div>

      <div class="campo">
        <label for="mov-metodo" id="mov-metodo-label">Cuenta / origen</label>
        <select id="mov-metodo"></select>
      </div>

      <div class="campo-fila">
        <div class="campo">
          <label for="mov-categoria">Categoría</label>
          <select id="mov-categoria"></select>
        </div>
        <div class="campo" id="mov-subcat-campo">
          <label for="mov-subcategoria">Subcategoría</label>
          <select id="mov-subcategoria"></select>
        </div>
      </div>

      <div class="campo">
        <label for="mov-descripcion">Descripción <span class="campo-ayuda">(opcional)</span></label>
        <input id="mov-descripcion" type="text" maxlength="200" placeholder="Ej. Uber al trabajo" autocomplete="off" />
      </div>

      <div class="acciones-formulario">
        <button type="button" class="btn btn-secundario" id="mov-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primario">${mov ? "Guardar cambios" : "Registrar"}</button>
      </div>
    </form>
  `;

  // Formato de miles en el campo de monto.
  activarFormatoMiles(document.getElementById("mov-monto"));

  // Segmento Gasto/Ingreso.
  panel.querySelectorAll(".seg-boton").forEach((btn) => {
    btn.addEventListener("click", () => cambiarTipoMov(btn.dataset.tipo));
  });

  // Cascada categoria -> subcategoria.
  document
    .getElementById("mov-categoria")
    .addEventListener("change", (e) => llenarSubcategoriasMov(e.target.value));

  document.getElementById("mov-cancelar").addEventListener("click", cerrarFormularioMov);
  document.getElementById("mov-form").addEventListener("submit", enviarMovimiento);

  // Estado inicial del formulario segun el tipo.
  cambiarTipoMov(movEstado.tipoForm);

  // Valores por defecto o de edicion.
  if (mov) {
    document.getElementById("mov-monto").value = formatearValorMiles(String(aPesos(mov.monto)));
    document.getElementById("mov-fecha").value = movFechaLocal(mov.fecha);
    document.getElementById("mov-descripcion").value = mov.descripcion || "";
    document.getElementById("mov-categoria").value = mov.categoria?._id || "";
    llenarSubcategoriasMov(mov.categoria?._id || "");
    document.getElementById("mov-subcategoria").value = mov.subcategoria?._id || "";
    const metodoId = (mov.tipo === "ingreso" ? mov.destino : mov.origen)?._id;
    if (metodoId) document.getElementById("mov-metodo").value = metodoId;
  } else {
    document.getElementById("mov-fecha").value = movFechaLocal(new Date());
  }

  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function cerrarFormularioMov() {
  movEstado.editandoId = null;
  const panel = document.getElementById("mov-form-panel");
  panel.hidden = true;
  panel.innerHTML = "";
}

// Cambia el formulario entre gasto e ingreso: etiqueta del metodo, lista
// de metodos validos y arbol de categorias.
function cambiarTipoMov(tipo) {
  movEstado.tipoForm = tipo;

  document.querySelectorAll(".seg-boton").forEach((b) =>
    b.classList.toggle("seg-boton--activo", b.dataset.tipo === tipo)
  );

  const label = document.getElementById("mov-metodo-label");
  const metodoSelect = document.getElementById("mov-metodo");

  // Un ingreso solo entra a cuenta o efectivo, nunca a una tarjeta.
  let metodos = movEstado.metodos;
  if (tipo === "ingreso") {
    label.textContent = "Entra a (cuenta o efectivo)";
    metodos = metodos.filter((m) => m.tipo !== "tarjeta_credito");
  } else {
    label.textContent = "Cuenta / origen";
  }

  llenarSelect(
    metodoSelect,
    metodos.map((m) => ({ valor: m._id, texto: m.nombre })),
    { placeholder: "Elige un método" }
  );

  // Arbol de categorias segun el tipo.
  const arbol = tipo === "ingreso" ? movEstado.arboles.ingreso : movEstado.arboles.gasto;
  llenarSelect(
    document.getElementById("mov-categoria"),
    arbol.map((c) => ({ valor: c._id, texto: c.nombre })),
    { placeholder: "Elige categoría" }
  );
  llenarSubcategoriasMov("");
}

// Llena el select de subcategorias del padre elegido. Si no tiene, oculta
// el campo (un select vacio se lee como error).
function llenarSubcategoriasMov(padreId) {
  const campo = document.getElementById("mov-subcat-campo");
  const select = document.getElementById("mov-subcategoria");
  const arbol =
    movEstado.tipoForm === "ingreso"
      ? movEstado.arboles.ingreso
      : movEstado.arboles.gasto;

  const padre = arbol.find((c) => c._id === padreId);
  const subs = padre?.subcategorias || [];

  if (!subs.length) {
    campo.hidden = true;
    select.innerHTML = "";
    return;
  }

  campo.hidden = false;
  llenarSelect(
    select,
    subs.map((s) => ({ valor: s._id, texto: s.nombre })),
    { placeholder: "Sin especificar" }
  );
}

async function enviarMovimiento(e) {
  e.preventDefault();

  const monto = aCentavos(document.getElementById("mov-monto").value);
  if (!monto || monto <= 0) {
    mostrarExito("El monto debe ser mayor que cero");
    return;
  }

  const categoria = document.getElementById("mov-categoria").value;
  if (!categoria) {
    mostrarExito("Elige una categoría");
    return;
  }

  const metodo = document.getElementById("mov-metodo").value;
  if (!metodo) {
    mostrarExito("Elige un método de pago");
    return;
  }

  const datos = {
    tipo: movEstado.tipoForm,
    monto,
    fecha: document.getElementById("mov-fecha").value || undefined,
    descripcion: document.getElementById("mov-descripcion").value.trim() || undefined,
    categoria,
  };
  const sub = document.getElementById("mov-subcategoria").value;
  if (sub) datos.subcategoria = sub;
  if (movEstado.tipoForm === "consumo") datos.origen = metodo;
  else datos.destino = metodo;

  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    if (movEstado.editandoId) {
      await api.actualizarMovimiento(movEstado.editandoId, datos);
      mostrarExito("Movimiento actualizado");
    } else {
      await api.crearMovimiento(datos);
      mostrarExito("Movimiento registrado");
    }
    cerrarFormularioMov();
    await cargarMovimientos();
  } catch (err) {
    boton.disabled = false;
    mostrarExito(err.message);
  }
}

function editarMovimiento(id) {
  const mov = movEstado.cache.find((m) => m._id === id);
  if (mov) abrirFormularioMov(mov);
}

async function eliminarMovimientoUI(id) {
  if (!confirmar("¿Eliminar este movimiento? No se puede deshacer.")) return;
  try {
    await api.eliminarMovimiento(id);
    mostrarExito("Movimiento eliminado");
    await cargarMovimientos();
  } catch (err) {
    mostrarExito(err.message);
  }
}
