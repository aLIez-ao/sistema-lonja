import { body } from 'express-validator';

export const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PATRON_TELEFONO = /^[0-9+() -]{7,20}$/;

export const correoValido = (valor) => PATRON_CORREO.test(String(valor ?? '').trim());
export const telefonoValido = (valor) => PATRON_TELEFONO.test(String(valor ?? '').trim());

export const reglaCorreo = (campo = 'correo') =>
  body(campo).trim().isEmail().withMessage('Escribe un correo electrónico válido');

export const reglaTelefono = (campo = 'telefono') =>
  body(campo)
    .trim()
    .optional({ values: 'falsy' })
    .matches(PATRON_TELEFONO)
    .withMessage('Teléfono: entre 7 y 20 caracteres (dígitos, espacios, +, paréntesis o guiones)');
