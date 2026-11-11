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
  // Bootstrap 5.3 necesita data-bs-theme para cambiar su paleta (tablas, menús…)
  if (clave === 'tema') document.documentElement.setAttribute('data-bs-theme', valor === 'dark' ? 'dark' : 'light');

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

// Las hojas carta (factura, reportes) se reducen para caber en pantallas angostas
function ajustarHojas() {
  document.querySelectorAll('.hoja-visor').forEach((visor) => {
    const hoja = visor.querySelector('.hoja-carta');
    if (!hoja) return;
    hoja.style.zoom = 1;
    const escala = Math.min(1, visor.clientWidth / hoja.offsetWidth);
    hoja.style.zoom = escala < 1 ? escala : '';
  });
}
window.addEventListener('resize', ajustarHojas);
window.addEventListener('beforeprint', () => document.querySelectorAll('.hoja-carta').forEach((h) => { h.style.zoom = ''; }));
window.addEventListener('afterprint', ajustarHojas);

// Compartir declarativo: <button data-compartir data-titulo="..." data-texto="...">
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-compartir]');
  if (btn) compartirEnlace(btn.dataset.titulo, btn.dataset.texto, btn.dataset.url);
});

// Confirmación declarativa: <form data-confirmar="¿Seguro?">
document.addEventListener('submit', (ev) => {
  const mensaje = ev.target.dataset && ev.target.dataset.confirmar;
  if (mensaje && !window.confirm(mensaje)) ev.preventDefault();
});

// ==========================================================================
// FORMULARIOS DE CUENTA: foto de perfil, requisitos de contraseña y validación
// ==========================================================================

// Foto de perfil: se recorta al centro a 256x256 en el navegador y viaja como data URL en un campo oculto
function inicializarCamposFoto() {
  document.querySelectorAll('[data-campo-foto]').forEach((campo) => {
    const archivo = campo.querySelector('[data-foto-archivo]');
    const destino = campo.querySelector('[data-foto-data]');
    const vista = campo.querySelector('[data-foto-vista]');
    if (!archivo || !destino) return;

    archivo.addEventListener('change', () => {
      const f = archivo.files && archivo.files[0];
      destino.value = '';
      if (!f) return;
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        archivo.value = '';
        archivo.setCustomValidity('Elige una imagen JPG, PNG o WebP.');
        archivo.reportValidity();
        archivo.setCustomValidity('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const lado = Math.min(img.naturalWidth, img.naturalHeight);
        const lienzo = document.createElement('canvas');
        lienzo.width = lienzo.height = 256;
        lienzo.getContext('2d').drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 256, 256);
        destino.value = lienzo.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(img.src);
        const previa = document.createElement('img');
        previa.className = 'avatar-usuario avatar-lg';
        previa.alt = 'Vista previa de la foto';
        previa.src = destino.value;
        vista.replaceChildren(previa);
        const quitar = campo.querySelector('[name="foto_quitar"]');
        if (quitar) quitar.checked = false;
      };
      img.onerror = () => { archivo.value = ''; };
      img.src = URL.createObjectURL(f);
    });
  });
}

function inicializarPasswords() {
  // Mostrar / ocultar
  document.querySelectorAll('[data-ver-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.verPassword);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Requisitos en vivo y confirmación
  document.querySelectorAll('[data-password-nueva]').forEach((input) => {
    const lista = document.querySelector(`[data-requisitos-de="${input.id}"]`);
    const confirma = document.querySelector(`[data-confirma="${input.id}"]`);
    const reglas = {
      largo: (v) => v.length >= 8 && v.length <= 72,
      letra: (v) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(v),
      numero: (v) => /\d/.test(v),
    };
    const revisar = () => {
      const v = input.value;
      let todo = true;
      Object.entries(reglas).forEach(([regla, ok]) => {
        const cumple = ok(v);
        todo = todo && cumple;
        const li = lista && lista.querySelector(`[data-regla="${regla}"]`);
        if (li) li.classList.toggle('cumple', cumple);
      });
      input.setCustomValidity(v && !todo ? 'La contraseña no cumple los requisitos.' : '');
      if (confirma) confirma.setCustomValidity(confirma.value !== v ? 'Las contraseñas no coinciden.' : '');
    };
    input.addEventListener('input', revisar);
    if (confirma) confirma.addEventListener('input', revisar);
  });

  // Alta de usuario: la contraseña manual solo se pide si se eligió esa opción
  const bloque = document.querySelector('[data-bloque-password]');
  const opciones = document.querySelectorAll('[data-acceso]');
  const alternar = () => {
    const manual = document.querySelector('[data-acceso]:checked')?.value === 'manual';
    bloque.classList.toggle('d-none', !manual);
    bloque.querySelectorAll('input').forEach((i) => { i.required = manual; if (!manual) { i.value = ''; i.setCustomValidity(''); } });
  };
  if (bloque && opciones.length) {
    opciones.forEach((o) => o.addEventListener('change', alternar));
    alternar();
  }
}

// Validación con estilos de Bootstrap: <form novalidate data-validar>
document.addEventListener('submit', (ev) => {
  const form = ev.target;
  if (!form.matches || !form.matches('form[data-validar]')) return;
  if (!form.checkValidity()) {
    ev.preventDefault();
    ev.stopPropagation();
    const primero = form.querySelector(':invalid');
    if (primero) primero.focus();
  }
  form.classList.add('was-validated');
}, true);

// Inicialización general al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  inicializarBannerCookies();
  ajustarHojas();
  inicializarCamposFoto();
  inicializarPasswords();
  inicializarPestanasPorHash();
  inicializarCalculadoraCompra();
  inicializarTablasOrdenables();
});

// Botones declarativos de preferencia: <button data-pref="idioma" data-valor="en">
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-pref]');
  if (btn) aplicarPreferencia(btn.dataset.pref, btn.dataset.valor);
});
