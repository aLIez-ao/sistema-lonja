import express from "express";
import * as c from "../controllers/pedidoController.js";

const router = express.Router();
router.get("/nuevo", c.verNuevo);
router.post("/", c.crear);
router.get("/:id/pago", c.verPago);
router.post("/:id/pagar", c.pagar);
router.post("/:id/cancelar", c.cancelar);

export default router;
