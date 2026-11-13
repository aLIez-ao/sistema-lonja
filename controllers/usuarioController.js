import { body } from "express-validator";
import { Usuario, ROLES } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje } from "../helpers/utiles.js";
import { problemasPassword, passwordInutilizable } from "../helpers/seguridad.js";
import { aplicarFoto, borrarFoto } from "../helpers/avatar.js";
import { enviarEnlacePassword, enviarVerificacionCorreo, resumenEnvio } from "../helpers/cuentas.js";
import { leerListado, consultarListado, combinarWhere } from "../helpers/listado.js";
import { condicionBusqueda } from "../helpers/busqueda.js";
import { condicionFiltros, filtroLista } from "../helpers/filtros.js";

const reglas = [
  body("usuario").trim().isLength({ min: 3, max: 40 }).withMessage("El usuario debe tener entre 3 y 40 caracteres").matches(/^[\w.-]+$/).withMessage("El usuario solo admite letras, números, punto, guion y guion bajo"),
  body("nombre_completo").trim().notEmpty().withMessage("El nombre completo es obligatorio").isLength({ max: 80 }).withMessage("Nombre completo: máximo 80 caracteres"),
  body("correo").trim().isEmail().withMessage("Escribe un correo electrónico válido").isLength({ max: 80 }).withMessage("Correo: máximo 80 caracteres").normalizeEmail({ gmail_remove_dots: false }),
  body("telefono").trim().optional({ values: "falsy" }).matches(/^[0-9+() -]{7,20}$/).withMessage("Teléfono: entre 7 y 20 caracteres (dígitos, espacios, +, paréntesis o guiones)"),
  body("puesto").trim().optional({ values: "falsy" }).isLength({ max: 60 }).withMessage("Puesto: máximo 60 caracteres"),
  body("rol").isIn(ROLES).withMessage("Rol inválido"),
];

const NOMBRE_ROL = { admin: "Administrador", capturista: "Capturista", comprador: "Comprador" };

/** Roles que el administrador puede asignar a mano. El comprador nace en /registro. */
const rolesAsignables = (us) =>
  us?.rol === "comprador" ? ["comprador"] : ROLES.filter((r) => r !== "comprador");

const vistaFormulario = (res, { us, action, errores = [], estado = 200 }) =>
  res.status(estado).render("usuarios/formulario", {
    us,
    roles: rolesAsignables(us),
    nombreRol: NOMBRE_ROL,
    bloqueadoRol: us?.rol === "comprador",
    action,
    errores,
  });

/** Valida la contraseña escrita a mano (si la hay) y su confirmación. */
function erroresPassword(req) {
  const { password, password_confirmar, usuario } = req.body;
  const errs = problemasPassword(password, { usuario });
  if (password !== password_confirmar) errs.push("Las contraseñas no coinciden");
  return errs;
}

const ORDEN = {
  id: "id",
  usuario: "usuario",
  nombre: "nombre_completo",
  rol: "rol",
  estado: "activo",
};

const FILTROS = {
  rol: filtroLista(...ROLES),
  activo: filtroLista("activo", "inactivo"),
  verificado: filtroLista("verificado", "sin"),
};

const lista = async (req, res) => {
  const l = leerListado(req, {
    orden: ORDEN,
    ordenDefecto: { campo: "id", dir: "asc" },
    filtros: FILTROS,
  });
  await consultarListado(l, {
    modelo: Usuario.scope("sinClave"),
    pk: "id",
    include: [],
    includeOrden: [],
    where: combinarWhere(
      await condicionBusqueda("usuarios", l.q),
      await condicionFiltros("usuarios", l.filtros),
    ),
    orden: ORDEN,
  });
  res.render("usuarios/index", {
    l,
    usuarios: l.filas,
    nombreRol: NOMBRE_ROL,
    filtros: [
      {
        clave: "rol",
        etiqueta: "Rol",
        tipo: "select",
        opciones: ROLES.map((r) => ({ valor: r, texto: NOMBRE_ROL[r] || r })),
      },
      {
        clave: "activo",
        etiqueta: "Estado",
        tipo: "select",
        opciones: [
          { valor: "activo", texto: "Activo" },
          { valor: "inactivo", texto: "Inactivo" },
        ],
      },
      {
        clave: "verificado",
        etiqueta: "Correo",
        tipo: "select",
        opciones: [
          { valor: "verificado", texto: "Verificado" },
          { valor: "sin", texto: "Sin verificar" },
        ],
      },
    ],
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

const verCrear = (req, res) => vistaFormulario(res, { us: null, action: "/usuarios" });

/**
 * Alta. Dos formas de dar acceso:
 *   - invitación (por defecto): se envía un enlace para que la persona cree su propia contraseña
 *   - manual: el administrador escribe una contraseña inicial
 */
const registrar = async (req, res) => {
  const errs = mensajesError(req);
  const manual = req.body.acceso === "manual";
  if (req.body.rol === "comprador") errs.push("Las cuentas de comprador solo se crean desde el registro público (/registro)");
  if (manual) errs.push(...erroresPassword(req));

  if (!errs.length) {
    try {
      const { usuario, nombre_completo, correo, telefono, puesto, rol } = req.body;
      const us = await Usuario.create({
        usuario, nombre_completo, correo, rol,
        telefono: telefono || null,
        puesto: puesto || null,
        password: manual ? req.body.password : passwordInutilizable(),
      });

      const avisos = ["Usuario creado."];
      try {
        await aplicarFoto(us, { fotoData: req.body.foto_data });
        await us.save();
      } catch (e) { avisos.push(`La foto no se guardó: ${e.message}.`); }

      if (manual) {
        // Con contraseña asignada a mano solo falta confirmar que el correo es suyo
        const envio = await enviarVerificacionCorreo(req, us);
        avisos.push(envio.ok ? `Se envió un enlace de verificación a ${us.correo}.` : "El correo no está configurado o falló el envío: el usuario podrá verificar su correo desde Configuración.");
      } else {
        avisos.push(resumenEnvio(await enviarEnlacePassword(req, us, "invitacion"), us.correo));
      }
      return res.redirect(`/usuarios?${aMensaje(avisos.join(" "))}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  vistaFormulario(res, { us: { ...req.body, password: "" }, action: "/usuarios", errores: errs, estado: 400 });
};

const editar = async (req, res) => {
  const us = await Usuario.scope("sinClave").findByPk(req.params.id);
  if (!us) return res.redirect("/usuarios");
  vistaFormulario(res, { us, action: `/usuarios/${us.id}?_method=PUT` });
};

const actualizar = async (req, res) => {
  const us = await Usuario.findByPk(req.params.id);
  if (!us) return res.redirect("/usuarios");
  const errs = mensajesError(req);
  const activo = req.body.activo === "on";
  // Evita que el administrador se quite a sí mismo el acceso y deje el sistema sin admin
  if (us.id === req.usuario.id && (!activo || req.body.rol !== "admin")) errs.push("No puedes desactivarte ni quitarte el rol de administrador a ti mismo");
  // Una cuenta de comprador no cambia de rol: su vínculo con el comprador de la lonja depende de ello
  if (us.rol === "comprador" && req.body.rol !== "comprador") errs.push("El rol de una cuenta de comprador no se puede cambiar; solo puedes desactivarla");
  if (us.rol !== "comprador" && req.body.rol === "comprador") errs.push("Las cuentas de comprador solo se crean desde el registro público (/registro)");
  if (req.body.password) errs.push(...erroresPassword(req));

  if (!errs.length) {
    try {
      const correoCambio = (req.body.correo || null) !== (us.correo || null);
      us.usuario = req.body.usuario;
      us.nombre_completo = req.body.nombre_completo;
      us.correo = req.body.correo;
      us.telefono = req.body.telefono || null;
      us.puesto = req.body.puesto || null;
      us.rol = req.body.rol;
      us.activo = activo;
      if (correoCambio) us.email_verificado = false;
      if (req.body.password) us.password = req.body.password; // cierra las sesiones abiertas de ese usuario
      await aplicarFoto(us, { fotoData: req.body.foto_data, quitar: req.body.foto_quitar === "on" });
      await us.save();
      return res.redirect(`/usuarios?${aMensaje("Usuario actualizado")}`);
    } catch (e) { errs.push(e.name?.startsWith("Sequelize") ? mensajeBD(e) : e.message); }
  }
  vistaFormulario(res, { us: { ...req.body, id: us.id, rol: us.rol, activo, foto: us.foto, email_verificado: us.email_verificado, password: "" }, action: `/usuarios/${us.id}?_method=PUT`, errores: errs, estado: 400 });
};

/** El administrador envía un enlace para que el usuario defina una contraseña nueva. */
const enviarRestablecimiento = async (req, res) => {
  const us = await Usuario.findByPk(req.params.id);
  if (!us) return res.redirect("/usuarios");
  if (!us.correo) return res.redirect(`/usuarios?error=${encodeURIComponent("Ese usuario no tiene correo; edítalo para agregar uno o asígnale una contraseña manualmente.")}`);
  if (!us.activo) return res.redirect(`/usuarios?error=${encodeURIComponent("El usuario está inactivo; actívalo antes de enviarle un enlace.")}`);
  const resultado = await enviarEnlacePassword(req, us, "recuperacion");
  res.redirect(`/usuarios?${aMensaje(resumenEnvio(resultado, us.correo))}`);
};

const eliminar = async (req, res) => {
  if (Number(req.params.id) === req.usuario.id) return res.redirect(`/usuarios?${aMensaje("No puedes eliminar tu propio usuario")}`);
  const us = await Usuario.findByPk(req.params.id);
  if (us) {
    await borrarFoto(us);
    await us.destroy();
  }
  res.redirect(`/usuarios?${aMensaje("Usuario eliminado")}`);
};

export { reglas, lista, verCrear, registrar, editar, actualizar, enviarRestablecimiento, eliminar };
