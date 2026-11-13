import express from "express";
import { verRegistro, registrar } from "../controllers/registroController.js";

const router = express.Router();
router.get("/", verRegistro);
router.post("/", registrar);

export default router;
