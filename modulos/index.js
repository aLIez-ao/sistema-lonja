import express from 'express';
import rutaProteger, { permitir } from '../middleware/protegerRutas.js';
import {
  rutasLogin,
  rutasRegistro,
  rutasUsuarios,
  rutasConfiguracion,
  rutasAvisos,
  cuentaController,
  direccionController,
} from './cuentas/index.js';
import { rutasTipos, rutasCatalogo, rutasEspecies, rutasLotes } from './catalogo/index.js';
import { rutasCompradores, rutasCompras, rutasReportes } from './ventas/index.js';
import { rutasPublicas, rutasBusqueda, rutasCarrito, socialController } from './tienda/index.js';
import { router as rutasPedido, rutasAdmin as rutasPedidoAdmin } from './pedidos/index.js';
import * as pedidos from './pedidos/index.js';

function crearRutasCuenta() {
  const router = express.Router();
  router.get('/', cuentaController.resumen);
  router.get('/datos', cuentaController.verDatos);
  router.post('/datos', cuentaController.actualizarDatos);
  router.get('/direcciones', direccionController.lista);
  router.get('/direcciones/nueva', direccionController.verCrear);
  router.post('/direcciones', direccionController.registrar);
  router.get('/direcciones/:id/editar', direccionController.editar);
  router.put('/direcciones/:id', direccionController.actualizar);
  router.delete('/direcciones/:id', direccionController.eliminar);
  router.post('/direcciones/:id/principal', direccionController.marcarPrincipal);
  router.get('/pedidos', pedidos.listaCuenta);
  router.get('/pedidos/:id', pedidos.detalleCuenta);
  router.get('/pedidos/:id/factura/:id_cmp.pdf', pedidos.facturaCuentaPdf);
  router.get('/pedidos/:id/factura/:id_cmp', pedidos.facturaCuenta);
  router.get('/listas', socialController.listas);
  router.get('/listas.json', socialController.listarListasJson);
  router.post('/favoritos/alternar', socialController.alternarFavorito);
  router.post('/favoritos', socialController.guardarFavorito);
  router.post('/listas', socialController.crearLista);
  router.get('/listas/:id', socialController.detalleLista);
  router.post('/listas/:id/carrito', socialController.agregarDisponiblesLista);
  router.post('/listas/:id/items', socialController.agregarLista);
  router.put('/listas/:id', socialController.renombrarLista);
  router.delete('/listas/:id', socialController.borrarLista);
  router.delete('/listas/:id/items', socialController.quitarItem);
  router.get('/preguntas', socialController.misPreguntas);
  router.get('/opiniones', socialController.misOpiniones);
  router.delete('/opiniones/:id', socialController.borrarMiOpinion);
  return router;
}

export function montarModulos(app) {
  app.use('/', rutasLogin);
  app.use('/registro', rutasRegistro);
  app.use('/', rutasPublicas);
  app.use('/avisos', rutasAvisos);

  const soloPersonal = [rutaProteger, permitir('admin', 'capturista')];
  app.use('/tipos', soloPersonal, rutasTipos);
  app.use('/compradores', soloPersonal, rutasCompradores);
  app.use('/lotes', soloPersonal, rutasLotes);
  app.use('/especies', soloPersonal, rutasEspecies);
  app.use('/catalogo', soloPersonal, rutasCatalogo);
  app.use('/compras', soloPersonal, rutasCompras);
  app.use('/pedidos', soloPersonal, rutasPedidoAdmin);
  app.use('/reportes', soloPersonal, rutasReportes);
  app.use('/buscar', soloPersonal, rutasBusqueda);
  app.get('/preguntas', ...soloPersonal, socialController.moderarPreguntas);
  app.post('/preguntas/:id', ...soloPersonal, socialController.responderPregunta);
  app.get('/opiniones', ...soloPersonal, socialController.moderarOpiniones);
  app.post('/opiniones/:id', ...soloPersonal, socialController.cambiarVisibilidadOpinion);

  app.use('/cuenta', rutaProteger, permitir('comprador'), crearRutasCuenta());
  app.use('/carrito', rutaProteger, permitir('comprador'), rutasCarrito);
  app.use('/pedido', rutaProteger, permitir('comprador'), rutasPedido);
  app.use('/configuracion', rutaProteger, rutasConfiguracion);
  app.use('/usuarios', rutaProteger, permitir('admin'), rutasUsuarios);
}
