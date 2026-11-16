// BUSCADOR CON SUGERENCIAS (.barra-listado [data-buscador])
// - debounce 250 ms y AbortController para cancelar la petición anterior
// - combobox accesible: ↑/↓ mueven, Enter abre la opción activa (o envía el
//   formulario), Esc cierra; clic fuera cierra
// - el texto se pinta con textContent (nunca innerHTML con datos del servidor)
// ==========================================================================
export function inicializarBuscadores() {
  document.querySelectorAll('[data-buscador]').forEach((form) => {
    const input = form.querySelector('input[type="search"]');
    const lista = form.querySelector('[role="listbox"]');
    if (!input || !lista) return;

    const entidad = input.dataset.entidad;
    let controlador = null;
    let temporizador = null;
    let opciones = [];
    let activo = -1;

    const cerrar = () => {
      lista.hidden = true;
      lista.textContent = '';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      opciones = [];
      activo = -1;
    };

    // Construye el nodo con <mark> en la parte que coincide con el término.
    const resaltar = (texto, termino) => {
      const frag = document.createDocumentFragment();
      const bajo = texto.toLowerCase();
      const t = termino.toLowerCase();
      if (!t) {
        frag.append(document.createTextNode(texto));
        return frag;
      }
      let desde = 0;
      let pos = bajo.indexOf(t);
      while (pos !== -1) {
        frag.append(document.createTextNode(texto.slice(desde, pos)));
        const mark = document.createElement('mark');
        mark.textContent = texto.slice(pos, pos + t.length);
        frag.append(mark);
        desde = pos + t.length;
        pos = bajo.indexOf(t, desde);
      }
      frag.append(document.createTextNode(texto.slice(desde)));
      return frag;
    };

    const filaEstado = (texto) => {
      lista.textContent = '';
      const li = document.createElement('li');
      li.className = 'list-group-item small text-muted';
      li.textContent = texto;
      lista.append(li);
      lista.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      input.removeAttribute('aria-activedescendant');
      opciones = [];
      activo = -1;
    };

    const pintar = (datos) => {
      opciones = datos;
      activo = -1;
      lista.textContent = '';
      if (!datos.length) {
        filaEstado('Sin coincidencias');
        return;
      }
      datos.forEach((d, i) => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action py-2';
        li.id = `${lista.id}-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');

        const titulo = document.createElement('div');
        titulo.className = 'fw-semibold small';
        titulo.append(resaltar(d.titulo, input.value.trim()));

        const subtitulo = document.createElement('div');
        subtitulo.className = 'text-muted small';
        subtitulo.textContent = d.subtitulo || '';

        li.append(titulo, subtitulo);
        li.addEventListener('mousedown', (ev) => {
          ev.preventDefault();
          window.location.href = d.url;
        });
        lista.append(li);
      });
      lista.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      input.removeAttribute('aria-activedescendant');
    };

    const mover = (delta) => {
      if (!opciones.length) return;
      activo = (activo + delta + opciones.length) % opciones.length;
      [...lista.children].forEach((li, i) => {
        const seleccionado = i === activo;
        li.classList.toggle('active', seleccionado);
        li.setAttribute('aria-selected', seleccionado ? 'true' : 'false');
      });
      input.setAttribute('aria-activedescendant', `${lista.id}-${activo}`);
      lista.children[activo]?.scrollIntoView({ block: 'nearest' });
    };

    const buscar = async () => {
      const q = input.value.trim();
      if (q.length < 2) {
        cerrar();
        return;
      }
      controlador?.abort();
      controlador = new AbortController();
      filaEstado('Buscando…');
      try {
        const r = await fetch(`/buscar/sugerencias?entidad=${encodeURIComponent(entidad)}&q=${encodeURIComponent(q)}`, {
          headers: { Accept: 'application/json' },
          signal: controlador.signal,
        });
        if (!r.ok) {
          cerrar();
          return;
        }
        pintar(await r.json());
      } catch (e) {
        if (e.name !== 'AbortError') cerrar();
      }
    };

    input.addEventListener('input', () => {
      clearTimeout(temporizador);
      if (input.value.trim().length < 2) {
        controlador?.abort();
        cerrar();
        return;
      }
      temporizador = setTimeout(buscar, 250);
    });

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (lista.hidden) buscar();
        else mover(1);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        mover(-1);
      } else if (ev.key === 'Escape') {
        cerrar();
      } else if (ev.key === 'Enter' && activo >= 0) {
        ev.preventDefault();
        window.location.href = opciones[activo].url;
      }
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2 && !opciones.length) buscar();
    });

    document.addEventListener('click', (ev) => {
      if (!form.contains(ev.target)) cerrar();
    });
  });
}

// ==========================================================================
