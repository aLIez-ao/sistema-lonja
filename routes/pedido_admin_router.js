import express from "express";
import * as c from "../controllers/pedidoAdminController.js";
const router = express.Router();
router.get("/", c.lista);
router.get("/:id", c.detalle);
router.post("/:id/estado", c.cambiarEstado);
export default router;
