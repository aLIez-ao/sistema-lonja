document.querySelectorAll('[data-tarjeta-prueba]').forEach((boton) => {
  boton.addEventListener('click', () => {
    const formulario = boton.closest('.card')?.querySelector('form[data-pago-simulado]');
    if (!formulario) return;
    formulario.elements.numero.value = boton.dataset.tarjetaPrueba;
    formulario.elements.mes.value = '12';
    formulario.elements.anio.value = String(new Date().getFullYear() + 2);
    formulario.elements.cvv.value = '123';
  });
});

const opcionesPago = document.querySelectorAll('[data-metodo-pago]');
const actualizarMetodo = () => {
  const metodo = document.querySelector('[data-metodo-pago]:checked')?.value || 'tarjeta';
  document.querySelectorAll('[data-panel-pago]').forEach((panel) => {
    panel.hidden = panel.dataset.panelPago !== metodo;
    panel.querySelectorAll('input').forEach((input) => {
      input.required = metodo === 'tarjeta';
    });
  });
  const boton = document.querySelector('[data-boton-pago]');
  if (boton) boton.textContent = boton.dataset[`texto${metodo[0].toUpperCase()}${metodo.slice(1)}`];
};
opcionesPago.forEach((radio) => radio.addEventListener('change', actualizarMetodo));
actualizarMetodo();

const salida = document.querySelector('[data-cuenta-regresiva]');
const reloj = document.querySelector('[data-reserva-hasta]');
if (salida && reloj) {
  const vence = new Date(reloj.dateTime || reloj.dataset.reservaHasta).getTime();
  const actualizar = () => {
    const segundos = Math.max(0, Math.floor((vence - Date.now()) / 1000));
    salida.textContent = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
    if (!segundos) window.location.reload();
  };
  actualizar();
  window.setInterval(actualizar, 1000);
}
