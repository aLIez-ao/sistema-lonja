import test from "node:test";
import assert from "node:assert/strict";
import { generarFacturaPDF } from "../helpers/facturaPdf.js";
import { formatearMoneda, t } from "../helpers/i18n.js";
import { enviarEmailVerificacion, enviarEmailRecuperacion } from "../helpers/email.js";

test("i18n traduce correctamente en español e inglés", () => {
  assert.equal(t("inicio", "es"), "Dashboard");
  assert.equal(t("inicio", "en"), "Dashboard");
  assert.equal(t("compras", "en"), "Purchases");
});

test("formatearMoneda convierte y formatea MXN, USD y EUR", () => {
  const mxn = formatearMoneda(100, "MXN");
  assert.match(mxn, /\$100\.00/);

  const usd = formatearMoneda(200, "USD");
  assert.match(usd, /\$10\.00/);

  const eur = formatearMoneda(215, "EUR");
  assert.match(eur, /10,00\s*€/);
});

test("generarFacturaPDF devuelve un buffer de PDF válido con encabezado %PDF", async () => {
  const compraMock = {
    id_cmp: 99,
    codigo_cpr: 1,
    fecha: new Date(),
    precio_kilo_final: 85.5,
    precio_total: 8550.0,
    comprador: {
      codigo_cpr: 1,
      nombre: "Carlos",
      apellido_paterno: "Pérez",
      correo: "carlos@example.com",
      direccion: "Muelle de Veracruz",
    },
    lote: {
      numero_cajas: 10,
      kilos: 100.0,
      precio_kilo_salida: 70.0,
      especies: [{ nombre: "Huachinango", tipo: { nombre: "Pescado" } }],
    },
  };

  const pdfBuffer = await generarFacturaPDF(compraMock);
  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 500);
  // Verificar la firma de encabezado de archivo PDF
  assert.equal(pdfBuffer.subarray(0, 4).toString(), "%PDF");
});

test("simulador de email no truena ante envío sin credenciales configuradas", async () => {
  const resVerif = await enviarEmailVerificacion({
    usuario: { usuario: "test_user", nombre_completo: "Usuario Test" },
    correo: "test@example.com",
    token: "token123",
    baseUrl: "http://localhost:2800",
  });
  assert.ok(resVerif.simulado || resVerif.ok);

  const resRecup = await enviarEmailRecuperacion({
    usuario: { usuario: "test_user", nombre_completo: "Usuario Test" },
    correo: "test@example.com",
    token: "token_recuperacion_abc",
    baseUrl: "http://localhost:2800",
  });
  assert.ok(resRecup.simulado || resRecup.ok);
});
