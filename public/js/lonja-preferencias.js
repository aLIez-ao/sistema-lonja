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
    .finally(() => {
      if (recargar) location.reload();
    });
}

// --------------------------------------------------------------------------
// CONSENTIMIENTO DE COOKIES (banner)
// --------------------------------------------------------------------------
export function inicializarBannerCookies() {
  const banner = document.getElementById('cookieConsentBanner');
  if (!banner) return;

  const enviar = (datos) =>
    postJSON('/configuracion/cookies', datos)
      .then((r) => {
        if (r.ok) banner.remove();
      })
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
export function inicializarPestanasPorHash() {
  const abrir = () => {
    if (!location.hash || !window.bootstrap) return;
    const disparador = document.querySelector(
      `[data-bs-toggle="list"][href="${CSS.escape ? '#' + CSS.escape(location.hash.slice(1)) : location.hash}"]`,
    );
    if (disparador) bootstrap.Tab.getOrCreateInstance(disparador).show();
  };
  abrir();
  window.addEventListener('hashchange', abrir);
  document.querySelectorAll('[data-bs-toggle="list"]').forEach((el) => {
    el.addEventListener('shown.bs.tab', () => history.replaceState(null, '', el.getAttribute('href')));
  });
}

// Compartir Factura / Enlace
export async function compartirEnlace(titulo, texto, url) {
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

// Botones declarativos de preferencia: <button data-pref="idioma" data-valor="en">
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-pref]');
  if (btn) aplicarPreferencia(btn.dataset.pref, btn.dataset.valor);
});

document.addEventListener('change', (ev) => {
  const control = ev.target.closest('[data-preferencia]');
  if (control) aplicarPreferencia(control.dataset.preferencia, control.value);
});
