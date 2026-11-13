// Vínculo entre una cuenta en línea (Usuario) y su comprador de la lonja (Comprador).
import { col, fn, where as sqlWhere } from "sequelize";
import { Comprador, Usuario } from "../models/index.js";

/** Comprador vinculado a la cuenta, o null. */
export const compradorDe = (usuario) =>
  usuario?.codigo_cpr ? Comprador.findByPk(usuario.codigo_cpr) : Promise.resolve(null);

/** Busca un comprador por correo sin distinguir mayúsculas. */
export const compradorPorCorreo = (correo) =>
  Comprador.findOne({ where: sqlWhere(fn("LOWER", col("correo")), String(correo).trim().toLowerCase()) });

/**
 * Vincula la cuenta con el comprador que ya tiene su correo.
 * Solo lo hace si ese comprador no está vinculado a otra cuenta.
 * Devuelve el comprador vinculado o null.
 */
export async function vincularComprador(usuario) {
  if (usuario.codigo_cpr) return Comprador.findByPk(usuario.codigo_cpr);
  const correo = String(usuario.correo || "").trim();
  if (!correo) return null;

  const comprador = await compradorPorCorreo(correo);
  if (!comprador) return null;
  const ocupado = await Usuario.findOne({ where: { codigo_cpr: comprador.codigo_cpr } });
  if (ocupado && ocupado.id !== usuario.id) return null;

  usuario.codigo_cpr = comprador.codigo_cpr;
  await usuario.save();
  return comprador;
}

/** Separa un nombre completo en nombre y apellidos (para crear el Comprador). */
export function partirNombre(nombreCompleto) {
  const partes = String(nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return { nombre: "Comprador", apellido_paterno: "Lonja", apellido_materno: null };
  if (partes.length === 1) return { nombre: partes[0], apellido_paterno: "—", apellido_materno: null };
  if (partes.length === 2) return { nombre: partes[0], apellido_paterno: partes[1], apellido_materno: null };
  return {
    nombre: partes[0],
    apellido_paterno: partes[1],
    apellido_materno: partes.slice(2).join(" "),
  };
}
