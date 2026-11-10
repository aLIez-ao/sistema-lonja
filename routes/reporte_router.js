import express from "express";
import { diario, diarioAPI, fechasConComprasAPI, diarioCsv } from "../controllers/reporteController.js";

const router = express.Router();

router.get("/diario", diario);
router.get("/diario.csv", diarioCsv);
router.get("/api/diario", diarioAPI);
router.get("/api/fechas-con-compras", fechasConComprasAPI);

export default router;
