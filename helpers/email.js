import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

/**
 * Crea el transporte de correo según las variables en .env.
 * Si se especifica GMAIL_USER y GMAIL_PASS, usa el servicio Gmail oficial.
 */
function obtenerTransporte() {
  const usuario = process.env.GMAIL_USER || process.env.EMAIL_USER;
  const clave = process.env.GMAIL_PASS || process.env.EMAIL_PASS;

  if (usuario && clave) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: usuario,
        pass: clave,
      },
    });
  }

  // Si no hay credenciales configuradas en .env, transporte de desarrollo (modo consola)
  return null;
}

/**
 * Función interna para enviar un email de forma segura sin romper la aplicación si faltan credenciales.
 */
async function enviarCorreo({ para, asunto, html, texto, adjuntos = [] }) {
  const remitente = process.env.GMAIL_USER || process.env.EMAIL_USER || "lonjaveracruz@sistema.local";
  const transporter = obtenerTransporte();

  if (!transporter) {
    console.log("==================================================================");
    console.log("📧 [SIMULADOR DE CORREO - Configura GMAIL_USER y GMAIL_PASS en .env]");
    console.log(`Para: ${para}`);
    console.log(`Asunto: ${asunto}`);
    console.log(`Contenido:\n${texto || html}`);
    console.log("==================================================================");
    return { simulado: true, mensaje: "Correo simulado en consola (configura Gmail en .env para envío real)" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Lonja de Veracruz" <${remitente}>`,
      to: para,
      subject: asunto,
      text: texto || "",
      html: html,
      attachments: adjuntos,
    });
    console.log(`✅ Correo enviado a ${para} (ID: ${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error al enviar correo a ${para}:`, error.message);
    return { ok: false, error: error.message };
  }
}

/** Escapa texto que se inserta en el HTML de un correo. */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Plantilla común de los correos de cuenta. `parrafos` es texto plano; `boton` = { texto, enlace }. */
function plantillaCuenta({ subtitulo, usuario, parrafos, boton, pie }) {
  const nombre = usuario.nombre_completo || usuario.usuario;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: #0B3954; padding: 26px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Lonja Pesquera de Veracruz</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">${esc(subtitulo)}</p>
      </div>
      <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px;">Hola <strong>${esc(nombre)}</strong>,</p>
        ${parrafos.map((p) => `<p>${esc(p)}</p>`).join("\n        ")}
        ${boton ? `<div style="text-align: center; margin: 28px 0;">
          <a href="${esc(boton.enlace)}" style="background-color: #0B3954; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">${esc(boton.texto)}</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${esc(boton.enlace)}" style="color: #087E8B; word-break: break-all;">${esc(boton.enlace)}</a></p>` : ""}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">${esc(pie)}</p>
      </div>
    </div>`;
  const texto = [`Hola ${nombre},`, ...parrafos, boton ? `${boton.texto}: ${boton.enlace}` : "", pie].filter(Boolean).join("\n\n");
  return { html, texto };
}

/** Verificación del correo vinculado a la cuenta (el enlace vence en 24 horas). */
export async function enviarEmailVerificacion({ usuario, correo, token, baseUrl }) {
  const enlace = `${baseUrl}/verificar-email/${token}`;
  return enviarCorreo({
    para: correo,
    asunto: "Confirma tu correo - Lonja de Veracruz",
    ...plantillaCuenta({
      subtitulo: "Verificación de correo",
      usuario,
      parrafos: ["Para confirmar que este correo te pertenece y poder usarlo para recuperar tu cuenta, verifica tu dirección. El enlace vence en 24 horas."],
      boton: { texto: "Verificar mi correo", enlace },
      pie: "Si no solicitaste esta verificación puedes ignorar este mensaje.",
    }),
  });
}

/** Enlace para restablecer la contraseña (vence en 1 hora). */
export async function enviarEmailRecuperacion({ usuario, correo, token, baseUrl }) {
  const enlace = `${baseUrl}/recuperar-password/${token}`;
  return enviarCorreo({
    para: correo,
    asunto: "Recuperación de contraseña - Lonja de Veracruz",
    ...plantillaCuenta({
      subtitulo: "Recuperación de contraseña",
      usuario,
      parrafos: [`Recibimos una solicitud para restablecer la contraseña de la cuenta "${usuario.usuario}". El enlace vence en 1 hora y solo puede usarse una vez.`],
      boton: { texto: "Restablecer contraseña", enlace },
      pie: "Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.",
    }),
  });
}

/** Invitación a una cuenta nueva: el usuario crea su propia contraseña (vence en 72 horas). */
export async function enviarEmailInvitacion({ usuario, correo, token, baseUrl, invitadoPor }) {
  const enlace = `${baseUrl}/recuperar-password/${token}`;
  return enviarCorreo({
    para: correo,
    asunto: "Tu cuenta en el Sistema Lonja de Veracruz",
    ...plantillaCuenta({
      subtitulo: "Bienvenida al sistema",
      usuario,
      parrafos: [
        `${invitadoPor || "La administración"} creó una cuenta para ti en el Sistema Lonja de Veracruz.`,
        `Tu nombre de usuario es "${usuario.usuario}". Para entrar por primera vez crea tu contraseña con el siguiente enlace, que vence en 72 horas.`,
      ],
      boton: { texto: "Crear mi contraseña", enlace },
      pie: "Si no esperabas este correo puedes ignorarlo; la cuenta no se podrá usar sin crear la contraseña.",
    }),
  });
}

/** Aviso de seguridad: la contraseña de la cuenta cambió. */
export async function enviarEmailPasswordCambiada({ usuario, correo }) {
  return enviarCorreo({
    para: correo,
    asunto: "Tu contraseña fue cambiada - Lonja de Veracruz",
    ...plantillaCuenta({
      subtitulo: "Aviso de seguridad",
      usuario,
      parrafos: [`La contraseña de la cuenta "${usuario.usuario}" se cambió hace un momento y se cerraron las demás sesiones abiertas.`],
      pie: "Si no fuiste tú, avisa de inmediato a la administración de la lonja para que restablezca tu acceso.",
    }),
  });
}

/**
 * Envía comprobante/factura de compra al comprador.
 */
export async function enviarEmailComprobanteCompra({ compra, comprador, pdfBuffer, folio }) {
  const nombreComprador = `${comprador.nombre} ${comprador.apellido_paterno}`;
  const especies = compra.lote && compra.lote.especies
    ? compra.lote.especies.map((e) => e.nombre).join(", ")
    : "Pescado/Marisco surtido";

  const kilos = Number(compra.lote?.kilos || 0).toFixed(2);
  const cajas = compra.lote?.numero_cajas || 0;
  const precioKilo = Number(compra.precio_kilo_final || 0).toFixed(2);
  const total = Number(compra.precio_total || 0).toFixed(2);

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #0b3954 0%, #087e8b 100%); padding: 30px 25px; text-align: left; color: white;">
        <span style="display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Comprobante Fiscal / Factura</span>
        <h1 style="margin: 10px 0 0 0; font-size: 24px; font-weight: 800;">Lonja Pesquera de Veracruz</h1>
        <p style="margin: 4px 0 0 0; opacity: 0.85; font-size: 13px;">Folio Factura: <strong>#FAC-${folio || compra.id_cmp}</strong></p>
      </div>
      <div style="padding: 26px 25px; color: #1e293b;">
        <p style="font-size: 16px; margin-top: 0;">Estimado(a) <strong>${esc(nombreComprador)}</strong>,</p>
        <p>Agradecemos su compra en la subasta de la lonja. A continuación se presentan los detalles de su transacción:</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Lote Adjudicado:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right;">Lote #${compra.id_cmp}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Especies:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right;">${esc(especies)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Cantidad / Cajas:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right;">${cajas} cajas (${kilos} kg)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Precio Final por Kilo:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right;">$${precioKilo} MXN</td>
            </tr>
            <tr style="border-top: 2px dashed #cbd5e1;">
              <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #0b3954;">TOTAL PAGADO:</td>
              <td style="padding: 12px 0 0 0; font-size: 18px; font-weight: 800; color: #087e8b; text-align: right;">$${total} MXN</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #475569;">Adjunto a este correo encontrará su factura en formato PDF oficial para su contabilidad y control.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">Lonja de Veracruz · Muelle de Pescadores S/N, Veracruz, Ver. · Tel. +52 229 900 1234</p>
      </div>
    </div>
  `;

  const adjuntos = [];
  if (pdfBuffer) {
    adjuntos.push({
      filename: `Factura-Lonja-${folio || compra.id_cmp}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    });
  }

  return enviarCorreo({
    para: comprador.correo,
    asunto: `Comprobante de Compra #FAC-${folio || compra.id_cmp} - Lonja de Veracruz`,
    html,
    texto: `Comprobante de compra Lote #${compra.id_cmp}. Total: $${total} MXN.`,
    adjuntos,
  });
}

/**
 * Envía avisos, eventos y políticas a clientes (compradores).
 */
export async function enviarBoletinClientes({ asunto, titulo, mensaje, tipo = "evento", compradores = [] }) {
  const badgeColor = tipo === "politica" ? "#d97706" : tipo === "urgente" ? "#dc2626" : "#0284c7";
  const badgeText = tipo === "politica" ? "Actualización de Políticas" : tipo === "urgente" ? "Aviso Urgente" : "Evento & Subastas";

  const resultados = [];
  for (const c of compradores) {
    if (!c.correo) continue;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: #0a2540; padding: 25px 24px; text-align: left; color: white;">
          <span style="background-color: ${badgeColor}; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${badgeText}</span>
          <h1 style="margin: 10px 0 0 0; font-size: 22px; font-weight: 700;">Lonja de Veracruz</h1>
        </div>
        <div style="padding: 26px 24px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;">Estimado(a) <strong>${esc(c.nombre)} ${esc(c.apellido_paterno)}</strong>,</p>
          <h3 style="color: #0f172a; margin-top: 15px;">${esc(titulo || asunto)}</h3>
          <div style="background: #f8fafc; border-left: 4px solid ${badgeColor}; padding: 14px 18px; border-radius: 0 8px 8px 0; font-size: 15px; margin: 20px 0; white-space: pre-line;">${esc(mensaje)}</div>
          <p style="font-size: 13px; color: #64748b;">Si tiene dudas o requiere apoyo, por favor comuníquese a la oficina de administración de la Lonja.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">Lonja Pesquera de Veracruz · Aviso enviado a clientes registrados.</p>
        </div>
      </div>
    `;

    const res = await enviarCorreo({
      para: c.correo,
      asunto: `${asunto} - Lonja de Veracruz`,
      html,
      texto: mensaje,
    });
    resultados.push({ comprador: c.correo, resultado: res });
  }

  return resultados;
}
