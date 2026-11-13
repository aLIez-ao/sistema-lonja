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

const router = express.Router();

// La portada (/) es la tienda pública; el formulario de acceso vive en /acceso.
router.get("/acceso", login);
router.post("/credenciales", reglasLogin, credenciales);
// El tablero es solo para el personal; el comprador usa la tienda y su cuenta.
router.get("/inicio", rutaProteger, permitir("admin", "capturista"), principal);
router.post("/cerrarsesion", cerrarsesion);
router.get("/cerrarsesion", (req, res) => res.redirect("/"));

// Recuperación de Contraseña y Verificación de Email
router.get("/olvide-password", verOlvidePassword);
router.post("/olvide-password", enviarRecuperacionPassword);
router.get("/recuperar-password/:token", verRestablecerPassword);
router.post("/recuperar-password/:token", restablecerPassword);
router.get("/verificar-email/:token", verificarEmailToken);

export default router;
