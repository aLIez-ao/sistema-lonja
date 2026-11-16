import { inicializarBannerCookies, inicializarPestanasPorHash } from './lonja-preferencias.js';
import { ajustarHojas, inicializarCalculadoraCompra, inicializarTablasOrdenables } from './lonja-ventas.js';
import { inicializarCamposFoto, inicializarPasswords } from './lonja-cuenta.js';
import { inicializarBuscadores } from './lonja-busqueda.js';
import { inicializarFacturaModal } from './lonja-facturas.js';

document.addEventListener('DOMContentLoaded', () => {
  inicializarBannerCookies();
  ajustarHojas();
  inicializarCamposFoto();
  inicializarPasswords();
  inicializarPestanasPorHash();
  inicializarCalculadoraCompra();
  inicializarTablasOrdenables();
  inicializarBuscadores();
  inicializarFacturaModal();
});
