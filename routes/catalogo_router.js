import express from "express";
import * as c from "../controllers/catalogoController.js";
import { permitir } from "../middleware/protegerRutas.js";

const router = express.Router();
router.get("/", c.lista);
router.get("/crear", c.verCrear);
router.post("/", c.reglas, c.registrar);
router.get("/:id/editar", c.editar);
router.put("/:id", c.reglas, c.actualizar);
// Solo el administrador desactiva o reactiva el catálogo
router.delete("/:id", permitir("admin"), c.desactivar);
router.post("/:id/activar", permitir("admin"), c.reactivar);

export default router;
