import express from "express";
import * as c from "../controllers/carritoController.js";

const router = express.Router();
router.get("/", c.verCarrito);
router.post("/agregar/:id_lte", c.agregar);
router.post("/quitar/:id_lte", c.quitar);
router.post("/vaciar", c.vaciar);

export default router;
