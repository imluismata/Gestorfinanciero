// Pantalla de Prestamos (Persona B). Cada prestamo se puede expandir
// para ver su calendario de cuotas y pagar la que corresponda; pagar
// una cuota crea el Movimiento tipo cuota_prestamo del lado del
// backend (ver controllers/prestamo.controller.js).

let prContenedor = null;
let prPrestamos = [];
let prExpandidoId = null; // id del prestamo con las cuotas visibles

function inicializarPrestamos() {
  prContenedor = document.getElementById("pantalla-prestamos");
  if (!prContenedor) return;

  prContenedor.innerHTML = `
    <div class="encabezado-pantalla">
      <div>
        <h2>Préstamos</h2>
        <p>Deudas con calendario de cuotas. Pagar una cuota registra el gasto automáticamente.</p>
      </div>
      <button class="btn btn-primario" id="pr-btn-nuevo" type="button">+ Nuevo préstamo</button>
    </div>

    <div class="tarjeta panel-formulario" id="pr-panel-formulario" hidden>
      <h3>Nuevo préstamo</h3>
      <form id="pr-form" novalidate>
        <div class="campo-fila">
          <div class="campo">
            <label for="pr-nombre">Nombre</label>
            <input id="pr-nombre" type="text" placeholder="Ej. Préstamo carro" required />
          </div>
          <div class="campo">
            <label for="pr-acreedor">Acreedor</label>
            <input id="pr-acreedor" type="text" placeholder="Banco, financiera o persona" />
          </div>
          <div class="campo">
            <label for="pr-moneda">Moneda</label>
            <select id="pr-moneda">
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div class="campo-fila">
          <div class="campo">
            <label for="pr-monto-original">Monto original</label>
            <div class="campo-monto">
              <span class="campo-monto__prefijo" id="pr-monto-original-prefijo">RD$</span>
              <input id="pr-monto-original" type="text" inputmode="decimal" required />
            </div>
          </div>
          <div class="campo">
            <label for="pr-tasa">Tasa anual</label>
            <div class="campo-sufijo">
              <input id="pr-tasa" type="number" min="0" step="0.01" placeholder="Opcional" />
              <span class="campo-sufijo__texto">%</span>
            </div>
          </div>
          <div class="campo">
            <label for="pr-fecha-inicio">Fecha de inicio</label>
            <input id="pr-fecha-inicio" type="date" required />
          </div>
        </div>

        <div class="campo-fila">
          <div class="campo">
            <label for="pr-cantidad-cuotas">Cantidad de cuotas</label>
            <input id="pr-cantidad-cuotas" type="number" min="1" required />
          </div>
          <div class="campo">
            <label for="pr-monto-cuota">Monto por cuota</label>
            <div class="campo-monto">
              <span class="campo-monto__prefijo" id="pr-monto-cuota-prefijo">RD$</span>
              <input id="pr-monto-cuota" type="text" inputmode="decimal" required />
            </div>
          </div>
          <div class="campo">
            <label for="pr-dia-pago">Día de pago</label>
            <input id="pr-dia-pago" type="number" min="1" max="31" required />
          </div>
          <div class="campo">
            <label for="pr-cuenta-origen">Cuenta de origen</label>
            <select id="pr-cuenta-origen">
              <option value="">Sin definir</option>
            </select>
          </div>
        </div>

        <div class="acciones-formulario">
          <button type="button" class="btn btn-secundario" id="pr-btn-cancelar">Cancelar</button>
          <button type="submit" class="btn btn-primario" id="pr-btn-guardar">Guardar</button>
        </div>
      </form>
    </div>

    <div id="pr-estado"></div>
    <div class="lista-prestamos" id="pr-lista"></div>
  `;

  document.getElementById("pr-btn-nuevo").addEventListener("click", abrirFormularioPrestamo);
  document.getElementById("pr-btn-cancelar").addEventListener("click", cerrarFormularioPrestamo);
  document.getElementById("pr-form").addEventListener("submit", guardarPrestamo);
  document.getElementById("pr-moneda").addEventListener("change", actualizarPrefijosMonedaPrestamo);
  activarFormatoMiles(document.getElementById("pr-monto-original"));
  activarFormatoMiles(document.getElementById("pr-monto-cuota"));

  cargarPrestamos();
}

async function cargarPrestamos() {
  const estado = document.getElementById("pr-estado");
  const lista = document.getElementById("pr-lista");

  mostrarCargando(estado, "Cargando préstamos...");
  lista.innerHTML = "";

  try {
    prPrestamos = await api.listarPrestamos();
    estado.innerHTML = "";
    renderListaPrestamos();
  } catch (err) {
    mostrarError(estado, err.message);
  }
}

function renderListaPrestamos() {
  const lista = document.getElementById("pr-lista");

  if (prPrestamos.length === 0) {
    lista.innerHTML = `
      <div class="vacio">
        <strong>Todavía no registraste ningún préstamo</strong>
        Cuando agregues uno, esta pantalla genera el calendario de cuotas solo.
      </div>`;
    return;
  }

  lista.innerHTML = prPrestamos.map(renderTarjetaPrestamo).join("");

  lista.querySelectorAll("[data-accion='expandir']").forEach((el) => {
    const alternar = () => {
      const id = el.closest(".tarjeta-prestamo").dataset.id;
      prExpandidoId = prExpandidoId === id ? null : id;
      renderListaPrestamos();
    };
    el.addEventListener("click", alternar);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        alternar();
      }
    });
  });

  lista.querySelectorAll("[data-accion='eliminar']").forEach((boton) => {
    boton.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = boton.closest(".tarjeta-prestamo").dataset.id;
      eliminarPrestamo(prPrestamos.find((p) => p._id === id));
    });
  });

  lista.querySelectorAll("[data-accion='pagar']").forEach((boton) => {
    boton.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirPanelPagarCuota(boton.dataset.prestamo, Number(boton.dataset.numero));
    });
  });
}

function renderTarjetaPrestamo(prestamo) {
  const porcentaje = prestamo.cantidadCuotas > 0 ? Math.round((prestamo.cuotasPagadas / prestamo.cantidadCuotas) * 100) : 0;
  const expandido = prExpandidoId === prestamo._id;
  const saldado = prestamo.cuotasPagadas === prestamo.cantidadCuotas;
  const totalAPagar = prestamo.cantidadCuotas * prestamo.montoCuota;

  return `
    <article class="tarjeta tarjeta-prestamo" data-id="${prestamo._id}">
      <div class="tarjeta-prestamo__encabezado" data-accion="expandir" role="button" tabindex="0" aria-expanded="${expandido}">
        <div class="tarjeta-prestamo__icono">${icono("prestamo")}</div>
        <div class="tarjeta-prestamo__titulo">
          <div class="tarjeta-prestamo__nombre">${escapar(prestamo.nombre)}</div>
          ${prestamo.acreedor ? `<div class="tarjeta-prestamo__acreedor">${escapar(prestamo.acreedor)}</div>` : ""}
        </div>
        <span class="chip chip--${saldado ? "efectivo" : "prestamo"}">${saldado ? "Pagado" : "Activo"}</span>
      </div>

      <div class="tarjeta-prestamo__saldo-fila">
        <span class="tarjeta-prestamo__saldo-etiqueta">Saldo pendiente</span>
        <span class="tarjeta-prestamo__saldo-valor monto">${formatearMoneda(prestamo.saldoPendiente, prestamo.moneda)}</span>
      </div>

      <div class="barra-progreso">
        <div class="barra-progreso__relleno" style="width: ${porcentaje}%"></div>
      </div>
      <div class="tarjeta-prestamo__resumen">
        <span>${porcentaje}% pagado (${prestamo.cuotasPagadas} de ${prestamo.cantidadCuotas})</span>
        <span>Total: ${formatearMoneda(totalAPagar, prestamo.moneda)}</span>
      </div>

      ${
        prestamo.proximaCuota
          ? `
        <div class="tarjeta-prestamo__proxima">
          <div>
            <div class="tarjeta-prestamo__proxima-etiqueta">Próximo pago</div>
            <div class="tarjeta-prestamo__proxima-valor">${formatearFecha(prestamo.proximaCuota.fechaVencimiento)}</div>
          </div>
          <div style="text-align: right">
            <div class="tarjeta-prestamo__proxima-etiqueta">Monto</div>
            <div class="tarjeta-prestamo__proxima-valor monto">${formatearMoneda(prestamo.proximaCuota.monto, prestamo.moneda)}</div>
          </div>
        </div>`
          : `<div class="tarjeta-prestamo__proxima tarjeta-prestamo__proxima--completo">Préstamo saldado ✓</div>`
      }

      ${
        expandido
          ? `
        <div class="tarjeta-prestamo__cuotas">
          ${prestamo.cuotas.map((cuota) => renderFilaCuota(prestamo, cuota)).join("")}
          <div class="acciones-formulario" style="border-top: none; padding-top: 0; justify-content: space-between">
            <button class="btn btn-peligro btn-chico" data-accion="eliminar" type="button">Eliminar préstamo</button>
          </div>
        </div>`
          : ""
      }
    </article>`;
}

function renderFilaCuota(prestamo, cuota) {
  if (cuota.pagada) {
    return `
      <div class="fila-cuota fila-cuota--pagada">
        <span class="fila-cuota__numero">${cuota.numero}</span>
        <span class="fila-cuota__fecha">Vencía ${formatearFecha(cuota.fechaVencimiento)} · pagada ${formatearFecha(cuota.fechaPago)}</span>
        <span class="fila-cuota__monto monto">${formatearMoneda(cuota.monto, prestamo.moneda)}</span>
        <span class="fila-cuota__etiqueta-pagada">Pagada</span>
      </div>
      <div class="panel-pagar-cuota" id="pagar-${prestamo._id}-${cuota.numero}" hidden></div>`;
  }

  return `
    <div class="fila-cuota">
      <span class="fila-cuota__numero">${cuota.numero}</span>
      <span class="fila-cuota__fecha">Vence ${formatearFecha(cuota.fechaVencimiento)}</span>
      <span class="fila-cuota__monto monto">${formatearMoneda(cuota.monto, prestamo.moneda)}</span>
      <button class="btn btn-secundario btn-chico" data-accion="pagar" data-prestamo="${prestamo._id}" data-numero="${cuota.numero}" type="button">Pagar</button>
    </div>
    <div class="panel-pagar-cuota" id="pagar-${prestamo._id}-${cuota.numero}" hidden></div>`;
}

// ---------- Formulario: nuevo prestamo ----------

async function abrirFormularioPrestamo() {
  document.getElementById("pr-form").reset();

  const selectCuenta = document.getElementById("pr-cuenta-origen");
  try {
    const metodos = await api.listarMetodosPago();
    const cuentasYEfectivo = metodos.filter((m) => m.tipo !== "tarjeta_credito");
    llenarSelect(
      selectCuenta,
      cuentasYEfectivo.map((m) => ({ valor: m._id, texto: m.nombre })),
      { placeholder: "Sin definir" },
    );
  } catch {
    llenarSelect(selectCuenta, [], { placeholder: "No se pudieron cargar las cuentas" });
  }

  actualizarPrefijosMonedaPrestamo();
  document.getElementById("pr-panel-formulario").hidden = false;
  document.getElementById("pr-panel-formulario").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function cerrarFormularioPrestamo() {
  document.getElementById("pr-panel-formulario").hidden = true;
}

function actualizarPrefijosMonedaPrestamo() {
  const prefijo = document.getElementById("pr-moneda").value === "USD" ? "US$" : "RD$";
  document.getElementById("pr-monto-original-prefijo").textContent = prefijo;
  document.getElementById("pr-monto-cuota-prefijo").textContent = prefijo;
}

async function guardarPrestamo(evento) {
  evento.preventDefault();

  const datos = {
    nombre: document.getElementById("pr-nombre").value.trim(),
    acreedor: document.getElementById("pr-acreedor").value.trim() || undefined,
    moneda: document.getElementById("pr-moneda").value,
    montoOriginal: aCentavos(document.getElementById("pr-monto-original").value || 0),
    fechaInicio: document.getElementById("pr-fecha-inicio").value,
    cantidadCuotas: Number(document.getElementById("pr-cantidad-cuotas").value),
    montoCuota: aCentavos(document.getElementById("pr-monto-cuota").value || 0),
    diaPago: Number(document.getElementById("pr-dia-pago").value),
    cuentaOrigen: document.getElementById("pr-cuenta-origen").value || undefined,
  };

  const tasa = document.getElementById("pr-tasa").value;
  if (tasa !== "") datos.tasaInteresAnual = Number(tasa);

  const boton = document.getElementById("pr-btn-guardar");
  boton.disabled = true;

  try {
    await api.crearPrestamo(datos);
    mostrarExito("Préstamo creado con su calendario de cuotas");
    cerrarFormularioPrestamo();
    cargarPrestamos();
  } catch (err) {
    mostrarError(document.getElementById("pr-estado"), err.message);
  } finally {
    boton.disabled = false;
  }
}

async function eliminarPrestamo(prestamo) {
  if (!confirmar(`¿Eliminar el préstamo "${prestamo.nombre}"? Esta acción no se puede deshacer.`)) {
    return;
  }

  try {
    await api.eliminarPrestamo(prestamo._id);
    mostrarExito("Préstamo eliminado");
    cargarPrestamos();
  } catch (err) {
    mostrarError(document.getElementById("pr-estado"), err.message);
  }
}

// ---------- Pagar una cuota ----------

async function abrirPanelPagarCuota(idPrestamo, numero) {
  const panel = document.getElementById(`pagar-${idPrestamo}-${numero}`);
  if (!panel) return;

  // Si ya esta abierto, el mismo boton lo cierra.
  if (!panel.hidden) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }

  const prestamo = prPrestamos.find((p) => p._id === idPrestamo);
  const hoy = new Date().toISOString().slice(0, 10);

  panel.innerHTML = `
    <div class="campo-fila">
      <div class="campo">
        <label for="pc-origen-${numero}">Pagar desde</label>
        <select id="pc-origen-${numero}"></select>
      </div>
      <div class="campo" id="pc-campo-categoria-${numero}">
        <label for="pc-categoria-${numero}">Categoría</label>
        <input id="pc-categoria-${numero}" type="text" placeholder="Cargando categorías..." />
      </div>
      <div class="campo">
        <label for="pc-fecha-${numero}">Fecha de pago</label>
        <input id="pc-fecha-${numero}" type="date" value="${hoy}" />
      </div>
    </div>
    <div class="acciones-formulario" style="border-top: none; padding-top: 0">
      <button type="button" class="btn btn-secundario btn-chico" data-accion="cancelar-pago">Cancelar</button>
      <button type="button" class="btn btn-primario btn-chico" data-accion="confirmar-pago">Confirmar pago</button>
    </div>
  `;
  panel.hidden = false;

  const selectOrigen = document.getElementById(`pc-origen-${numero}`);
  try {
    const metodos = await api.listarMetodosPago();
    const cuentasYEfectivo = metodos.filter((m) => m.tipo !== "tarjeta_credito");
    llenarSelect(
      selectOrigen,
      cuentasYEfectivo.map((m) => ({ valor: m._id, texto: m.nombre })),
      { placeholder: "Elegir cuenta o efectivo" },
    );
    if (prestamo?.cuentaOrigen) {
      selectOrigen.value = prestamo.cuentaOrigen._id || prestamo.cuentaOrigen;
    }
  } catch {
    llenarSelect(selectOrigen, [], { placeholder: "No se pudieron cargar las cuentas" });
  }

  await prepararCampoCategoria(numero);

  panel.querySelector("[data-accion='cancelar-pago']").addEventListener("click", () => {
    panel.hidden = true;
    panel.innerHTML = "";
  });

  panel.querySelector("[data-accion='confirmar-pago']").addEventListener("click", () => confirmarPagoCuota(idPrestamo, numero));
}

// El modulo de Categorias todavia no existe (es de Persona A). Si
// api.listarCategorias ya esta definida, se usa un selector real; si
// no, se deja un campo de texto para pegar el id a mano, sin romper el
// flujo mientras tanto.
async function prepararCampoCategoria(numero) {
  const contenedor = document.getElementById(`pc-campo-categoria-${numero}`);
  const input = document.getElementById(`pc-categoria-${numero}`);

  if (typeof api.listarCategorias !== "function") {
    input.placeholder = "Id de categoría";
    contenedor.insertAdjacentHTML("beforeend", `<span class="campo-ayuda">El selector llega cuando esté el módulo de categorías</span>`);
    return;
  }

  try {
    const categorias = await api.listarCategorias("?aplicaA=gasto&soloActivas=true");
    const select = document.createElement("select");
    select.id = `pc-categoria-${numero}`;
    llenarSelect(select, categorias.map((c) => ({ valor: c._id, texto: c.nombre })), { placeholder: "Elegir categoría" });
    input.replaceWith(select);
  } catch {
    input.placeholder = "Id de categoría";
  }
}

async function confirmarPagoCuota(idPrestamo, numero) {
  const origen = document.getElementById(`pc-origen-${numero}`).value;
  const categoria = document.getElementById(`pc-categoria-${numero}`).value;
  const fecha = document.getElementById(`pc-fecha-${numero}`).value;

  if (!origen) {
    mostrarError(document.getElementById("pr-estado"), "Elegí desde qué cuenta o efectivo se paga la cuota");
    return;
  }
  if (!categoria) {
    mostrarError(document.getElementById("pr-estado"), "Falta la categoría para registrar el pago");
    return;
  }

  try {
    await api.pagarCuota(idPrestamo, numero, { origen, categoria, fecha });
    mostrarExito(`Cuota ${numero} pagada`);
    cargarPrestamos();
  } catch (err) {
    mostrarError(document.getElementById("pr-estado"), err.message);
  }
}
