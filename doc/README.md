# Documentación del Sistema Lonja

Índice único para operación, comprensión del proyecto y seguimiento de trabajo. Empieza por la sección que corresponda a tu tarea.

## Referencia del sistema

| Documento | Contenido |
|---|---|
| [01 — Arquitectura](01-arquitectura.md) | Capas, arranque y recorrido de una petición |
| [02 — Base de datos](02-base-de-datos.md) | Tablas, relaciones, integridad y migraciones |
| [03 — Rutas y permisos](03-rutas-y-permisos.md) | Acceso por rol y áreas de la aplicación |
| [04 — Instalación y despliegue](04-instalacion-y-despliegue.md) | Requisitos, configuración y verificación |
| [05 — Seguridad](05-seguridad.md) | Controles implementados y límites conocidos |
| [06 — Pruebas](06-pruebas.md) | Cobertura, ejecución y límites de las pruebas |

## Guía del código

[Guía numerada](guia-codigo/README.md): explica qué logra cada capa, qué archivos colaboran y cómo seguir los recorridos desde la solicitud hasta la base de datos y la pantalla.

## Planes de trabajo

Los planes de trabajo se conservan en `doc/.plan/`. El plan 09 se dejó fuera de la ejecución; el plan 10 cubre la reorganización documental y la entrega v1.

## Informes y pendientes

- Informes de avance: `doc/.reports/`.
- Pendientes consolidados: [.reports/TODO.md](.reports/TODO.md).
- Informes anteriores de los planes 04 y 05: [plan 04](.reports/07-informe-plan-04.md) y [plan 05](.reports/08-informe-plan-05.md).

## Entrega congelada

[`entregas/v1/`](entregas/v1/) muestra directamente la carpeta `doc/` de la rama local `entrega/v1`; no es una segunda copia. Para abrirla se usa un worktree local.

## Material de diseño

- [Diagrama DBML](sistema-lonja.dbml)
- [Diagrama SVG](sistema-lonja.svg)

Ver también el [README principal](../README.md).
