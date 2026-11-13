import express from "express";
import {
  verConfiguracion,
  guardarPreferencias,
  guardarRapido,
  actualizarCuenta,
  solicitarVerificacionEmail,
  guardarCookies,
  cambiarPasswordCuenta,
  enviarAvisoClientes,
  probarCorreo,
} from "../controllers/configuracionController.js";

import { permitir } from "../middleware/protegerRutas.js";

const router = express.Router();

router.get("/", verConfiguracion);
router.post("/guardar", guardarPreferencias);
router.post("/guardar-rapido", guardarRapido);
router.post("/cookies", guardarCookies);
router.post("/actualizar-cuenta", actualizarCuenta);
router.post("/solicitar-verificacion", solicitarVerificacionEmail);
router.post("/cambiar-password", cambiarPasswordCuenta);
// El correo masivo a compradores es solo para administradores
router.post("/enviar-aviso-clientes", permitir("admin"), enviarAvisoClientes);
router.post("/correo/prueba", permitir("admin"), probarCorreo);

export default router;
