import express from "express";
import * as c from "../controllers/usuarioController.js";

// Todo este router se monta con permitir("admin") en app.js
const router = express.Router();
router.get("/", c.lista);
router.get("/crear", c.verCrear);
router.post("/", c.reglas, c.registrar);
router.get("/:id/editar", c.editar);
router.put("/:id", c.reglas, c.actualizar);
router.post("/:id/restablecer", c.enviarRestablecimiento);
router.delete("/:id", c.eliminar);

export default router;
