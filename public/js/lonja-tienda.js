/**
 * Tienda pública: héroe rotativo, filas deslizables, sugerencias del buscador
 * y avisos flotantes. El carrito usa peticiones JSON y conserva el flujo
 * accesible por formulario cuando JavaScript no está disponible.
 */
import { indiceSiguiente } from './tienda-utils.js';

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
    const region = heroe.closest('.tienda-heroe');
    const slides = qsa('.tienda-heroe__slide', heroe);
    const puntos = qsa('[data-heroe-punto]', heroe);
    if (slides.length < 2) return;

    const anterior = qs('[data-heroe-prev]', heroe);
    const siguiente = qs('[data-heroe-next]', heroe);
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
    let actual = Math.max(0, slides.findIndex((slide) => slide.classList.contains('activo')));
    let pausa = false;
    let temporizador;
    let inicioToque = null;

    const pintar = (indice) => {
      actual = (indice + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('activo', i === actual);
        slide.setAttribute('aria-hidden', i === actual ? 'false' : 'true');
      });
      puntos.forEach((punto, i) => {
        punto.classList.toggle('activo', i === actual);
        punto.setAttribute('aria-current', i === actual ? 'true' : 'false');
      });
    };
    const programar = () => {
      clearTimeout(temporizador);
      if (reducirMovimiento.matches || pausa || document.hidden) return;
      temporizador = setTimeout(() => { pintar(actual + 1); programar(); }, 6000);
    };
    const ir = (indice) => { pintar(indice); programar(); };
    const avanzar = (direccion) => ir(actual + direccion);

    anterior?.addEventListener('click', () => avanzar(-1));
    siguiente?.addEventListener('click', () => avanzar(1));
    puntos.forEach((punto) => punto.addEventListener('click', () => ir(Number(punto.dataset.heroePunto))));
    region?.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); avanzar(-1); }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); avanzar(1); }
    });
    heroe.addEventListener('mouseenter', () => { pausa = true; clearTimeout(temporizador); });
    heroe.addEventListener('mouseleave', () => { pausa = false; programar(); });
    heroe.addEventListener('focusin', () => { pausa = true; clearTimeout(temporizador); });
    heroe.addEventListener('focusout', (ev) => {
      if (!heroe.contains(ev.relatedTarget)) { pausa = false; programar(); }
    });
    heroe.addEventListener('touchstart', (ev) => { inicioToque = ev.changedTouches[0]?.clientX ?? null; }, { passive: true });
    heroe.addEventListener('touchend', (ev) => {
      if (inicioToque === null) return;
      const delta = (ev.changedTouches[0]?.clientX ?? inicioToque) - inicioToque;
      if (Math.abs(delta) >= 40) avanzar(delta < 0 ? 1 : -1);
      inicioToque = null;
    }, { passive: true });
    document.addEventListener('visibilitychange', programar);
    reducirMovimiento.addEventListener?.('change', programar);
    programar();
  }

  // ------------------------------------------------------------------
  // Filas: desplazamiento con los botones de flecha.
  // ------------------------------------------------------------------
  function iniciarFilas() {
    qsa('[data-fila]').forEach((fila) => {
      const pista = qs('[data-pista]', fila);
      if (!pista) return;
      const tarjetas = qsa(':scope > .lote-card', pista);
      const anterior = qs('[data-fila-prev]', fila);
      const siguiente = qs('[data-fila-next]', fila);
      if (!tarjetas.length || !anterior || !siguiente) return;
      const indiceVisible = () => {
        let mejor = 0;
        let distancia = Infinity;
        tarjetas.forEach((tarjeta, i) => {
          const x = tarjeta.offsetLeft - tarjetas[0].offsetLeft;
          const diferencia = Math.abs(x - pista.scrollLeft);
          if (diferencia < distancia) { distancia = diferencia; mejor = i; }
        });
        return mejor;
      };
      const actualizar = () => {
        const hayMas = pista.scrollWidth > pista.clientWidth + 2;
        anterior.hidden = siguiente.hidden = !hayMas;
        if (!hayMas) return;
        const indice = indiceVisible();
        const fin = indiceSiguiente(indice, tarjetas.length, 4, 1);
        anterior.disabled = indice <= 0;
        siguiente.disabled = fin === indice;
        anterior.setAttribute('aria-disabled', String(anterior.disabled));
        siguiente.setAttribute('aria-disabled', String(siguiente.disabled));
      };
      const mover = (direccion) => {
        const indice = indiceSiguiente(indiceVisible(), tarjetas.length, 4, direccion);
        if (indice < 0) return;
        pista.scrollTo({ left: tarjetas[indice].offsetLeft - tarjetas[0].offsetLeft, behavior: 'smooth' });
        setTimeout(actualizar, 350);
      };
      anterior.addEventListener('click', () => mover(-1));
      siguiente.addEventListener('click', () => mover(1));
      pista.addEventListener('scroll', actualizar, { passive: true });
      window.addEventListener('resize', actualizar);
      actualizar();
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
