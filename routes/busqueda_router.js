import express from "express";
import { sugerenciasBusqueda } from "../controllers/busquedaController.js";

const router = express.Router();

router.get("/sugerencias", sugerenciasBusqueda);

export default router;
