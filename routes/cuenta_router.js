import express from "express";
import * as cuenta from "../controllers/cuentaController.js";
import * as direcciones from "../controllers/direccionController.js";
import * as pedidos from "../controllers/pedidoController.js";
import * as social from "../controllers/socialController.js";

const router = express.Router();

router.get("/", cuenta.resumen);
router.get("/datos", cuenta.verDatos);
router.post("/datos", cuenta.actualizarDatos);

router.get("/direcciones", direcciones.lista);
router.get("/direcciones/nueva", direcciones.verCrear);
router.post("/direcciones", direcciones.registrar);
router.get("/direcciones/:id/editar", direcciones.editar);
router.put("/direcciones/:id", direcciones.actualizar);
router.delete("/direcciones/:id", direcciones.eliminar);
router.post("/direcciones/:id/principal", direcciones.marcarPrincipal);

router.get("/pedidos", pedidos.listaCuenta);
router.get("/pedidos/:id", pedidos.detalleCuenta);
router.get("/pedidos/:id/factura/:id_cmp.pdf", pedidos.facturaCuentaPdf);
router.get("/pedidos/:id/factura/:id_cmp", pedidos.facturaCuenta);
router.get("/listas", social.listas);
router.post("/favoritos", social.guardarFavorito);
router.post("/listas", social.crearLista);
router.get("/listas/:id", social.detalleLista);
router.post("/listas/:id/items", social.agregarLista);
router.put("/listas/:id", social.renombrarLista);
router.delete("/listas/:id", social.borrarLista);
router.delete("/listas/:id/items", social.quitarItem);
router.get("/preguntas", social.misPreguntas);
router.get("/opiniones", social.misOpiniones);
router.delete("/opiniones/:id", social.borrarMiOpinion);

export default router;
