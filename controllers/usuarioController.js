import { body } from "express-validator";
import { Op, fn, col } from "sequelize";
import { Usuario, Pedido, ROLES } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje } from "../helpers/utiles.js";
import { problemasPassword, passwordInutilizable } from "../helpers/seguridad.js";
import { aplicarFoto, borrarFoto } from "../helpers/avatar.js";
import { enviarEnlacePassword, enviarVerificacionCorreo, resumenEnvio } from "../helpers/cuentas.js";
import { condicionBusqueda } from "../helpers/busqueda.js";

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

const lista = async (req, res) => {
  const porSeccion = async (prefijo, roles) => {
    const q = String(req.query[`q${prefijo}`] ?? req.query.q ?? "").trim().slice(0, 60);
    const pagina = Math.max(1, Math.min(10000, Number.parseInt(req.query[`pagina${prefijo}`], 10) || 1));
    const ordenPermitido = { id: "id", usuario: "usuario", nombre: "nombre_completo", estado: "activo", rol: "rol" };
    const orden = ordenPermitido[req.query[`orden${prefijo}`]] || "nombre_completo";
    const dir = String(req.query[`dir${prefijo}`]).toUpperCase() === "DESC" ? "DESC" : "ASC";
    const condiciones = [{ rol: { [Op.in]: roles } }];
    if (q) condiciones.push(await condicionBusqueda("usuarios", q));
    if (prefijo === "T" && ["admin", "capturista"].includes(req.query.rol)) condiciones.push({ rol: req.query.rol });
    const verificado = req.query[`verificado${prefijo}`] || (prefijo === "T" ? req.query.verificado : "");
    if (verificado === "verificado") condiciones.push({ email_verificado: true });
    if (verificado === "sin") condiciones.push({ email_verificado: false });
    const { count, rows } = await Usuario.scope("sinClave").findAndCountAll({
      where: { [Op.and]: condiciones }, order: [[orden, dir], ["id", "ASC"]], limit: 20, offset: (pagina - 1) * 20,
    });
    return { filas: rows, q, pagina, paginas: Math.max(1, Math.ceil(count / 20)), total: count, orden, dir };
  };
  const trabajadores = await porSeccion("T", ["admin", "capturista"]);
  const clientes = await porSeccion("C", ["comprador"]);
  const ids = clientes.filas.map((u) => u.id);
  const conteos = ids.length ? await Pedido.findAll({ attributes: ["id_usuario", [fn("COUNT", col("id_ped")), "total"]], where: { id_usuario: { [Op.in]: ids } }, group: ["id_usuario"], raw: true }) : [];
  const pedidosPorUsuario = Object.fromEntries(conteos.map((x) => [x.id_usuario, Number(x.total)]));
  const paginaUrl = (prefijo, pagina) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) if (!key.startsWith(`pagina${prefijo}`) && !["mensaje", "error"].includes(key)) params.set(key, value);
    params.set(`pagina${prefijo}`, String(pagina));
    return `/usuarios?${params.toString()}`;
  };
  const ordenUrl = (prefijo, campo) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) if (!key.startsWith(`pagina${prefijo}`) && !key.startsWith(`orden${prefijo}`) && !key.startsWith(`dir${prefijo}`) && !["mensaje", "error"].includes(key)) params.set(key, value);
    const actual = req.query[`orden${prefijo}`] || "nombre";
    params.set(`orden${prefijo}`, campo);
    params.set(`dir${prefijo}`, actual === campo && String(req.query[`dir${prefijo}`]).toUpperCase() !== "DESC" ? "DESC" : "ASC");
    return `/usuarios?${params.toString()}`;
  };
  res.render("usuarios/index", { trabajadores, clientes, pedidosPorUsuario, nombreRol: NOMBRE_ROL, paginaUrl, ordenUrl, query: req.query, mensaje: req.query.mensaje, error: req.query.error });
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
