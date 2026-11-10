/**
 * Gráficas del sistema (Chart.js local en /vendor/chartjs).
 * Uso: <canvas data-grafica="barras" data-fuente="idDelJson" data-serie="importes" data-formato="dinero">
 * y un <script type="application/json" id="idDelJson"> con { etiquetas, <serie>: [...] , moneda }.
 * Una sola serie por gráfica y un solo eje; los colores salen del tema activo (variables CSS).
 */
(function () {
  if (!window.Chart) return;

  const css = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();

  function formateador(formato, moneda) {
    if (formato === 'dinero') {
      const m = moneda || { codigo: 'MXN', tasa: 1, locale: 'es-MX' };
      const completo = new Intl.NumberFormat(m.locale, { style: 'currency', currency: m.codigo });
      const corto = new Intl.NumberFormat(m.locale, { style: 'currency', currency: m.codigo, notation: 'compact', maximumFractionDigits: 1 });
      return { valor: (v) => completo.format(v * m.tasa), eje: (v) => corto.format(v * m.tasa) };
    }
    const n = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
    const c = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
    const sufijo = formato === 'kg' ? ' kg' : '';
    return { valor: (v) => n.format(v) + sufijo, eje: (v) => c.format(v) + sufijo };
  }

  const instancias = [];

  function crear(canvas) {
    const fuente = document.getElementById(canvas.dataset.fuente);
    if (!fuente) return;
    const datos = JSON.parse(fuente.textContent);
    const tipo = canvas.dataset.grafica; // barras | barras-h | linea
    const serie = datos[canvas.dataset.serie] || [];
    const etiquetas = datos[canvas.dataset.etiquetas || 'etiquetas'] || [];
    const fmt = formateador(canvas.dataset.formato, datos.moneda);
    const horizontal = tipo === 'barras-h';
    const color = css(canvas.dataset.color === 'secundario' ? '--lonja-teal' : '--lonja-navy');
    const tinta = css('--lonja-text-muted');
    const rejilla = css('--lonja-border');
    const superficie = css('--lonja-surface');

    const ejeValores = {
      beginAtZero: true,
      border: { display: false },
      grid: { color: rejilla, drawTicks: false },
      ticks: { color: tinta, maxTicksLimit: 5, padding: 6, callback: (v) => fmt.eje(v) },
    };
    const ejeCategorias = {
      border: { color: rejilla },
      grid: { display: false },
      ticks: { color: tinta, autoSkip: !horizontal, maxRotation: 0 },
    };

    const esLinea = tipo === 'linea';
    const grafica = new Chart(canvas, {
      type: esLinea ? 'line' : 'bar',
      data: {
        labels: etiquetas,
        datasets: [{
          label: canvas.dataset.titulo || '',
          data: serie,
          backgroundColor: esLinea ? color + '22' : color,
          borderColor: color,
          borderWidth: esLinea ? 2 : 0,
          borderRadius: esLinea ? 0 : 4,
          borderSkipped: 'start',
          maxBarThickness: horizontal ? 22 : 38,
          categoryPercentage: 0.82,
          barPercentage: 0.9,
          fill: esLinea,
          tension: 0.25,
          pointRadius: esLinea ? (serie.length > 45 ? 0 : 3) : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: superficie,
          pointBorderWidth: 2,
        }],
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' },
        plugins: {
          legend: { display: false }, // una sola serie: el título de la tarjeta la nombra
          tooltip: {
            displayColors: false,
            padding: 10,
            callbacks: { label: (ctx) => fmt.valor(horizontal ? ctx.parsed.x : ctx.parsed.y) },
          },
        },
        scales: horizontal ? { x: ejeValores, y: ejeCategorias } : { x: ejeCategorias, y: ejeValores },
      },
    });
    instancias.push({ grafica, canvas });
  }

  function iniciar() {
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 12;
    document.querySelectorAll('canvas[data-grafica]').forEach(crear);
  }

  // Si cambia el tema se vuelven a dibujar con los colores nuevos
  new MutationObserver(() => {
    instancias.splice(0).forEach(({ grafica }) => grafica.destroy());
    iniciar();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
