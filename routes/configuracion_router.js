import express from "express";
import {
  verConfiguracion,
  guardarPreferencias,
  guardarRapido,
  actualizarCuenta,
  solicitarVerificacionEmail,
  verificarEmailToken,
  cambiarPasswordCuenta,
  enviarAvisoClientes,
} from "../controllers/configuracionController.js";

const router = express.Router();

router.get("/", verConfiguracion);
router.post("/guardar", guardarPreferencias);
router.post("/guardar-rapido", guardarRapido);
router.post("/actualizar-cuenta", actualizarCuenta);
router.post("/solicitar-verificacion", solicitarVerificacionEmail);
router.post("/cambiar-password", cambiarPasswordCuenta);
router.post("/enviar-aviso-clientes", enviarAvisoClientes);

export default router;
