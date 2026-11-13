import express from "express";
import {
  reglasLogin,
  login,
  credenciales,
  principal,
  cerrarsesion,
  verOlvidePassword,
  enviarRecuperacionPassword,
  verRestablecerPassword,
  restablecerPassword,
  verificarEmailToken,
} from "../controllers/loginController.js";
import rutaProteger, { permitir } from "../middleware/protegerRutas.js";
import { inicioSegun } from "../helpers/navegacion.js";

const router = express.Router();

router.get("/", login);
router.get("/acceso", login);
router.post("/credenciales", reglasLogin, credenciales);
// El tablero es solo para el personal; el comprador usa la tienda y su cuenta.
router.get("/inicio", rutaProteger, permitir("admin", "capturista"), principal);
router.post("/cerrarsesion", cerrarsesion);
router.get("/cerrarsesion", (req, res) => res.redirect(req.usuario ? inicioSegun(req.usuario) : "/"));

// Recuperación de Contraseña y Verificación de Email
router.get("/olvide-password", verOlvidePassword);
router.post("/olvide-password", enviarRecuperacionPassword);
router.get("/recuperar-password/:token", verRestablecerPassword);
router.post("/recuperar-password/:token", restablecerPassword);
router.get("/verificar-email/:token", verificarEmailToken);

export default router;
