import { Usuario, Compra, Lote, Especie, DireccionEntrega } from "../models/index.js";
import { aMensaje, aError } from "../helpers/utiles.js";
import { aplicarFoto } from "../helpers/avatar.js";
import { compradorDe, compradorPorCorreo, partirNombre } from "../helpers/comprador.js";
import { enviarVerificacionCorreo, segundosEsperaVerificacion } from "../helpers/cuentas.js";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^[0-9+() -]{7,20}$/;
const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

export const usuarioActual = (req) => Usuario.findByPk(req.usuario.id);

/** Datos personales para el formulario: usa el comprador vinculado si existe. */
async function datosPersonales(us) {
  const cpr = await compradorDe(us);
  const partes = partirNombre(us.nombre_completo);
  return {
    nombre: cpr?.nombre || partes.nombre,
    apellido_paterno: cpr?.apellido_paterno || partes.apellido_paterno,
    apellido_materno: cpr?.apellido_materno || partes.apellido_materno || "",
    correo: us.correo || "",
    telefono: us.telefono || "",
    rfc: us.rfc || "",
    razon_social: us.razon_social || "",
  };
}

const vistaDatos = async (res, us, { errores = [], estado = 200, mensaje = null, enlaceVerificacion = null } = {}) => {
  const direcciones = await DireccionEntrega.count({ where: { id_usuario: us.id } });
  res.status(estado).render("cuenta/datos", {
    us,
    datos: await datosPersonales(us),
    direcciones,
    errores,
    mensaje,
    enlaceVerificacion,
  });
};

export const resumen = async (req, res) => {
  const us = await usuarioActual(req);
  if (!us) return res.redirect("/acceso");

  const direcciones = await DireccionEntrega.findAll({
    where: { id_usuario: us.id },
    order: [["principal", "DESC"], ["id_dir", "ASC"]],
  });

  let compras = [];
  if (us.codigo_cpr) {
    compras = await Compra.findAll({
      where: { codigo_cpr: us.codigo_cpr },
      include: [{ model: Lote, as: "lote", include: [{ model: Especie, as: "especies" }] }],
      order: [["fecha", "DESC"]],
      limit: 5,
    });
  }
  const total = compras.reduce((suma, c) => suma + Number(c.precio_total || 0), 0);
  const comprador = await compradorDe(us);

  res.render("cuenta/resumen", {
    us,
    comprador,
    direcciones,
    compras,
    total,
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

export const verDatos = async (req, res) => {
  const us = await usuarioActual(req);
  if (!us) return res.redirect("/acceso");
  await vistaDatos(res, us, {
    errores: req.query.error ? [req.query.error] : [],
    mensaje: req.query.mensaje || null,
  });
};

export const actualizarDatos = async (req, res) => {
  const us = await usuarioActual(req);
  if (!us) return res.redirect("/acceso");

  const nombre = String(req.body.nombre ?? "").trim();
  const paterno = String(req.body.apellido_paterno ?? "").trim();
  const materno = String(req.body.apellido_materno ?? "").trim();
  const correo = String(req.body.correo ?? "").trim().toLowerCase();
  const telefono = String(req.body.telefono ?? "").trim();
  const rfc = String(req.body.rfc ?? "").trim().toUpperCase();
  const razon = String(req.body.razon_social ?? "").trim();

  const errores = [];
  if (!nombre || nombre.length > 40) errores.push("El nombre es obligatorio (máximo 40 caracteres)");
  if (!paterno || paterno.length > 40) errores.push("El apellido paterno es obligatorio (máximo 40 caracteres)");
  if (materno.length > 40) errores.push("El apellido materno admite máximo 40 caracteres");
  if (!CORREO.test(correo) || correo.length > 80) errores.push("Escribe un correo electrónico válido");
  if (telefono && !TELEFONO.test(telefono)) errores.push("El teléfono no es válido");
  if (rfc && !RFC.test(rfc)) errores.push("El RFC no tiene un formato válido (ej. XAXX010101000)");
  if (razon.length > 100) errores.push("La razón social admite máximo 100 caracteres");
  if (`${nombre} ${paterno} ${materno}`.trim().length > 80) errores.push("El nombre completo admite máximo 80 caracteres");

  if (errores.length) return vistaDatos(res, us, { errores, estado: 400 });

  try {
    const correoCambio = correo !== String(us.correo || "").toLowerCase();
    if (correoCambio && (await Usuario.findOne({ where: { correo } }))) {
      return vistaDatos(res, us, { errores: ["Ese correo ya está en uso por otra cuenta"], estado: 400 });
    }

    const cpr = await compradorDe(us);
    if (correoCambio && cpr) {
      const existente = await compradorPorCorreo(correo);
      if (existente && existente.codigo_cpr !== cpr.codigo_cpr) {
        return vistaDatos(res, us, { errores: ["Ese correo ya está asociado a otro cliente de la lonja"], estado: 400 });
      }
    }
    us.nombre_completo = `${nombre} ${paterno}${materno ? ` ${materno}` : ""}`;
    us.telefono = telefono || null;
    us.rfc = rfc || null;
    us.razon_social = razon || null;
    if (correoCambio) {
      us.correo = correo;
      us.email_verificado = false;
      us.token_verificacion = null;
      us.token_verificacion_expira = null;
    }
    await aplicarFoto(us, { fotoData: req.body.foto_data, quitar: req.body.foto_quitar === "on" });
    await us.save();

    if (cpr && cpr.codigo_cpr === us.codigo_cpr) {
      await cpr.update({ nombre, apellido_paterno: paterno, apellido_materno: materno || null, ...(correoCambio ? { correo } : {}) });
    }

    let aviso = "Tus datos quedaron guardados.";
    if (correoCambio) {
      const espera = segundosEsperaVerificacion(us);
      if (espera > 0) {
        aviso += ` Ya se envió un enlace de verificación hace poco; espera ${espera} s o reenvíalo desde Mi cuenta.`;
      } else {
        const envio = await enviarVerificacionCorreo(req, us).catch(() => ({ ok: false }));
        if (envio.ok) aviso += ` Te enviamos un enlace a ${correo} para verificarlo.`;
        else if (envio.simulado && process.env.NODE_ENV !== "production") {
          return vistaDatos(res, us, { mensaje: aviso, enlaceVerificacion: envio.enlace });
        } else aviso += " No pudimos enviar el correo de verificación; inténtalo más tarde.";
      }
    }
    return res.redirect(`/cuenta/datos?${aMensaje(aviso)}`);
  } catch (e) {
    console.error("No se pudieron actualizar los datos de la cuenta:", e);
    const errorImagen = /^(?:La imagen debe ser un archivo JPG, PNG o WebP|La imagen es demasiado grande|El archivo no es una imagen válida)$/.test(String(e?.message || ""));
    return res.redirect(`/cuenta/datos?${aError(errorImagen ? e.message : "No se pudieron guardar los datos. Revisa la información e inténtalo de nuevo.")}`);
  }
};
