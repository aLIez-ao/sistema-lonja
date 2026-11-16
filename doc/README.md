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

Los planes, informes y listas de pendientes internos se mantienen en carpetas locales ignoradas; no forman parte de esta documentación versionada.

## Documentación de v1

La documentación incluida en la entrega v1 se recupera de forma estable desde la etiqueta `v1.0.0`; no hay una copia paralela dentro de este directorio. Para leer el índice de esa versión usa `git show v1.0.0:doc/README.md`; para recuperar todo su directorio de documentación usa `git archive v1.0.0 doc`. Los planes e informes locales no estaban incluidos en el commit de v1, así que no forman parte de esa entrega.

## Material de diseño

- [Diagrama DBML](sistema-lonja.dbml)
- [Diagrama SVG](sistema-lonja.svg)

Ver también el [README principal](../README.md).
