import express from 'express';
import { bajaAvisos, confirmarBajaAvisos, descartarAvisoSuscripcion } from '../controladores/avisosController.js';
import rutaProteger, { permitir } from '../../../middleware/protegerRutas.js';

const router = express.Router();
router.get('/baja/:token', confirmarBajaAvisos);
router.post('/baja/:token', bajaAvisos);
router.post('/descartar-suscripcion', rutaProteger, permitir('comprador'), descartarAvisoSuscripcion);

export default router;
