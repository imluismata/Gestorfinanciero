// Pantalla de Metodos de pago (Persona B). Un solo formulario con tres
// juegos de campos que se muestran u ocultan segun el tipo elegido: es
// el mismo patron que discriminators usa en el backend, asi que la
// pantalla y el modelo cuentan la misma historia.

const ETIQUETA_TIPO = {
  tarjeta_credito: "Tarjeta de crédito",
  cuenta: "Cuenta",
  efectivo: "Efectivo",
};

const ICONO_TIPO = {
  tarjeta_credito: "tarjeta",
  cuenta: "cuenta",
  efectivo: "efectivo",
};

let mpContenedor = null;
let mpMetodos = [];
let mpIdEnEdicion = null; // null = formulario en modo "crear"

function inicializarMetodosPago() {
  mpContenedor = document.getElementById("pantalla-metodos-pago");
  if (!mpContenedor) return;

  mpContenedor.innerHTML = `
    <div class="encabezado-pantalla">
      <div>
        <h2>Métodos de pago</h2>
        <p>Tarjetas de crédito, cuentas y efectivo: de dónde sale y a dónde entra tu dinero.</p>
      </div>
      <button class="btn btn-primario" id="mp-btn-nuevo" type="button">+ Nuevo método</button>
    </div>

    <div class="barra-herramientas">
      <label class="interruptor">
        <input type="checkbox" id="mp-chk-inactivos" />
        Mostrar desactivados
      </label>
    </div>

    <div class="tarjeta panel-formulario" id="mp-panel-formulario" hidden>
      <h3 id="mp-form-titulo">Nuevo método de pago</h3>
      <form id="mp-form" novalidate>
        <div class="campo-fila">
          <div class="campo">
            <label for="mp-tipo">Tipo</label>
            <select id="mp-tipo">
              <option value="cuenta">Cuenta (débito o ahorro)</option>
              <option value="tarjeta_credito">Tarjeta de crédito</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>
          <div class="campo">
            <label for="mp-nombre">Nombre</label>
            <input id="mp-nombre" type="text" maxlength="60" placeholder="Ej. Popular Visa Clásica" required />
          </div>
          <div class="campo">
            <label for="mp-banco">Banco</label>
            <input id="mp-banco" type="text" maxlength="60" placeholder="Opcional" />
          </div>
          <div class="campo">
            <label for="mp-moneda">Moneda</label>
            <select id="mp-moneda">
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div class="campos-tipo" data-tipo="tarjeta_credito">
          <div class="campo">
            <label for="mp-limite">Límite de crédito</label>
            <div class="campo-monto">
              <span class="campo-monto__prefijo" id="mp-limite-prefijo">RD$</span>
              <input id="mp-limite" type="text" inputmode="decimal" />
            </div>
          </div>
          <div class="campo">
            <label for="mp-dia-corte">Día de corte</label>
            <input id="mp-dia-corte" type="number" min="1" max="31" />
          </div>
          <div class="campo">
            <label for="mp-dia-limite">Día límite de pago</label>
            <input id="mp-dia-limite" type="number" min="1" max="31" />
          </div>
          <div class="campo">
            <label for="mp-tasa">Tasa anual</label>
            <div class="campo-sufijo">
              <input id="mp-tasa" type="number" min="0" step="0.01" placeholder="Opcional" />
              <span class="campo-sufijo__texto">%</span>
            </div>
          </div>
        </div>

        <div class="campos-tipo" data-tipo="cuenta">
          <div class="campo">
            <label for="mp-saldo-inicial">Saldo inicial</label>
            <div class="campo-monto">
              <span class="campo-monto__prefijo" id="mp-saldo-inicial-prefijo">RD$</span>
              <input id="mp-saldo-inicial" type="text" inputmode="decimal" />
            </div>
            <span class="campo-ayuda" id="mp-saldo-ayuda">Foto del día en que empezás a usar la app. No se puede editar después.</span>
          </div>
          <div class="campo">
            <label style="flex-direction: row; align-items: center; gap: 0.4rem">
              <input id="mp-es-ahorro" type="checkbox" checked style="width: auto" />
              Es cuenta de ahorro
            </label>
          </div>
        </div>

        <div class="acciones-formulario">
          <button type="button" class="btn btn-secundario" id="mp-btn-cancelar">Cancelar</button>
          <button type="submit" class="btn btn-primario" id="mp-btn-guardar">Guardar</button>
        </div>
      </form>
    </div>

    <div id="mp-estado"></div>
    <div class="lista-metodos" id="mp-grilla"></div>
  `;

  document.getElementById("mp-btn-nuevo").addEventListener("click", () => abrirFormularioMetodo());
  document.getElementById("mp-btn-cancelar").addEventListener("click", cerrarFormularioMetodo);
  document.getElementById("mp-tipo").addEventListener("change", actualizarCamposPorTipo);
  document.getElementById("mp-moneda").addEventListener("change", actualizarPrefijosMoneda);
  document.getElementById("mp-form").addEventListener("submit", guardarMetodoPago);
  document.getElementById("mp-chk-inactivos").addEventListener("change", cargarMetodosPago);
  activarFormatoMiles(document.getElementById("mp-limite"));
  activarFormatoMiles(document.getElementById("mp-saldo-inicial"));

  cargarMetodosPago();
}

async function cargarMetodosPago() {
  const grilla = document.getElementById("mp-grilla");
  const incluirInactivos = document.getElementById("mp-chk-inactivos").checked;

  mostrarCargando(document.getElementById("mp-estado"), "Cargando métodos de pago...");
  grilla.innerHTML = "";

  try {
    mpMetodos = await api.listarMetodosPago(incluirInactivos ? "?incluirInactivos=true" : "");
    document.getElementById("mp-estado").innerHTML = "";
    renderGrillaMetodos();
  } catch (err) {
    mostrarError(document.getElementById("mp-estado"), err.message);
  }
}

function renderGrillaMetodos() {
  const grilla = document.getElementById("mp-grilla");

  if (mpMetodos.length === 0) {
    grilla.innerHTML = `
      <div class="vacio">
        <strong>Todavía no hay métodos de pago</strong>
        Agregá tu primera tarjeta, cuenta o efectivo para empezar a registrar movimientos.
      </div>`;
    return;
  }

  grilla.innerHTML = mpMetodos
    .map((metodo) => {
      const inactivoClase = metodo.activo ? "" : " fila-metodo--inactivo";
      const subtitulo = [metodo.banco, metaPorTipo(metodo)].filter(Boolean).join(" · ");

      return `
        <article class="tarjeta fila-metodo fila-metodo--${metodo.tipo}${inactivoClase}" data-id="${metodo._id}">
          <div class="fila-metodo__icono">${icono(ICONO_TIPO[metodo.tipo])}</div>

          <div class="fila-metodo__info">
            <div class="fila-metodo__nombre">${escapar(metodo.nombre)}</div>
            ${subtitulo ? `<div class="fila-metodo__subtitulo">${escapar(subtitulo)}</div>` : ""}
          </div>

          <div class="fila-metodo__estado">
            <span class="fila-metodo__estado-valor fila-metodo__estado-valor--pendiente monto">calculando…</span>
            <span class="fila-metodo__estado-etiqueta">${metodo.tipo === "tarjeta_credito" ? "disponible" : "saldo"}</span>
          </div>

          <span class="chip chip--${metodo.activo ? metodo.tipo : "inactivo"}">${metodo.activo ? ETIQUETA_TIPO[metodo.tipo] : "Desactivado"}</span>

          <div class="fila-metodo__acciones">
            <button class="btn-icono" data-accion="editar" title="Editar ${escapar(metodo.nombre)}" type="button">${icono("lapiz")}</button>
            ${metodo.activo ? `<button class="btn-icono btn-icono--peligro" data-accion="desactivar" title="Desactivar ${escapar(metodo.nombre)}" type="button">${icono("bloquear")}</button>` : ""}
          </div>
        </article>`;
    })
    .join("");

  grilla.querySelectorAll("[data-accion='editar']").forEach((boton) => {
    boton.addEventListener("click", (e) => {
      const id = e.target.closest(".fila-metodo").dataset.id;
      abrirFormularioMetodo(mpMetodos.find((m) => m._id === id));
    });
  });

  grilla.querySelectorAll("[data-accion='desactivar']").forEach((boton) => {
    boton.addEventListener("click", (e) => {
      const fila = e.target.closest(".fila-metodo");
      const metodo = mpMetodos.find((m) => m._id === fila.dataset.id);
      desactivarMetodo(metodo);
    });
  });

  mpMetodos.forEach(cargarEstadoDeTarjeta);
}

function metaPorTipo(metodo) {
  if (metodo.tipo === "tarjeta_credito") {
    return `Corte día ${metodo.diaCorte} · Pago día ${metodo.diaLimitePago}`;
  }
  if (metodo.tipo === "cuenta") {
    return metodo.esAhorro ? "Ahorro" : "Corriente";
  }
  return "";
}

// El saldo/disponible se pide aparte (GET /:id/estado) y se pinta
// cuando llega, sin bloquear el resto de la lista. Mientras Persona A
// no suba el modelo Movimiento este endpoint responde 500: se degrada
// a "no disponible" en vez de romper la pantalla.
async function cargarEstadoDeTarjeta(metodo) {
  const nodo = document.querySelector(`.fila-metodo[data-id="${metodo._id}"] .fila-metodo__estado-valor`);
  if (!nodo) return;

  try {
    const estado = await api.estadoMetodoPago(metodo._id);
    const valor = metodo.tipo === "tarjeta_credito" ? estado.disponible : estado.saldo;
    nodo.textContent = formatearMoneda(valor, metodo.moneda);
    nodo.classList.remove("fila-metodo__estado-valor--pendiente");
  } catch {
    // Sin el modelo Movimiento (parte de Persona A) no se puede sumar
    // el historial, pero el dato que SI tenemos (saldo inicial o
    // limite) es mejor referencia que un texto vacio. La etiqueta
    // cambia junto al valor para no insinuar que es el saldo real.
    const etiqueta = nodo.nextElementSibling;
    if (metodo.tipo === "cuenta") {
      nodo.textContent = formatearMoneda(metodo.saldoInicial ?? 0, metodo.moneda);
      if (etiqueta) etiqueta.textContent = "saldo inicial";
    } else if (metodo.tipo === "tarjeta_credito") {
      nodo.textContent = formatearMoneda(metodo.limiteCredito, metodo.moneda);
      if (etiqueta) etiqueta.textContent = "límite";
    } else {
      nodo.textContent = "no disponible aún";
    }
  }
}

function abrirFormularioMetodo(metodo = null) {
  mpIdEnEdicion = metodo ? metodo._id : null;

  document.getElementById("mp-form-titulo").textContent = metodo ? `Editar ${metodo.nombre}` : "Nuevo método de pago";
  document.getElementById("mp-form").reset();

  const selectTipo = document.getElementById("mp-tipo");
  selectTipo.value = metodo ? metodo.tipo : "cuenta";
  // El tipo es el discriminador: no se puede cambiar despues de creado.
  selectTipo.disabled = Boolean(metodo);

  document.getElementById("mp-nombre").value = metodo?.nombre ?? "";
  document.getElementById("mp-banco").value = metodo?.banco ?? "";
  document.getElementById("mp-moneda").value = metodo?.moneda ?? "DOP";

  document.getElementById("mp-limite").value = formatearValorMiles(metodo?.limiteCredito != null ? aPesos(metodo.limiteCredito) : "");
  document.getElementById("mp-dia-corte").value = metodo?.diaCorte ?? "";
  document.getElementById("mp-dia-limite").value = metodo?.diaLimitePago ?? "";
  document.getElementById("mp-tasa").value = metodo?.tasaInteresAnual ?? "";

  const campoSaldo = document.getElementById("mp-saldo-inicial");
  campoSaldo.value = formatearValorMiles(metodo?.saldoInicial != null ? aPesos(metodo.saldoInicial) : "");
  // saldoInicial es una foto del dia inicial: no se edita despues (ver skill).
  campoSaldo.disabled = Boolean(metodo);
  document.getElementById("mp-saldo-ayuda").hidden = !metodo;
  document.getElementById("mp-es-ahorro").checked = metodo?.esAhorro ?? true;

  actualizarCamposPorTipo();
  actualizarPrefijosMoneda();
  document.getElementById("mp-panel-formulario").hidden = false;
  document.getElementById("mp-panel-formulario").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function cerrarFormularioMetodo() {
  document.getElementById("mp-panel-formulario").hidden = true;
  mpIdEnEdicion = null;
}

// Refleja la moneda elegida ("DOP"/"USD") en el signo que se muestra
// dentro de los campos de dinero, para que no sea un simple placeholder
// que desaparece al escribir.
function actualizarPrefijosMoneda() {
  const prefijo = document.getElementById("mp-moneda").value === "USD" ? "US$" : "RD$";
  document.getElementById("mp-limite-prefijo").textContent = prefijo;
  document.getElementById("mp-saldo-inicial-prefijo").textContent = prefijo;
}

function actualizarCamposPorTipo() {
  const tipo = document.getElementById("mp-tipo").value;
  document.querySelectorAll("#mp-form .campos-tipo").forEach((bloque) => {
    bloque.classList.toggle("campos-tipo--activo", bloque.dataset.tipo === tipo);
  });
}

async function guardarMetodoPago(evento) {
  evento.preventDefault();

  const tipo = document.getElementById("mp-tipo").value;
  const datos = {
    nombre: document.getElementById("mp-nombre").value.trim(),
    banco: document.getElementById("mp-banco").value.trim() || undefined,
    moneda: document.getElementById("mp-moneda").value,
  };

  if (!mpIdEnEdicion) {
    datos.tipo = tipo;
  }

  if (tipo === "tarjeta_credito") {
    datos.limiteCredito = aCentavos(document.getElementById("mp-limite").value || 0);
    datos.diaCorte = Number(document.getElementById("mp-dia-corte").value);
    datos.diaLimitePago = Number(document.getElementById("mp-dia-limite").value);
    const tasa = document.getElementById("mp-tasa").value;
    if (tasa !== "") datos.tasaInteresAnual = Number(tasa);
  } else if (tipo === "cuenta") {
    if (!mpIdEnEdicion) {
      datos.saldoInicial = aCentavos(document.getElementById("mp-saldo-inicial").value || 0);
    }
    datos.esAhorro = document.getElementById("mp-es-ahorro").checked;
  }

  const boton = document.getElementById("mp-btn-guardar");
  boton.disabled = true;

  try {
    if (mpIdEnEdicion) {
      await api.actualizarMetodoPago(mpIdEnEdicion, datos);
      mostrarExito("Método de pago actualizado");
    } else {
      await api.crearMetodoPago(datos);
      mostrarExito("Método de pago creado");
    }
    cerrarFormularioMetodo();
    cargarMetodosPago();
  } catch (err) {
    mostrarError(document.getElementById("mp-estado"), err.message);
  } finally {
    boton.disabled = false;
  }
}

async function desactivarMetodo(metodo) {
  if (!confirmar(`¿Desactivar "${metodo.nombre}"? Vas a dejar de verlo en los selectores de gastos nuevos, pero el historial no se toca.`)) {
    return;
  }

  try {
    await api.desactivarMetodoPago(metodo._id);
    mostrarExito("Método de pago desactivado");
    cargarMetodosPago();
  } catch (err) {
    mostrarError(document.getElementById("mp-estado"), err.message);
  }
}
