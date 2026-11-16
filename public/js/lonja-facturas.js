import { ajustarHojas } from './lonja-ventas.js';

// FACTURA EN MODAL (listado de compras)
// - El enlace conserva su href: sin JS, con clic central o Ctrl/Cmd+clic se
//   abre la página completa de la factura.
// - Con JS se pide ?parcial=1 y se inserta en un modal de Bootstrap.
// - El HTML se cachea en memoria por compra durante la visita.
// ==========================================================================
export function inicializarFacturaModal() {
  const modalEl = document.getElementById('modalFactura');
  if (!modalEl || typeof bootstrap === 'undefined') return;

  // El modal se mueve al body para que quede fuera de <main>: así la impresión
  // puede ocultar el resto de la página sin ocultar la factura.
  if (modalEl.parentElement !== document.body) document.body.append(modalEl);

  const modal = new bootstrap.Modal(modalEl);
  const cuerpo = modalEl.querySelector('[data-factura-cuerpo]');
  const titulo = modalEl.querySelector('.modal-title');
  const cache = new Map();
  let disparador = null;

  const mostrarError = (url) => {
    cuerpo.textContent = '';
    const alerta = document.createElement('div');
    alerta.className = 'alert alert-danger mb-0';
    alerta.append(document.createTextNode('No se pudo cargar la factura. '));
    const enlace = document.createElement('a');
    enlace.className = 'alert-link';
    enlace.href = url;
    enlace.textContent = 'Abrir en página';
    alerta.append(enlace, document.createTextNode('.'));
    cuerpo.append(alerta);
  };

  const cargar = async (url, id) => {
    cuerpo.textContent = '';
    const carga = document.createElement('div');
    carga.className = 'text-center text-muted py-5';
    carga.textContent = 'Cargando factura…';
    cuerpo.append(carga);

    try {
      let html = cache.get(id);
      if (!html) {
        const separador = url.includes('?') ? '&' : '?';
        const r = await fetch(`${url}${separador}parcial=1`, {
          headers: { Accept: 'text/html', 'X-Requested-With': 'fetch' },
          credentials: 'same-origin',
        });
        if (!r.ok) throw new Error(String(r.status));
        html = await r.text();
        cache.set(id, html);
      }
      cuerpo.innerHTML = html;
      const parcial = cuerpo.querySelector('.factura-parcial');
      if (parcial && parcial.dataset.folio) titulo.textContent = `Factura ${parcial.dataset.folio}`;
      ajustarHojas();
    } catch {
      mostrarError(url);
    }
  };

  document.addEventListener('click', (ev) => {
    const enlace = ev.target.closest('[data-factura-modal]');
    if (!enlace) return;
    // Clic central, Ctrl/Cmd/Shift o botón secundario: que el navegador abra el enlace.
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    disparador = enlace;
    titulo.textContent = 'Factura';
    modal.show();
    cargar(enlace.getAttribute('href'), enlace.dataset.id || enlace.getAttribute('href'));
  });

  modalEl.addEventListener('show.bs.modal', () => document.body.classList.add('imprimiendo-modal'));
  modalEl.addEventListener('shown.bs.modal', ajustarHojas);
  modalEl.addEventListener('hidden.bs.modal', () => {
    document.body.classList.remove('imprimiendo-modal');
    cuerpo.textContent = '';
    if (disparador) disparador.focus();
  });
}

// Si el navegador restaura una página protegida desde su caché de historial
// (botón Atrás después de cerrar sesión), se vuelve a pedir al servidor.
window.addEventListener('pageshow', (ev) => {
  if (ev.persisted && document.body.dataset.protegida === '1') window.location.reload();
});
