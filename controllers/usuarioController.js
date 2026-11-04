import { body } from "express-validator";
import { Usuario, ROLES } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje } from "../helpers/utiles.js";

const base = [
  body("usuario").trim().isLength({ min: 3, max: 40 }).withMessage("El usuario debe tener entre 3 y 40 caracteres").matches(/^[\w.-]+$/).withMessage("El usuario solo admite letras, números, punto, guion y guion bajo"),
  body("nombre_completo").trim().notEmpty().withMessage("El nombre completo es obligatorio").isLength({ max: 80 }).withMessage("Nombre completo: máximo 80 caracteres"),
  body("rol").isIn(ROLES).withMessage("Rol inválido"),
];
const reglasAlta = [...base, body("password").isLength({ min: 8, max: 72 }).withMessage("La contraseña debe tener entre 8 y 72 caracteres")];
const reglasEdicion = [...base, body("password").optional({ values: "falsy" }).isLength({ min: 8, max: 72 }).withMessage("La contraseña debe tener entre 8 y 72 caracteres")];

const lista = async (req, res) => {
  const usuarios = await Usuario.scope("sinClave").findAll({ order: [["id", "ASC"]] });
  res.render("usuarios/index", { usuarios, mensaje: req.query.mensaje });
};

const verCrear = (req, res) => res.render("usuarios/formulario", { us: null, roles: ROLES, action: "/usuarios", errores: [] });

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      const { usuario, nombre_completo, password, rol } = req.body;
      await Usuario.create({ usuario, nombre_completo, password, rol });
      return res.redirect(`/usuarios?${aMensaje("Usuario creado")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("usuarios/formulario", { us: { ...req.body, password: "" }, roles: ROLES, action: "/usuarios", errores: errs });
};

const editar = async (req, res) => {
  const us = await Usuario.scope("sinClave").findByPk(req.params.id);
  if (!us) return res.redirect("/usuarios");
  res.render("usuarios/formulario", { us, roles: ROLES, action: `/usuarios/${us.id}?_method=PUT`, errores: [] });
};

const actualizar = async (req, res) => {
  const us = await Usuario.findByPk(req.params.id);
  if (!us) return res.redirect("/usuarios");
  const errs = mensajesError(req);
  const activo = req.body.activo === "on";
  // Evita que el administrador se quite a sí mismo el acceso y deje el sistema sin admin
  if (us.id === req.usuario.id && (!activo || req.body.rol !== "admin")) errs.push("No puedes desactivarte ni quitarte el rol de administrador a ti mismo");
  if (!errs.length) {
    try {
      us.usuario = req.body.usuario;
      us.nombre_completo = req.body.nombre_completo;
      us.rol = req.body.rol;
      us.activo = activo;
      if (req.body.password) us.password = req.body.password; // solo si escribió una nueva
      await us.save();
      return res.redirect(`/usuarios?${aMensaje("Usuario actualizado")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("usuarios/formulario", { us: { ...req.body, id: us.id, activo, password: "" }, roles: ROLES, action: `/usuarios/${us.id}?_method=PUT`, errores: errs });
};

const eliminar = async (req, res) => {
  if (Number(req.params.id) === req.usuario.id) return res.redirect(`/usuarios?${aMensaje("No puedes eliminar tu propio usuario")}`);
  await Usuario.destroy({ where: { id: req.params.id } });
  res.redirect(`/usuarios?${aMensaje("Usuario eliminado")}`);
};

export { reglasAlta, reglasEdicion, lista, verCrear, registrar, editar, actualizar, eliminar };
