# 01 — Mapa del sistema y recorrido de una operación

## El sistema en una frase

Sistema Lonja es una aplicación web interna para registrar lotes de productos del mar, relacionarlos con sus especies, anotar quién los compra y consultar las ventas de un día.

## Traducción de términos

| Término | En palabras simples | En el código |
|---|---|---|
| Lote | La cantidad de producto que se recibe y ofrece como una unidad | `Lote` |
| Especie | Cada producto incluido en un lote | `Especie` |
| Tipo | Grupo general: pescado, marisco o molusco | `Tipo` |
| Comprador | Cliente que compra un lote | `Comprador` |
| Compra | Registro de que un comprador adquirió un lote a cierto precio | `Compra` |
| Usuario | Persona del personal que inicia sesión | `Usuario` |
| Ruta | Dirección de la aplicación, por ejemplo `/lotes` | router de Express |
| Vista | Página HTML que recibe la persona en el navegador | archivo `.ejs` |
| Controlador | Código que decide qué consultar, validar o mostrar | `controllers/` |
| Modelo | Definición que conecta código y tabla de base de datos | `models/` |

El **comprador** es un cliente de la lonja; el **usuario** es personal autorizado. Son registros distintos y no deben confundirse.

## Recorrido: registrar un lote y venderlo

1. El navegador solicita `/lotes/crear`.
2. Express comprueba la sesión y envía la petición al router de lotes.
3. El controlador devuelve `views/lotes/formulario.ejs`.
4. Al guardar, el router aplica validaciones y el controlador comprueba los datos.
5. El modelo `Lote` almacena kilos, cajas, precio inicial y fecha.
6. Tras guardarlo, la aplicación invita a añadir especies en `/especies/crear`.
7. Al registrar la compra, el controlador confirma que existan el lote y el comprador, y que el lote no esté vendido.
8. El servidor calcula el total: kilos del lote × precio final por kilo. No acepta un total calculado por el navegador.
9. La compra queda asociada al lote y al comprador. El reporte diario consulta esos datos y sus detalles.

## Recorrido: iniciar sesión

La persona envía usuario y contraseña. El servidor compara la contraseña con el hash guardado, crea un token firmado y lo entrega en una cookie protegida. En las visitas privadas, `middleware/protegerRutas.js` verifica el token y vuelve a consultar si la cuenta sigue activa. El rol determina si también puede borrar registros o administrar cuentas.

## Cómo se reparte el trabajo

```text
Navegador
  → app.js (configura Express y monta rutas)
  → routes/ (elige la operación y los permisos)
  → controllers/ (valida, consulta y toma decisiones)
  → models/ + config/db.js (lee o guarda datos)
  → views/ (presenta HTML) o respuesta CSV
```

Los módulos siguen el mismo patrón: una ruta llama un controlador, el controlador usa modelos y al final presenta una vista o redirige a otra página. Las plantillas de `views/plantillas/` evitan duplicar navegación, pie de página y mensajes.

## Dónde empezar según el cambio

| Quiero… | Revisa primero |
|---|---|
| Cambiar un campo de la base de datos | `models/` y `doc/02-base-de-datos.md` |
| Cambiar una regla al guardar | controlador y router del módulo |
| Cambiar una pantalla | vista del módulo y `views/plantillas/` |
| Cambiar quién puede hacer algo | `app.js`, router del módulo y `middleware/protegerRutas.js` |
| Cambiar el reporte | `controllers/reporteController.js` y `views/reportes/diario.ejs` |
| Cambiar fechas o moneda | `helpers/fechas.js` |
| Arrancar o cambiar conexión | `index.js`, `app.js`, `config/db.js`, `.env.example` |

## Alcance y reglas de negocio actuales

- Un lote puede tener varias especies.
- Cada lote puede tener como máximo una compra registrada.
- Solo `admin` puede borrar y administrar usuarios; ambos roles pueden capturar y consultar.
- Una vez comprado, el lote no se edita. La relación y los supuestos se explican con más detalle en `doc/02-base-de-datos.md` y `doc/reports/TODO.md`.
- El reporte diario agrupa por día según la zona horaria configurada.
