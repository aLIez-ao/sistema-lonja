/**
 * SISTEMA LONJA DE VERACRUZ — JS CLIENTE DINÁMICO
 * Cookies, Configuración en Vivo, Cálculos en Tiempo Real y Compartir
 */

// --------------------------------------------------------------------------
// PREFERENCIAS: el servidor decide si se guardan en cookie (según el
// consentimiento) y siempre las guarda en la cuenta del usuario.
// --------------------------------------------------------------------------
function postJSON(url, datos) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(datos),
  });
}

function aplicarPreferencia(clave, valor) {
  const atributos = { tema: 'data-theme', tamanoFuente: 'data-font-size', tipoFuente: 'data-font-family' };
  if (atributos[clave]) document.documentElement.setAttribute(atributos[clave], valor);

  const recargar = clave === 'moneda' || clave === 'idioma'; // el servidor vuelve a formatear/traducir
  postJSON('/configuracion/guardar-rapido', { clave, valor })
    .catch(() => {})
    .finally(() => { if (recargar) location.reload(); });
}

// --------------------------------------------------------------------------
// CONSENTIMIENTO DE COOKIES (banner)
// --------------------------------------------------------------------------
function inicializarBannerCookies() {
  const banner = document.getElementById('cookieConsentBanner');
  if (!banner) return;

  const enviar = (datos) =>
    postJSON('/configuracion/cookies', datos)
      .then((r) => { if (r.ok) banner.remove(); })
      .catch(() => {});

  banner.querySelectorAll('[data-cookies-nivel]').forEach((btn) => {
    btn.addEventListener('click', () => enviar({ nivel: btn.dataset.cookiesNivel }));
  });

  const guardarSeleccion = banner.querySelector('[data-cookies-guardar]');
  if (guardarSeleccion) {
    guardarSeleccion.addEventListener('click', () => {
      const categorias = Array.from(banner.querySelectorAll('input[name="categorias"]:checked')).map((i) => i.value);
      enviar({ categorias });
    });
  }
}

// Abre la pestaña indicada en el hash (p. ej. /configuracion#pane-cookies)
function inicializarPestanasPorHash() {
  const abrir = () => {
    if (!location.hash || !window.bootstrap) return;
    const disparador = document.querySelector(`[data-bs-toggle="list"][href="${CSS.escape ? '#' + CSS.escape(location.hash.slice(1)) : location.hash}"]`);
    if (disparador) bootstrap.Tab.getOrCreateInstance(disparador).show();
  };
  abrir();
  window.addEventListener('hashchange', abrir);
  document.querySelectorAll('[data-bs-toggle="list"]').forEach((el) => {
    el.addEventListener('shown.bs.tab', () => history.replaceState(null, '', el.getAttribute('href')));
  });
}

// Compartir Factura / Enlace
async function compartirEnlace(titulo, texto, url) {
  const shareUrl = url || window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({
        title: titulo || 'Lonja de Veracruz',
        text: texto || 'Comprobante de compra Lonja de Veracruz',
        url: shareUrl,
      });
      return;
    } catch (e) {
      // Si el usuario cancela no hacemos nada
      if (e.name === 'AbortError') return;
    }
  }

  // Fallback: Copiar al portapapeles
  try {
    await navigator.clipboard.writeText(shareUrl);
    alert('¡Enlace copiado al portapapeles con éxito!');
  } catch {
    prompt('Copia el siguiente enlace para compartir:', shareUrl);
  }
}

// ==========================================================================
// DINAMISMO EN REPORTE DIARIO (SIN BOTÓN VER, CON CALENDARIO INTELIGENTE)
// ==========================================================================
function inicializarReporteDinamico() {
  const inputFecha = document.getElementById('reporteFechaInput');
  const contenedorResultados = document.getElementById('reporteContenedorResultados');
  const listaFechasContenedor = document.getElementById('fechasConActividad');

  if (!inputFecha) return;

  // 1. Cargar días que tienen compras para que el usuario sepa qué días elegir
  fetch('/reportes/api/fechas-con-compras')
    .then((r) => r.json())
    .then((datos) => {
      if (!datos || !datos.fechas || !listaFechasContenedor) return;
      if (datos.fechas.length === 0) {
        listaFechasContenedor.innerHTML = '<span class="text-muted small">No hay compras registradas en el historial.</span>';
        return;
      }

      let html = '<div class="d-flex flex-wrap gap-1 align-items-center mb-3">';
      html += '<span class="small fw-bold text-muted me-2">Días con compras:</span>';
      datos.fechas.forEach((item) => {
        const esSeleccionado = item.fecha === inputFecha.value;
        const btnClase = esSeleccionado ? 'btn-primary' : 'btn-outline-primary';
        html += `<button type="button" class="btn btn-sm ${btnClase} py-0 px-2 rounded-pill" onclick="seleccionarFechaReporte('${item.fecha}')">
          ${item.fecha} <span class="badge bg-light text-dark rounded-pill ms-1">${item.total_compras}</span>
        </button>`;
      });
      html += '</div>';
      listaFechasContenedor.innerHTML = html;
    })
    .catch(() => {});

  // 2. Al cambiar la fecha en el input date, actualizar automáticamente sin botón "Ver"
  inputFecha.addEventListener('change', () => {
    cargarReportePorFecha(inputFecha.value);
  });
}

function seleccionarFechaReporte(fecha) {
  const input = document.getElementById('reporteFechaInput');
  if (input) {
    input.value = fecha;
    cargarReportePorFecha(fecha);
  }
}

function cargarReportePorFecha(fecha) {
  const contenedor = document.getElementById('reporteContenedorResultados');
  const linkCsv = document.getElementById('linkExportarCsv');
  const txtTituloFecha = document.getElementById('txtTituloFecha');

  if (linkCsv) linkCsv.href = `/reportes/diario.csv?fecha=${fecha}`;
  if (txtTituloFecha) txtTituloFecha.textContent = fecha;

  if (contenedor) {
    contenedor.style.opacity = '0.4';
    contenedor.style.pointerEvents = 'none';
  }

  fetch(`/reportes/api/diario?fecha=${fecha}`)
    .then((r) => r.json())
    .then((res) => {
      if (contenedor) {
        contenedor.style.opacity = '1';
        contenedor.style.pointerEvents = 'auto';
      }

      // Actualizar Métricas
      document.getElementById('metricaCompras').textContent = res.totales.compras;
      document.getElementById('metricaCajas').textContent = res.totales.cajas;
      document.getElementById('metricaKilos').textContent = res.totales.kilos.toFixed(2);
      document.getElementById('metricaTotal').textContent = res.totalesFormateados.total;

      // Actualizar Tabla de Detalle
      const tablaCuerpo = document.getElementById('reporteTablaCuerpo');
      const pieTotalCajas = document.getElementById('pieTotalCajas');
      const pieTotalKilos = document.getElementById('pieTotalKilos');
      const pieTotalDinero = document.getElementById('pieTotalDinero');
      const alertaSinCompras = document.getElementById('alertaSinCompras');
      const seccionTablas = document.getElementById('seccionTablasDetalle');

      if (!res.filas || res.filas.length === 0) {
        if (alertaSinCompras) alertaSinCompras.classList.remove('d-none');
        if (seccionTablas) seccionTablas.classList.add('d-none');
        return;
      }

      if (alertaSinCompras) alertaSinCompras.classList.add('d-none');
      if (seccionTablas) seccionTablas.classList.remove('d-none');

      if (tablaCuerpo) {
        let filasHtml = '';
        res.filas.forEach((f) => {
          filasHtml += `
            <tr>
              <td>${f.hora}</td>
              <td><span class="badge bg-secondary">#${f.lote}</span></td>
              <td><strong>${f.especies}</strong></td>
              <td>${f.comprador}</td>
              <td class="text-end">${f.cajas}</td>
              <td class="text-end">${f.kilos.toFixed(2)}</td>
              <td class="text-end text-muted">${res.totalesFormateados.monedaSimbolo}${f.precio_salida.toFixed(2)}</td>
              <td class="text-end fw-bold">${res.totalesFormateados.monedaSimbolo}${f.precio_final.toFixed(2)}</td>
              <td class="text-end text-primary fw-bold">${res.totalesFormateados.monedaSimbolo}${f.total.toFixed(2)}</td>
            </tr>
          `;
        });
        tablaCuerpo.innerHTML = filasHtml;
      }

      if (pieTotalCajas) pieTotalCajas.textContent = res.totales.cajas;
      if (pieTotalKilos) pieTotalKilos.textContent = res.totales.kilos.toFixed(2);
      if (pieTotalDinero) pieTotalDinero.textContent = res.totalesFormateados.total;

      // Actualizar Resumen por Comprador
      const resumenCuerpo = document.getElementById('reporteResumenCompradores');
      if (resumenCuerpo && res.resumen) {
        let resumenHtml = '';
        res.resumen.forEach((r) => {
          resumenHtml += `
            <tr>
              <td>${r.comprador}</td>
              <td class="text-end">${r.compras}</td>
              <td class="text-end">${r.kilos.toFixed(2)}</td>
              <td class="text-end fw-bold">${res.totalesFormateados.monedaSimbolo}${r.total.toFixed(2)}</td>
            </tr>
          `;
        });
        resumenCuerpo.innerHTML = resumenHtml;
      }

      // Actualizar botones de días activos
      inicializarReporteDinamico();
    })
    .catch((err) => {
      console.error(err);
      if (contenedor) {
        contenedor.style.opacity = '1';
        contenedor.style.pointerEvents = 'auto';
      }
    });
}

// ==========================================================================
// DINAMISMO EN FORMULARIO DE COMPRA (CÁLCULO EN VIVO DE KILOS Y TOTAL)
// ==========================================================================
function inicializarCalculadoraCompra() {
  const selectLote = document.getElementById('id_cmp');
  const inputPrecio = document.getElementById('precio_kilo_final');
  const cajaCalculo = document.getElementById('cajaCalculoEnVivo');
  const spanTotalCalculado = document.getElementById('totalCalculado');
  const spanKilos = document.getElementById('kilosLoteInfo');
  const spanDiferencia = document.getElementById('diferenciaSalida');

  if (!selectLote || !inputPrecio) return;

  function actualizarCalculo() {
    const opcion = selectLote.options[selectLote.selectedIndex];
    if (!opcion || !opcion.value) {
      if (cajaCalculo) cajaCalculo.classList.add('d-none');
      return;
    }

    const kilos = parseFloat(opcion.dataset.kilos || 0);
    const precioSalida = parseFloat(opcion.dataset.salida || 0);
    const precioFinal = parseFloat(inputPrecio.value || 0);

    if (spanKilos) spanKilos.textContent = `${kilos.toFixed(2)} kg`;

    if (precioFinal > 0 && kilos > 0) {
      const total = kilos * precioFinal;
      if (spanTotalCalculado) {
        spanTotalCalculado.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total);
      }

      if (spanDiferencia) {
        const diff = precioFinal - precioSalida;
        if (diff >= 0) {
          const pct = precioSalida > 0 ? ((diff / precioSalida) * 100).toFixed(1) : 0;
          spanDiferencia.innerHTML = `<span class="badge bg-success">+${pct}% sobre salida</span>`;
        } else {
          spanDiferencia.innerHTML = `<span class="badge bg-warning text-dark">Bajo salida (-$${Math.abs(diff).toFixed(2)})</span>`;
        }
      }

      if (cajaCalculo) cajaCalculo.classList.remove('d-none');
    } else {
      if (spanTotalCalculado) spanTotalCalculado.textContent = '$0.00';
    }
  }

  selectLote.addEventListener('change', () => {
    const opcion = selectLote.options[selectLote.selectedIndex];
    if (opcion && opcion.dataset.salida && !inputPrecio.value) {
      inputPrecio.value = opcion.dataset.salida;
    }
    actualizarCalculo();
  });

  inputPrecio.addEventListener('input', actualizarCalculo);

  // Inicializar en caso de edición
  actualizarCalculo();
}

// ==========================================================================
// ORDENAMIENTO DE TABLAS (.table-sortable) POR CUALQUIER COLUMNA
// - clic en el encabezado: ascendente; segundo clic: descendente
// - <td data-sort-value="..."> permite ordenar por un valor distinto al texto (fechas)
// - <th data-no-sort> excluye la columna
// ==========================================================================
function valorDeCelda(celda) {
  if (!celda) return '';
  return (celda.dataset.sortValue ?? celda.textContent).trim();
}

// "$1,234.50", "120.00 kg", "#15", "35%" -> número; cualquier otro texto -> NaN
function comoNumero(texto) {
  let limpio = texto.replace(/[\s$€#%]|kg|MXN|USD|EUR/gi, '');
  // Formato europeo "1.234,50" (moneda EUR) o con miles "1,234.50"
  if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(limpio)) limpio = limpio.replace(/\./g, '').replace(',', '.');
  else limpio = limpio.replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(limpio) ? parseFloat(limpio) : NaN;
}

function inicializarTablasOrdenables() {
  document.querySelectorAll('table.table-sortable').forEach((tabla) => {
    const tbody = tabla.tBodies[0];
    if (!tbody) return;
    const cabeceras = Array.from(tabla.querySelectorAll('thead th'));

    cabeceras.forEach((th, indice) => {
      if (th.hasAttribute('data-no-sort')) return;

      th.classList.add('th-ordenable');
      th.tabIndex = 0;
      th.setAttribute('role', 'button');
      th.setAttribute('aria-sort', 'none');
      th.title = 'Ordenar por ' + th.textContent.trim().toLowerCase();
      const indicador = document.createElement('span');
      indicador.className = 'sort-indicator';
      indicador.setAttribute('aria-hidden', 'true');
      th.appendChild(indicador);

      const ordenar = () => {
        const filas = Array.from(tbody.rows).filter((f) => !f.classList.contains('fila-vacia'));
        if (filas.length < 2) return;

        const asc = th.getAttribute('aria-sort') !== 'ascending';
        const valores = new Map(filas.map((f) => [f, valorDeCelda(f.cells[indice])]));
        const conDatos = [...valores.values()].filter((v) => v !== '' && v !== '—');
        const numerica = conDatos.length > 0 && conDatos.every((v) => !Number.isNaN(comoNumero(v)));

        filas.sort((a, b) => {
          const va = valores.get(a);
          const vb = valores.get(b);
          const num = (v) => { const n = comoNumero(v); return Number.isNaN(n) ? -Number.MAX_VALUE : n; };
          const r = numerica
            ? num(va) - num(vb)
            : va.localeCompare(vb, 'es', { numeric: true, sensitivity: 'base' });
          return asc ? r : -r;
        });

        cabeceras.forEach((otro) => { if (otro.hasAttribute('aria-sort')) otro.setAttribute('aria-sort', 'none'); });
        th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
        filas.forEach((f) => tbody.appendChild(f));
      };

      th.addEventListener('click', ordenar);
      th.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ordenar(); }
      });
    });
  });
}

// Confirmación declarativa: <form data-confirmar="¿Seguro?">
document.addEventListener('submit', (ev) => {
  const mensaje = ev.target.dataset && ev.target.dataset.confirmar;
  if (mensaje && !window.confirm(mensaje)) ev.preventDefault();
});

// Inicialización general al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  inicializarBannerCookies();
  inicializarPestanasPorHash();
  inicializarReporteDinamico();
  inicializarCalculadoraCompra();
  inicializarTablasOrdenables();
});

// Botones declarativos de preferencia: <button data-pref="idioma" data-valor="en">
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-pref]');
  if (btn) aplicarPreferencia(btn.dataset.pref, btn.dataset.valor);
});
