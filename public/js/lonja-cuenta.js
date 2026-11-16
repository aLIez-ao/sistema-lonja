// FORMULARIOS DE CUENTA: foto de perfil, requisitos de contraseña y validación
// ==========================================================================

// Foto de perfil: se recorta al centro a 256x256 en el navegador y viaja como data URL en un campo oculto
export function inicializarCamposFoto() {
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
        lienzo
          .getContext('2d')
          .drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 256, 256);
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
      img.onerror = () => {
        archivo.value = '';
      };
      img.src = URL.createObjectURL(f);
    });
  });
}

export function inicializarPasswords() {
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
    bloque.querySelectorAll('input').forEach((i) => {
      i.required = manual;
      if (!manual) {
        i.value = '';
        i.setCustomValidity('');
      }
    });
  };
  if (bloque && opciones.length) {
    opciones.forEach((o) => o.addEventListener('change', alternar));
    alternar();
  }
}

// Validación con estilos de Bootstrap: <form novalidate data-validar>
document.addEventListener(
  'submit',
  (ev) => {
    const form = ev.target;
    if (!form.matches || !form.matches('form[data-validar]')) return;
    if (!form.checkValidity()) {
      ev.preventDefault();
      ev.stopPropagation();
      const primero = form.querySelector(':invalid');
      if (primero) primero.focus();
    }
    form.classList.add('was-validated');
  },
  true,
);

// ==========================================================================
