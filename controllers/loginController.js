import { body } from "express-validator";
import bcrypt from "bcryptjs";
import { Usuario, Compra, Lote } from "../models/index.js";
import { JWTGenera } from "../helpers/tokens.js";
import { mensajesError } from "../helpers/utiles.js";
import { hoy, rangoDelDia } from "../helpers/fechas.js";
import { Op } from "sequelize";

const reglasLogin = [
  body("usuario").trim().notEmpty().withMessage("El usuario no debe estar vacío"),
  body("password").notEmpty().withMessage("La contraseña no debe estar vacía"),
];

const HASH_FALSO = bcrypt.hashSync("no-existe", 10); // iguala el tiempo de respuesta si el usuario no existe

const vistaLogin = (res, errores = [], usuario = "") =>
  res.status(errores.length ? 401 : 200).render("login/login", { errores, usuario });

const login = (req, res) => {
  // Si ya tiene sesión válida, el middleware de /inicio lo recibirá; aquí solo mostramos el formulario
  vistaLogin(res);
};

const credenciales = async (req, res) => {
  const errs = mensajesError(req);
  if (errs.length) return vistaLogin(res, errs, req.body.usuario);

  const { usuario, password } = req.body;
  const us = await Usuario.findOne({ where: { usuario } });
  const clave = await bcrypt.compare(password, us ? us.password : HASH_FALSO);

  // Mismo mensaje para usuario inexistente, contraseña mala o cuenta inactiva
  if (!us || !clave || !us.activo) return vistaLogin(res, ["Revisa las credenciales"], usuario);

  const token = JWTGenera(us);
  return res
    .cookie("_token", token, {
      httpOnly: true, // no accesible desde JavaScript del navegador
      sameSite: "strict", // mitiga CSRF
      secure: process.env.NODE_ENV === "production", // solo HTTPS en producción
    })
    .redirect("/inicio");
};

const principal = async (req, res) => {
  const fecha = hoy();
  const { inicio, fin } = rangoDelDia(fecha);
  const compras = await Compra.findAll({ where: { fecha: { [Op.gte]: inicio, [Op.lt]: fin } } });
  const total = compras.reduce((s, c) => s + Number(c.precio_total), 0);
  const lotesLibres = (await Lote.count()) - (await Compra.count()); // relación 1 a 1
  res.render("inicio", { fecha, numCompras: compras.length, total, lotesLibres });
};

const cerrarsesion = (req, res) => {
  res.clearCookie("_token", { httpOnly: true, sameSite: "strict" });
  res.redirect("/");
};

export { reglasLogin, login, credenciales, principal, cerrarsesion };
