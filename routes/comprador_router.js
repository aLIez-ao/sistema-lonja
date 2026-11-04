import express from "express";
import * as c from "../controllers/compradorController.js";
import { permitir } from "../middleware/protegerRutas.js";

const router = express.Router();
router.get("/", c.lista);
router.get("/crear", c.verCrear);
router.post("/", c.reglas, c.registrar);
router.get("/:id/editar", c.editar);
router.put("/:id", c.reglas, c.actualizar);
router.delete("/:id", permitir("admin"), c.eliminar); // solo el administrador borra

export default router;
