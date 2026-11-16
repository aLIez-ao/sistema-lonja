document.querySelectorAll('input[name="entrega"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const panel = document.querySelector('[data-direccion-entrega]');
    if (panel) panel.hidden = radio.value !== 'domicilio' || !radio.checked;
    const url = new URL(window.location.href);
    url.searchParams.set('entrega', radio.value);
    window.location.href = url;
  });
});
