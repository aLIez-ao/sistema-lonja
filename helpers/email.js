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

/**
 * Envía correo para verificar la vinculación del correo del usuario.
 */
export async function enviarEmailVerificacion({ usuario, correo, token, baseUrl }) {
  const enlace = `${baseUrl}/verificar-email/${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #0a2540 0%, #0077b6 100%); padding: 28px 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Lonja Pesquera de Veracruz</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Verificación de cuenta y correo electrónico</p>
      </div>
      <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px;">Hola <strong>${usuario.nombre_completo || usuario.usuario}</strong>,</p>
        <p>Has solicitado vincular o verificar este correo en tu cuenta del <strong>Sistema Lonja</strong>.</p>
        <p>Por favor confirma tu dirección de correo haciendo clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${enlace}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);">Verificar mi correo</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br><a href="${enlace}" style="color: #0284c7; word-break: break-all;">${enlace}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Si tú no solicitaste este cambio, puedes ignorar este mensaje con seguridad.</p>
      </div>
    </div>
  `;

  return enviarCorreo({
    para: correo,
    asunto: "Verifica tu correo electrónico - Sistema Lonja Veracruz",
    html,
    texto: `Verifica tu correo ingresando a: ${enlace}`,
  });
}

/**
 * Envía correo con token para restablecer contraseña olvidada.
 */
export async function enviarEmailRecuperacion({ usuario, correo, token, baseUrl }) {
  const enlace = `${baseUrl}/recuperar-password/${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #0a2540 0%, #0077b6 100%); padding: 28px 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Lonja Pesquera de Veracruz</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Recuperación de Contraseña</p>
      </div>
      <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px;">Hola <strong>${usuario.nombre_completo || usuario.usuario}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de acceso a tu cuenta.</p>
        <p>Haz clic en el siguiente botón para generar una nueva contraseña (este enlace vence en 1 hora):</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${enlace}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Restablecer contraseña</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Enlace directo:<br><a href="${enlace}" style="color: #0284c7; word-break: break-all;">${enlace}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Si no solicitaste restablecer tu contraseña, haz caso omiso de este correo. Tu cuenta sigue protegida.</p>
      </div>
    </div>
  `;

  return enviarCorreo({
    para: correo,
    asunto: "Recuperación de contraseña - Lonja de Veracruz",
    html,
    texto: `Restablece tu contraseña aquí: ${enlace}`,
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
        <p style="font-size: 16px; margin-top: 0;">Estimado(a) <strong>${nombreComprador}</strong>,</p>
        <p>Agradecemos su compra en la subasta de la lonja. A continuación se presentan los detalles de su transacción:</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Lote Adjudicado:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right;">Lote #${compra.id_cmp}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Especies:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right;">${especies}</td>
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
          <p style="font-size: 15px; margin-top: 0;">Estimado(a) <strong>${c.nombre} ${c.apellido_paterno}</strong>,</p>
          <h3 style="color: #0f172a; margin-top: 15px;">${titulo || asunto}</h3>
          <div style="background: #f8fafc; border-left: 4px solid ${badgeColor}; padding: 14px 18px; border-radius: 0 8px 8px 0; font-size: 15px; margin: 20px 0; white-space: pre-line;">${mensaje}</div>
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
