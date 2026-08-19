// Pantalla de Categorias (Persona A). Gestiona el arbol de dos niveles:
// categorias principales y subcategorias, en dos arboles separados
// (gasto e ingreso). Crear, editar nombre/color, y desactivar (nunca
// borrar). El padre de una subcategoria no se puede cambiar.

const catEstado = {
  arbol: "gasto", // gasto | ingreso (arbol visible)
  datos: { gasto: [], ingreso: [] },
  // Formulario: modo y contexto.
  modo: null, // "crear-principal" | "crear-sub" | "editar"
  editId: null,
  padreId: null,
  esPrincipal: true,
};

function inicializarCategorias() {
  const seccion = document.getElementById("pantalla-categorias");
  if (!seccion) return;

  seccion.innerHTML = `
    <div class="encabezado-pantalla">
      <div>
        <h2>Categorías</h2>
        <p>Organiza tus gastos e ingresos en dos árboles</p>
      </div>
      <button class="btn btn-primario" id="cat-nueva">${icono("masCirculo")} Nueva categoría</button>
    </div>

    <div class="seg" id="cat-seg">
      <button type="button" class="seg-boton seg-boton--activo" data-arbol="gasto">Gastos</button>
      <button type="button" class="seg-boton" data-arbol="ingreso">Ingresos</button>
    </div>

    <div class="tarjeta panel-formulario" id="cat-form-panel" hidden></div>

    <div id="cat-arbol"></div>
  `;

  document.getElementById("cat-nueva").addEventListener("click", () => {
    if (!document.getElementById("cat-form-panel").hidden) cerrarFormularioCat();
    else abrirFormularioCat({ modo: "crear-principal" });
  });

  seccion.querySelectorAll("#cat-seg .seg-boton").forEach((btn) => {
    btn.addEventListener("click", () => {
      catEstado.arbol = btn.dataset.arbol;
      seccion
        .querySelectorAll("#cat-seg .seg-boton")
        .forEach((b) => b.classList.toggle("seg-boton--activo", b === btn));
      cerrarFormularioCat();
      renderArbolCat();
    });
  });

  // Delegacion de acciones en el arbol.
  document.getElementById("cat-arbol").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-accion]");
    if (!btn) return;
    const id = btn.dataset.id;
    const padre = btn.dataset.padre;
    const accion = btn.dataset.accion;
    if (accion === "add-sub") abrirFormularioCat({ modo: "crear-sub", padreId: id });
    if (accion === "editar") editarCategoria(id);
    if (accion === "baja") desactivarCategoriaUI(id);
    void padre;
  });

  cargarCategorias();
}

async function cargarCategorias() {
  const cont = document.getElementById("cat-arbol");
  mostrarCargando(cont, "Cargando categorías...");
  try {
    const [gasto, ingreso] = await Promise.all([
      api.listarCategorias("?aplicaA=gasto&soloActivas=true"),
      api.listarCategorias("?aplicaA=ingreso&soloActivas=true"),
    ]);
    catEstado.datos.gasto = gasto;
    catEstado.datos.ingreso = ingreso;
    renderArbolCat();
  } catch (err) {
    mostrarError(cont, err.message);
  }
}

function renderArbolCat() {
  const cont = document.getElementById("cat-arbol");
  const arbol = catEstado.datos[catEstado.arbol];

  if (!arbol.length) {
    cont.innerHTML = `<div class="vacio"><strong>Sin categorías</strong>
      Crea tu primera categoría con el botón de arriba.</div>`;
    return;
  }

  cont.innerHTML = arbol.map(catPrincipalHTML).join("");
}

function catPrincipalHTML(cat) {
  const color = cat.color || "var(--color-primario)";
  const subs = cat.subcategorias || [];

  const subsHTML = subs.length
    ? `<div class="cat-subs">${subs
        .map(
          (s) => `
        <span class="cat-sub">
          ${escapar(s.nombre)}
          <button class="cat-sub__x" data-accion="editar" data-id="${s._id}" title="Editar">${icono("lapiz")}</button>
          <button class="cat-sub__x" data-accion="baja" data-id="${s._id}" title="Desactivar">${icono("bloquear")}</button>
        </span>`
        )
        .join("")}</div>`
    : `<p class="cat-sin-subs">Sin subcategorías</p>`;

  return `
    <div class="tarjeta cat-cat">
      <div class="cat-cat__cab">
        <span class="cat-cat__punto" style="background:${color}"></span>
        <span class="cat-cat__nombre">${escapar(cat.nombre)}</span>
        <span class="cat-cat__conteo">${subs.length} subcategoría${subs.length === 1 ? "" : "s"}</span>
        <div class="cat-cat__acc">
          <button class="btn btn-secundario btn-chico" data-accion="add-sub" data-id="${cat._id}">${icono("masCirculo")} Subcategoría</button>
          <button class="btn-icono" data-accion="editar" data-id="${cat._id}" title="Editar">${icono("lapiz")}</button>
          <button class="btn-icono btn-icono--peligro" data-accion="baja" data-id="${cat._id}" title="Desactivar">${icono("bloquear")}</button>
        </div>
      </div>
      ${subsHTML}
    </div>
  `;
}

// ---------- Formulario ----------
function abrirFormularioCat({ modo, padreId = null, cat = null }) {
  const panel = document.getElementById("cat-form-panel");
  panel.hidden = false;

  catEstado.modo = modo;
  catEstado.editId = cat ? cat._id : null;
  catEstado.padreId = padreId;
  // Es principal si: crea principal, o edita algo sin padre.
  catEstado.esPrincipal =
    modo === "crear-principal" || (modo === "editar" && !cat.padre);

  let titulo = "Nueva categoría";
  let contexto = "";
  if (modo === "crear-sub") {
    const padre = catEstado.datos[catEstado.arbol].find((c) => c._id === padreId);
    titulo = "Nueva subcategoría";
    contexto = `<p class="campo-ayuda">Bajo <strong>${escapar(padre?.nombre || "")}</strong></p>`;
  } else if (modo === "editar") {
    titulo = catEstado.esPrincipal ? "Editar categoría" : "Editar subcategoría";
  }

  const colorCampo = catEstado.esPrincipal
    ? `<div class="campo">
         <label for="cat-color">Color</label>
         <input id="cat-color" type="color" value="${cat?.color || "#4a7c59"}" />
       </div>`
    : "";

  panel.innerHTML = `
    <h3>${titulo}</h3>
    ${contexto}
    <form id="cat-form">
      <div class="campo-fila">
        <div class="campo">
          <label for="cat-nombre">Nombre</label>
          <input id="cat-nombre" type="text" maxlength="40" autocomplete="off" placeholder="Ej. Transporte" value="${escapar(cat?.nombre || "")}" />
        </div>
        ${colorCampo}
      </div>
      <div class="acciones-formulario">
        <button type="button" class="btn btn-secundario" id="cat-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primario">${modo === "editar" ? "Guardar" : "Crear"}</button>
      </div>
    </form>
  `;

  document.getElementById("cat-cancelar").addEventListener("click", cerrarFormularioCat);
  document.getElementById("cat-form").addEventListener("submit", enviarCategoria);
  document.getElementById("cat-nombre").focus();
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function cerrarFormularioCat() {
  const panel = document.getElementById("cat-form-panel");
  panel.hidden = true;
  panel.innerHTML = "";
  catEstado.modo = null;
  catEstado.editId = null;
  catEstado.padreId = null;
}

async function enviarCategoria(e) {
  e.preventDefault();
  const nombre = document.getElementById("cat-nombre").value.trim();
  if (!nombre) {
    mostrarExito("El nombre es obligatorio");
    return;
  }

  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;

  try {
    if (catEstado.modo === "editar") {
      const datos = { nombre };
      if (catEstado.esPrincipal) datos.color = document.getElementById("cat-color").value;
      await api.actualizarCategoria(catEstado.editId, datos);
      mostrarExito("Categoría actualizada");
    } else if (catEstado.modo === "crear-sub") {
      await api.crearCategoria({ nombre, padre: catEstado.padreId });
      mostrarExito("Subcategoría creada");
    } else {
      await api.crearCategoria({
        nombre,
        aplicaA: catEstado.arbol,
        color: document.getElementById("cat-color").value,
      });
      mostrarExito("Categoría creada");
    }
    cerrarFormularioCat();
    await cargarCategorias();
  } catch (err) {
    boton.disabled = false;
    mostrarExito(err.message);
  }
}

// Busca una categoria (principal o sub) en el arbol actual por id.
function buscarCategoria(id) {
  for (const p of catEstado.datos[catEstado.arbol]) {
    if (p._id === id) return p;
    const s = (p.subcategorias || []).find((x) => x._id === id);
    if (s) return s;
  }
  return null;
}

function editarCategoria(id) {
  const cat = buscarCategoria(id);
  if (cat) abrirFormularioCat({ modo: "editar", cat });
}

async function desactivarCategoriaUI(id) {
  const cat = buscarCategoria(id);
  const nombre = cat?.nombre || "esta categoría";
  if (!confirmar(`¿Desactivar "${nombre}"? No aparecerá en los formularios nuevos.`))
    return;
  try {
    await api.desactivarCategoria(id);
    mostrarExito("Categoría desactivada");
    await cargarCategorias();
  } catch (err) {
    mostrarExito(err.message);
  }
}
