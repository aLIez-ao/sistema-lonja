import express from "express";
import { diario, diarioCsv } from "../controllers/reporteController.js";

const router = express.Router();
router.get("/diario", diario);
router.get("/diario.csv", diarioCsv);

export default router;
