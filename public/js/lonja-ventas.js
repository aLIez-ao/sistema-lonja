import { compartirEnlace } from './lonja-preferencias.js';

// DINAMISMO EN FORMULARIO DE COMPRA (CÁLCULO EN VIVO DE KILOS Y TOTAL)
// ==========================================================================
export function inicializarCalculadoraCompra() {
  const selectLote = document.getElementById('id_cmp');
  const radiosLote = document.querySelectorAll('input[name="id_cmp"]:not([type="hidden"])');
  const inputPrecio = document.getElementById('precio_kilo_final');
  const cajaCalculo = document.getElementById('cajaCalculoEnVivo');
  const spanTotalCalculado = document.getElementById('totalCalculado');
  const spanKilos = document.getElementById('kilosLoteInfo');
  const spanDiferencia = document.getElementById('diferenciaSalida');

  if ((!selectLote && !radiosLote.length) || !inputPrecio) return;

  // La selección puede ser un <select> (versiones anteriores) o tarjetas con radios.
  const opcionActual = () => {
    if (selectLote && selectLote.tagName === 'SELECT') return selectLote.options[selectLote.selectedIndex];
    const elegido = document.querySelector('input[name="id_cmp"]:checked');
    return elegido ? { value: elegido.value, dataset: elegido.dataset } : null;
  };

  function actualizarCalculo() {
    const opcion = opcionActual();
    if (!opcion || !opcion.value) {
      if (cajaCalculo) cajaCalculo.classList.add('d-none');
      if (spanTotalCalculado) spanTotalCalculado.textContent = '$0.00';
      return;
    }

    const kilos = parseFloat(opcion.dataset.kilos || 0);
    const precioSalida = parseFloat(opcion.dataset.salida || 0);
    const precioFinal = parseFloat(inputPrecio.value || 0);

    if (spanKilos) spanKilos.textContent = `${kilos.toFixed(2)} kg`;

    if (precioFinal > 0 && kilos > 0) {
      const total = kilos * precioFinal;
      if (spanTotalCalculado) {
        spanTotalCalculado.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
          total,
        );
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

  const alCambiarLote = () => {
    const opcion = opcionActual();
    if (opcion && opcion.dataset.salida && !inputPrecio.value) {
      inputPrecio.value = opcion.dataset.salida;
    }
    actualizarCalculo();
  };

  if (selectLote && selectLote.tagName === 'SELECT') selectLote.addEventListener('change', alCambiarLote);
  radiosLote.forEach((radio) => radio.addEventListener('change', alCambiarLote));

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

export function inicializarTablasOrdenables() {
  // Las tablas con orden en el servidor (data-orden-servidor) no se reordenan
  // aquí: el orden completo vive en la URL.
  document.querySelectorAll('table.table-sortable:not([data-orden-servidor])').forEach((tabla) => {
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
          const num = (v) => {
            const n = comoNumero(v);
            return Number.isNaN(n) ? -Number.MAX_VALUE : n;
          };
          const r = numerica ? num(va) - num(vb) : va.localeCompare(vb, 'es', { numeric: true, sensitivity: 'base' });
          return asc ? r : -r;
        });

        cabeceras.forEach((otro) => {
          if (otro.hasAttribute('aria-sort')) otro.setAttribute('aria-sort', 'none');
        });
        th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
        filas.forEach((f) => tbody.appendChild(f));
      };

      th.addEventListener('click', ordenar);
      th.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          ordenar();
        }
      });
    });
  });
}

// Las hojas carta (factura, reportes) se reducen para caber en pantallas angostas
export function ajustarHojas() {
  document.querySelectorAll('.hoja-visor').forEach((visor) => {
    const hoja = visor.querySelector('.hoja-carta');
    if (!hoja) return;
    hoja.style.zoom = 1;
    const escala = Math.min(1, visor.clientWidth / hoja.offsetWidth);
    hoja.style.zoom = escala < 1 ? escala : '';
  });
}
window.addEventListener('resize', ajustarHojas);
window.addEventListener('beforeprint', () =>
  document.querySelectorAll('.hoja-carta').forEach((h) => {
    h.style.zoom = '';
  }),
);
window.addEventListener('afterprint', ajustarHojas);

// Compartir declarativo: <button data-compartir data-titulo="..." data-texto="...">
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-compartir]');
  if (btn) {
    const url = btn.dataset.url ? new URL(btn.dataset.url, window.location.origin).href : undefined;
    compartirEnlace(btn.dataset.titulo, btn.dataset.texto, url);
  }
});

// Confirmación declarativa: <form data-confirmar="¿Seguro?">
document.addEventListener('submit', (ev) => {
  const mensaje = ev.target.dataset && ev.target.dataset.confirmar;
  if (mensaje && !window.confirm(mensaje)) ev.preventDefault();
});

// ==========================================================================
