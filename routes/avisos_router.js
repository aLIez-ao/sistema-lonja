import express from "express";
import { bajaAvisos, confirmarBajaAvisos } from "../controllers/avisosController.js";

const router = express.Router();
router.get("/baja/:token", confirmarBajaAvisos);
router.post("/baja/:token", bajaAvisos);

export default router;
