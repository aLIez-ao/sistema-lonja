import express from "express";
import { anual, anualPdf, reporteCsv } from "../controllers/reporteController.js";

const router = express.Router();

// /reportes/diario se conserva como dirección de entrada (enlaces y marcadores existentes)
router.get("/", (req, res) => res.redirect("/reportes/diario"));
router.get("/diario", anual);
router.get("/anual.pdf", anualPdf);
router.get("/diario.csv", reporteCsv);

export default router;
