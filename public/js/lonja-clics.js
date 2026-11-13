/**
 * Componentes de formularios "por clics" (Fase 1).
 * Los campos reales (input/select/checkbox/radio) siguen existiendo y siendo
 * operables con teclado; este archivo solo agrega atajos visuales.
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Imágenes: reduce la foto en el navegador y la deja en un campo oculto.
  // ------------------------------------------------------------------
  function reducirImagen(archivo, maxLado = 720, calidad = 0.82) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) {
        reject(new Error('Elige una imagen JPG, PNG o WebP.'));
        return;
      }
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.max(1, Math.round(img.naturalWidth * escala));
        lienzo.height = Math.max(1, Math.round(img.naturalHeight * escala));
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
        URL.revokeObjectURL(url);
        resolve(lienzo.toDataURL('image/jpeg', calidad));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('El archivo no es una imagen válida.'));
      };
      img.src = url;
    });
  }

  function inicializarCamposImagen() {
    document.querySelectorAll('[data-campo-imagen]').forEach((campo) => {
      const archivo = campo.querySelector('[data-imagen-archivo]');
      const destino = campo.querySelector('[data-imagen-data]');
      const vista = campo.querySelector('[data-imagen-vista]');
      if (!archivo || !destino) return;

      archivo.addEventListener('change', async () => {
        const f = archivo.files && archivo.files[0];
        if (!f) return;
        try {
          destino.value = await reducirImagen(f);
          if (vista) {
            vista.replaceChildren();
            const previa = document.createElement('img');
            previa.src = destino.value;
            previa.alt = 'Vista previa de la imagen';
            vista.append(previa);
          }
          const quitar = campo.querySelector('[name="imagen_quitar"]');
          if (quitar) quitar.checked = false;
        } catch (e) {
          archivo.value = '';
          archivo.setCustomValidity(e.message);
          archivo.reportValidity();
          archivo.setCustomValidity('');
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // Tarjetas seleccionables: la casilla/radio real vive dentro del label.
  // ------------------------------------------------------------------
  function inicializarTarjetas() {
    document.querySelectorAll('[data-tarjeta]').forEach((tarjeta) => {
      const control = tarjeta.querySelector('input[type="checkbox"], input[type="radio"]');
      if (!control) return;
      const pintar = () => {
        tarjeta.classList.toggle('tarjeta-seleccionada', control.checked);
        tarjeta.setAttribute('aria-pressed', control.checked ? 'true' : 'false');
      };
      control.addEventListener('change', pintar);
      pintar();
    });

    // Las agrupaciones de radios solo permiten una tarjeta marcada.
    document.querySelectorAll('[data-tarjetas-radio]').forEach((grupo) => {
      grupo.querySelectorAll('input[type="radio"]').forEach((radio) => {
        radio.addEventListener('change', () => {
          grupo.querySelectorAll('[data-tarjeta]').forEach((t) => {
            const c = t.querySelector('input[type="radio"], input[type="checkbox"]');
            t.classList.toggle('tarjeta-seleccionada', Boolean(c && c.checked));
            t.setAttribute('aria-pressed', c && c.checked ? 'true' : 'false');
          });
        });
      });
    });
  }

  // ------------------------------------------------------------------
  // Controles segmentados (opciones cortas con radios reales)
  // ------------------------------------------------------------------
  function inicializarSegmentados() {
    document.querySelectorAll('.segmentado').forEach((grupo) => {
      const pintar = () => {
        grupo.querySelectorAll('label').forEach((label) => {
          const radio = label.querySelector('input[type="radio"]');
          label.classList.toggle('segmentado-activo', Boolean(radio && radio.checked));
        });
      };
      grupo.addEventListener('change', pintar);
      pintar();
    });
  }

  // ------------------------------------------------------------------
  // Numéricos: botones ±, chips de valores rápidos y teclado en pantalla.
  // ------------------------------------------------------------------
  function inicializarNumericos() {
    document.querySelectorAll('input[type="number"][data-pasos]').forEach((input) => {
      const paso = Number(input.dataset.pasos) || 1;
      const decimales = String(input.dataset.pasos || '').includes('.') ? 2 : 0;
      const ajustar = (delta) => {
        const actual = Number(input.value || 0);
        input.value = (actual + delta).toFixed(decimales);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const menos = document.createElement('button');
      menos.type = 'button';
      menos.className = 'btn btn-outline-secondary boton-paso';
      menos.textContent = '−';
      menos.setAttribute('aria-label', 'Disminuir ' + (input.labels?.[0]?.textContent || input.name));
      menos.addEventListener('click', () => ajustar(-paso));

      const mas = document.createElement('button');
      mas.type = 'button';
      mas.className = 'btn btn-outline-secondary boton-paso';
      mas.textContent = '+';
      mas.setAttribute('aria-label', 'Aumentar ' + (input.labels?.[0]?.textContent || input.name));
      mas.addEventListener('click', () => ajustar(paso));

      input.classList.add('con-pasos');
      input.insertAdjacentElement('beforebegin', menos);
      input.insertAdjacentElement('afterend', mas);

      if (input.dataset.rapidos) {
        const chips = document.createElement('div');
        chips.className = 'valores-rapidos';
        input.dataset.rapidos.split(',').map((v) => v.trim()).filter(Boolean).forEach((valor) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'chip-valor';
          chip.textContent = valor;
          chip.addEventListener('click', () => {
            input.value = valor;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
          chips.append(chip);
        });
        mas.insertAdjacentElement('afterend', chips);
      }

      if (input.hasAttribute('data-teclado')) {
        const abrir = document.createElement('button');
        abrir.type = 'button';
        abrir.className = 'btn btn-sm btn-outline-secondary boton-teclado';
        abrir.textContent = '⌨ Teclado';
        abrir.setAttribute('aria-expanded', 'false');
        const panel = crearTeclado(input, () => abrir.setAttribute('aria-expanded', 'false'));
        abrir.addEventListener('click', () => {
          const visible = panel.classList.toggle('abierto');
          abrir.setAttribute('aria-expanded', visible ? 'true' : 'false');
          if (visible) panel.querySelector('button').focus();
        });
        input.insertAdjacentElement('afterend', abrir);
        input.insertAdjacentElement('afterend', panel);
      }
    });

    // Botones que copian un valor sugerido a otro campo: data-poner="#id" data-valor="45.00"
    document.querySelectorAll('[data-poner]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const destino = document.querySelector(boton.dataset.poner);
        if (!destino) return;
        destino.value = boton.dataset.valor || boton.textContent.trim();
        destino.dispatchEvent(new Event('input', { bubbles: true }));
        destino.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  function crearTeclado(input, alCerrar) {
    const panel = document.createElement('div');
    panel.className = 'teclado-emergente';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Teclado numérico');

    const pantalla = document.createElement('output');
    pantalla.className = 'teclado-pantalla';
    pantalla.textContent = input.value || '0';
    panel.append(pantalla);

    const teclas = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '⌫'];
    const cuadricula = document.createElement('div');
    cuadricula.className = 'teclado-teclas';
    teclas.forEach((tecla) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = tecla;
      b.addEventListener('click', () => {
        if (tecla === '⌫') input.value = input.value.slice(0, -1);
        else input.value = (input.value === '0' && tecla !== '.' ? '' : input.value) + tecla;
        pantalla.textContent = input.value || '0';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      cuadricula.append(b);
    });
    panel.append(cuadricula);

    const acciones = document.createElement('div');
    acciones.className = 'teclado-acciones';
    const limpiar = document.createElement('button');
    limpiar.type = 'button';
    limpiar.textContent = 'Limpiar';
    limpiar.addEventListener('click', () => {
      input.value = '';
      pantalla.textContent = '0';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const listo = document.createElement('button');
    listo.type = 'button';
    listo.className = 'btn btn-primary btn-sm';
    listo.textContent = 'Listo';
    listo.addEventListener('click', () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      panel.classList.remove('abierto');
      alCerrar();
      input.focus();
    });
    acciones.append(limpiar, listo);
    panel.append(acciones);
    return panel;
  }

  // ------------------------------------------------------------------
  // Combobox con buscador para listas largas (compradores, municipios…)
  // ------------------------------------------------------------------
  function inicializarCombobox() {
    document.querySelectorAll('[data-combobox]').forEach((caja) => {
      const select = caja.querySelector('select');
      if (!select) return;
      const buscador = document.createElement('input');
      buscador.type = 'search';
      buscador.className = 'form-control form-control-sm mb-1';
      buscador.placeholder = caja.dataset.placeholder || 'Buscar…';
      buscador.setAttribute('autocomplete', 'off');
      buscador.setAttribute('aria-label', caja.dataset.placeholder || 'Buscar opción');

      const lista = document.createElement('div');
      lista.className = 'combobox-lista';
      lista.setAttribute('role', 'listbox');

      const opciones = Array.from(select.options).filter((o) => o.value);
      const pintar = (filtro = '') => {
        lista.replaceChildren();
        const t = filtro.trim().toLowerCase();
        opciones
          .filter((o) => !t || o.textContent.toLowerCase().includes(t))
          .slice(0, 80)
          .forEach((o) => {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'combobox-opcion' + (String(select.value) === String(o.value) ? ' activa' : '');
            boton.textContent = o.textContent;
            boton.setAttribute('role', 'option');
            boton.addEventListener('click', () => {
              select.value = o.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              buscador.value = '';
              pintar();
              lista.classList.remove('abierto');
            });
            lista.append(boton);
          });
        if (!lista.children.length) {
          const vacio = document.createElement('div');
          vacio.className = 'text-muted small p-2';
          vacio.textContent = 'Sin coincidencias';
          lista.append(vacio);
        }
      };

      buscador.addEventListener('focus', () => { lista.classList.add('abierto'); pintar(buscador.value); });
      buscador.addEventListener('input', () => pintar(buscador.value));
      select.addEventListener('change', () => pintar(buscador.value));
      document.addEventListener('click', (ev) => {
        if (!caja.contains(ev.target)) lista.classList.remove('abierto');
      });

      caja.classList.add('combobox');
      select.classList.add('combobox-select');
      select.insertAdjacentElement('beforebegin', buscador);
      buscador.insertAdjacentElement('afterend', lista);
      pintar();

      // Mantener sincronizado el texto visible al elegir con el teclado.
      buscador.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const primera = lista.querySelector('button');
          if (primera) primera.click();
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // Filtrado local de tarjetas (buscador + chips de tipo)
  // ------------------------------------------------------------------
  function inicializarFiltroTarjetas() {
    document.querySelectorAll('[data-filtro-tarjetas]').forEach((caja) => {
      const buscador = caja.querySelector('[data-filtro-texto]');
      const chips = Array.from(caja.querySelectorAll('[data-filtro-tipo]'));
      const tarjetas = () => Array.from(caja.querySelectorAll('[data-tarjeta]'));
      let tipo = '';

      const aplicar = () => {
        const t = (buscador?.value || '').trim().toLowerCase();
        tarjetas().forEach((tarjeta) => {
          const nombre = (tarjeta.dataset.nombre || tarjeta.textContent || '').toLowerCase();
          const tipoTarjeta = tarjeta.dataset.tipo || '';
          const visible = (!t || nombre.includes(t)) && (!tipo || tipoTarjeta === tipo);
          tarjeta.hidden = !visible;
        });
        const vacio = caja.querySelector('[data-sin-tarjetas]');
        if (vacio) vacio.hidden = tarjetas().some((t2) => !t2.hidden);
      };

      buscador?.addEventListener('input', aplicar);
      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          tipo = chip.dataset.filtroTipo || '';
          chips.forEach((c) => c.classList.toggle('activo', c === chip));
          chip.setAttribute('aria-pressed', 'true');
          chips.filter((c) => c !== chip).forEach((c) => c.setAttribute('aria-pressed', 'false'));
          aplicar();
        });
      });
      aplicar();
    });
  }

  // ------------------------------------------------------------------
  // Modal "Nueva especie" del formulario de lote: crea en el catálogo por
  // fetch y deja la tarjeta seleccionada sin recargar.
  // ------------------------------------------------------------------
  function inicializarNuevaEspecie() {
    const formulario = document.querySelector('[data-form-nueva-especie]');
    if (!formulario) return;
    const modalEl = formulario.closest('.modal');
    const errores = formulario.querySelector('[data-errores-especie]');

    formulario.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (errores) {
        errores.textContent = '';
        errores.hidden = true;
      }
      const boton = formulario.querySelector('[type="submit"]');
      if (boton) boton.disabled = true;
      try {
        const datos = new FormData(formulario);
        const r = await fetch('/catalogo', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
          body: new URLSearchParams(datos),
        });
        const cuerpo = await r.json().catch(() => ({}));
        if (!r.ok || !cuerpo.ok) throw new Error((cuerpo.errores || ['No se pudo crear la especie']).join(' '));

        const e = cuerpo.especie;
        const contenedor = document.querySelector('[data-tarjetas-especies]');
        if (contenedor) {
          const tarjeta = document.createElement('label');
          tarjeta.className = 'tarjeta-especie tarjeta-seleccionada';
          tarjeta.dataset.tarjeta = '';
          tarjeta.dataset.nombre = e.nombre;
          tarjeta.dataset.tipo = e.tipo;
          tarjeta.setAttribute('aria-pressed', 'true');
          tarjeta.innerHTML = `
            <input type="checkbox" name="especies" value="${e.id_cat}" checked class="tarjeta-control">
            <span class="tarjeta-imagen">${e.imagen ? `<img src="${e.imagen}" alt="">` : '<span class="sin-imagen">🐟</span>'}</span>
            <span class="tarjeta-nombre"></span>
            <span class="tarjeta-tipo"></span>`;
          tarjeta.querySelector('.tarjeta-nombre').textContent = e.nombre;
          tarjeta.querySelector('.tarjeta-tipo').textContent = e.tipo;
          const control = tarjeta.querySelector('input');
          control.addEventListener('change', () => {
            tarjeta.classList.toggle('tarjeta-seleccionada', control.checked);
            tarjeta.setAttribute('aria-pressed', control.checked ? 'true' : 'false');
          });
          contenedor.prepend(tarjeta);
        }
        formulario.reset();
        const vista = formulario.querySelector('[data-imagen-vista]');
        if (vista) vista.textContent = 'Sin imagen';
        if (modalEl && window.bootstrap) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      } catch (error) {
        if (errores) {
          errores.textContent = error.message;
          errores.hidden = false;
        }
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------
  // Validación de "al menos una especie" (el servidor también lo valida)
  // ------------------------------------------------------------------
  function inicializarRequiereEspecies() {
    document.querySelectorAll('form[data-requiere-especies]').forEach((form) => {
      form.addEventListener('submit', (ev) => {
        const marcadas = form.querySelectorAll('input[name="especies"]:checked');
        const aviso = form.querySelector('[data-error-especies]');
        if (marcadas.length) {
          if (aviso) aviso.classList.add('d-none');
          return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        if (aviso) {
          aviso.classList.remove('d-none');
          aviso.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    inicializarCamposImagen();
    inicializarTarjetas();
    inicializarSegmentados();
    inicializarNumericos();
    inicializarCombobox();
    inicializarFiltroTarjetas();
    inicializarNuevaEspecie();
    inicializarRequiereEspecies();
  });
})();
