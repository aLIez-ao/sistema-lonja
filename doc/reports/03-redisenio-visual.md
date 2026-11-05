# Reporte: rediseño visual

Fecha: 5 de noviembre de 2026

## Objetivo

Dar al Sistema Lonja una presentación minimalista, sobria y empresarial, conservando Bootstrap y las vistas EJS existentes.

## Cambios realizados

- Se definió una paleta clara con azul marino, verde petróleo, grises neutros y bordes discretos.
- Se uniformaron tarjetas, botones, formularios, tablas, tipografía y estados de foco.
- Se ajustó la navegación compartida para usar fondo claro, mejor espaciado y jerarquía visual.
- Se refinó la pantalla de acceso y se reutilizó el logotipo del proyecto.
- Se mejoraron el ancho del contenido, el pie de página y las reglas de impresión y móvil.
- Se corrigió la ruta del favicon para que sea absoluta desde cualquier ruta.

## Archivos principales

- `public/css/lonja.css`
- `views/plantillas/header.ejs`
- `views/login/login.ejs`

## Commits

- `d9388c0` — `style: establish restrained enterprise visual system`
- `f404b94` — `style: refine shared navigation and login layout`

## Pendiente de verificación visual

- Revisar manualmente los flujos principales en escritorio y móvil, incluida la navegación colapsada.
- Revisar contraste y foco de teclado en las vistas completas.
- Validar impresión del reporte diario y del CSV desde un navegador real.

No se ejecutaron pruebas automatizadas en este avance, porque el cambio se limitó a presentación y plantillas.
