/**
 * Tienda pública: héroe rotativo, filas deslizables, sugerencias del buscador
 * y avisos flotantes. El carrito usa peticiones JSON y conserva el flujo
 * accesible por formulario cuando JavaScript no está disponible.
 */
(function () {
  'use strict';

  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ------------------------------------------------------------------
  // Avisos flotantes
  // ------------------------------------------------------------------
  function aviso(texto) {
    const contenedor = qs('[data-toasts]');
    if (!contenedor) return;
    const caja = document.createElement('div');
    caja.className = 'tienda-toast';
    caja.setAttribute('role', 'status');
    caja.textContent = texto;
    contenedor.appendChild(caja);
    setTimeout(() => {
      caja.style.opacity = '0';
      caja.style.transition = 'opacity .25s ease';
      setTimeout(() => caja.remove(), 260);
    }, 3600);
  }

  // ------------------------------------------------------------------
  // Héroe: rota los destacados y sincroniza los puntos.
  // ------------------------------------------------------------------
  function iniciarHeroe() {
    const heroe = qs('[data-heroe]');
    if (!heroe) return;
    const slides = qsa('.tienda-heroe__slide', heroe);
    const puntos = qsa('.tienda-heroe__puntos span', heroe);
    if (slides.length < 2) return;

    let actual = 0;
    let pausado = false;
    heroe.addEventListener('mouseenter', () => { pausado = true; });
    heroe.addEventListener('mouseleave', () => { pausado = false; });
    heroe.addEventListener('focusin', () => { pausado = true; });
    heroe.addEventListener('focusout', () => { pausado = false; });

    setInterval(() => {
      if (pausado || document.hidden) return;
      slides[actual].classList.remove('activo');
      puntos[actual]?.classList.remove('activo');
      actual = (actual + 1) % slides.length;
      slides[actual].classList.add('activo');
      puntos[actual]?.classList.add('activo');
    }, 6000);
  }

  // ------------------------------------------------------------------
  // Filas: desplazamiento con los botones de flecha.
  // ------------------------------------------------------------------
  function iniciarFilas() {
    qsa('[data-fila]').forEach((fila) => {
      const pista = qs('[data-pista]', fila);
      if (!pista) return;
      qsa('[data-scroll]', fila).forEach((boton) => {
        boton.addEventListener('click', () => {
          const paso = Math.max(220, pista.clientWidth * 0.8);
          pista.scrollBy({ left: Number(boton.dataset.scroll || 1) * paso, behavior: 'smooth' });
        });
      });
    });
  }

  // ------------------------------------------------------------------
  // Carrito de compra.
  // ------------------------------------------------------------------
  function iniciarAcciones() {
    qsa('[data-agregar-lote]').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const id = boton.dataset.agregarLote;
        boton.disabled = true;
        try {
          const respuesta = await fetch(`/carrito/agregar/${encodeURIComponent(id)}`, {
            method: 'POST',
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: '{}',
          });
          const datos = await respuesta.json();
          if (typeof datos.cantidad === 'number') {
            qsa('[data-carrito-count]').forEach((n) => { n.textContent = datos.cantidad; });
          }
          aviso(datos.mensaje || 'No se pudo actualizar el carrito.');
        } catch {
          aviso('No pudimos conectar con el carrito. Inténtalo de nuevo.');
        } finally {
          boton.disabled = false;
        }
      });
    });

    qsa('form[data-carrito-accion]').forEach((form) => {
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const boton = qs('button[type="submit"]', form);
        if (boton) boton.disabled = true;
        try {
          const respuesta = await fetch(form.action, {
            method: 'POST',
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: '{}',
          });
          const datos = await respuesta.json();
          if (typeof datos.cantidad === 'number') qsa('[data-carrito-count]').forEach((n) => { n.textContent = datos.cantidad; });
          window.location.reload();
        } catch {
          form.submit();
        }
      });
    });

    qsa('[data-favorito]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const activo = boton.classList.toggle('activo');
        boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
        if (activo) aviso('Las listas de favoritos estarán disponibles muy pronto.');
        else aviso('Quitado de tu lista.');
      });
    });

    const orden = qs('[data-orden-tienda]');
    if (orden) {
      qsa('[data-orden], [data-dir]', orden).forEach((select) => {
        select.addEventListener('change', () => orden.submit());
      });
    }
  }

  // ------------------------------------------------------------------
  // Sugerencias del buscador público.
  // ------------------------------------------------------------------
  function iniciarSugerencias() {
    qsa('[data-buscador-tienda]').forEach((form) => {
      const input = qs('[data-sugerencias-tienda]', form);
      const lista = qs('[data-lista-sugerencias]', form);
      if (!input || !lista) return;

      let temporizador = null;
      let peticion = null;
      let indice = -1;
      let filas = [];

      const ocultar = () => {
        lista.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        indice = -1;
      };

      const resaltar = (n) => {
        filas.forEach((li, i) => li.classList.toggle('activo', i === n));
        input.setAttribute('aria-activedescendant', filas[n] ? filas[n].id : '');
      };

      const elegir = (n) => {
        const fila = filas[n];
        if (!fila) return;
        window.location.href = fila.dataset.url;
      };

      const pintar = (datos) => {
        lista.textContent = '';
        filas = [];
        if (!datos.length) {
          ocultar();
          return;
        }
        datos.forEach((dato, i) => {
          const li = document.createElement('li');
          li.id = `sugerenciaTienda${i}`;
          li.className = 'list-group-item';
          li.setAttribute('role', 'option');
          li.dataset.url = dato.url;

          const titulo = document.createElement('span');
          titulo.className = 'sugerencia-titulo';
          titulo.textContent = dato.titulo;

          const sub = document.createElement('span');
          sub.className = 'sugerencia-sub';
          sub.textContent = dato.subtitulo;

          li.append(titulo, sub);
          li.addEventListener('mousedown', (ev) => ev.preventDefault());
          li.addEventListener('click', () => elegir(i));
          lista.appendChild(li);
          filas.push(li);
        });
        lista.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      };

      input.addEventListener('input', () => {
        const texto = input.value.trim();
        clearTimeout(temporizador);
        if (texto.length < 2) {
          ocultar();
          return;
        }
        temporizador = setTimeout(async () => {
          try {
            peticion?.abort();
            peticion = new AbortController();
            const respuesta = await fetch(`/tienda/sugerencias?q=${encodeURIComponent(texto)}`, {
              signal: peticion.signal,
              headers: { accept: 'application/json' },
            });
            if (!respuesta.ok) return ocultar();
            pintar(await respuesta.json());
          } catch {
            /* petición cancelada o sin red: no se muestra nada */
          }
        }, 180);
      });

      input.addEventListener('keydown', (ev) => {
        if (lista.hidden || !filas.length) return;
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          indice = (indice + 1) % filas.length;
          resaltar(indice);
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          indice = (indice - 1 + filas.length) % filas.length;
          resaltar(indice);
        } else if (ev.key === 'Enter' && indice >= 0) {
          ev.preventDefault();
          elegir(indice);
        } else if (ev.key === 'Escape') {
          ocultar();
        }
      });

      input.addEventListener('blur', () => setTimeout(ocultar, 120));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    iniciarHeroe();
    iniciarFilas();
    iniciarAcciones();
    iniciarSugerencias();
  });
})();
