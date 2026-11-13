# Guía del código

Esta carpeta explica **cómo funciona cada archivo de código**, cómo se conectan las piezas y dónde empezar al hacer un cambio. Está pensada para dos lectores: quien necesita entender el sistema sin programar y quien va a mantenerlo o ampliarlo.

## Ruta de lectura

1. [01 — Mapa del sistema y recorrido de una operación](01-mapa-y-flujos.md): conceptos cotidianos, módulos y pasos de una compra.
2. [02 — Arranque y configuración](02-arranque-y-configuracion.md): cómo se inicia el servidor y se conecta a la base de datos.
3. [03 — Modelos y relaciones](03-modelos-y-relaciones.md): qué representa cada tabla y archivo de `models/`.
4. [04 — Seguridad y utilidades](04-seguridad-y-utilidades.md): sesión, permisos, fechas, mensajes y datos iniciales.
5. [05 — Controladores de acceso y reportes](05-controladores-acceso-reportes.md): login, página principal y reporte diario.
6. [06 — Controladores de catálogos y operaciones](06-controladores-operaciones.md): tipos, compradores, lotes, especies, compras y usuarios.
7. [07 — Rutas y permisos](07-rutas.md): direcciones web y a qué función llevan.
8. [08 — Vistas y presentación](08-vistas-y-estilos.md): cada pantalla EJS, las plantillas compartidas y CSS.
9. [09 — Ejemplo y pruebas](09-demo-y-pruebas.md): datos demostrativos, prueba de flujo y guía para probar localmente.

## Cómo leer las fichas

- **En palabras simples** explica el propósito sin exigir conocimientos de programación.
- **Para trabajo técnico** indica entradas, salidas, dependencias o reglas que conviene respetar al modificarlo.
- Las rutas de archivos son relativas a la raíz del proyecto, por ejemplo `controllers/compraController.js`.

## Límite de esta guía

Describe el código que existe en el repositorio. La configuración real (`.env`) y la base de datos de cada instalación pueden variar; usa `.env.example` como referencia y no compartas contraseñas. Bootstrap está instalado como dependencia y Express lo sirve directamente desde `node_modules`; esos archivos de terceros no se explican uno por uno.

Para arquitectura resumida, instalación, seguridad y pruebas, consulta también la [documentación del proyecto](../doc/README.md) y el [README principal](../README.md).
