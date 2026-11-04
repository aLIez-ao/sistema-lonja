import express from "express";
import { reglasLogin, login, credenciales, principal, cerrarsesion } from "../controllers/loginController.js";
import rutaProteger from "../middleware/protegerRutas.js";

const router = express.Router();
router.get("/", login);
router.post("/credenciales", reglasLogin, credenciales);
router.get("/inicio", rutaProteger, principal);
router.get("/cerrarsesion", cerrarsesion);

export default router;
