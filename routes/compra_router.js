import express from "express";
import {
  reglasAlta,
  reglas,
  lista,
  verCrear,
  registrar,
  editar,
  actualizar,
  eliminar,
  verFactura,
  descargarFacturaPdf,
  enviarFacturaPorCorreo,
} from "../controllers/compraController.js";
import { permitir } from "../middleware/protegerRutas.js";

const router = express.Router();

router.get("/", lista);
router.get("/crear", verCrear);
router.post("/", reglasAlta, registrar);

// Factura, Descarga PDF y Envío de Correo
router.get("/:id/factura", verFactura);
router.get("/:id/factura.pdf", descargarFacturaPdf);
router.post("/:id/enviar-correo", enviarFacturaPorCorreo);

router.get("/:id/editar", editar);
router.put("/:id", reglas, actualizar);
router.delete("/:id", permitir("admin"), eliminar);

export default router;
