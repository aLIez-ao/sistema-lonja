// Consentimiento de cookies: el banner aparece solo con sesión y la elección cambia el comportamiento real.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente } from "./ayuda.js";

let srv, c;
before(async () => { srv = await arrancar(); c = cliente(srv.base); });
after(() => srv.cerrar());

test("el banner de cookies no aparece en el login y sí al iniciar sesión", async () => {
  assert.doesNotMatch((await c.get("/")).texto, /cookieConsentBanner/);
  await c.entrar("admin", "AdminPrueba123");
  assert.match((await c.get("/inicio")).texto, /cookieConsentBanner/);
});

test("sin consentimiento la preferencia se guarda en la cuenta pero no en cookie", async () => {
  const r = await c.postJSON("/configuracion/guardar-rapido", { clave: "tema", valor: "dark" });
  assert.equal(r.status, 200);
  assert.equal(c.cookies.has("lonja_theme"), false);
  const html = (await c.get("/inicio")).texto;
  assert.match(html, /data-theme="dark"/);
  assert.match(html, /data-bs-theme="dark"/);
});

test("valores inválidos se rechazan", async () => {
  const r = await c.postJSON("/configuracion/guardar-rapido", { clave: "tema", valor: "<script>" });
  assert.equal(r.status, 400);
});

test("aceptar todas crea las cookies de preferencia y oculta el banner", async () => {
  await c.postJSON("/configuracion/cookies", { nivel: "all" });
  assert.equal(c.cookies.get("lonja_cookies_consent"), "all");
  assert.equal(c.cookies.get("lonja_theme"), "dark");
  assert.doesNotMatch((await c.get("/inicio")).texto, /cookieConsentBanner/);
});

test("selección personalizada: solo se conservan las categorías elegidas", async () => {
  await c.postJSON("/configuracion/cookies", { categorias: ["accesibilidad"] });
  assert.equal(decodeURIComponent(c.cookies.get("lonja_cookies_consent")), "custom:accesibilidad");
  assert.equal(c.cookies.has("lonja_theme"), false, "personalización rechazada: se borra");
  assert.equal(c.cookies.has("lonja_font_size"), true);
  await c.postJSON("/configuracion/guardar-rapido", { clave: "moneda", valor: "USD" });
  assert.equal(c.cookies.has("lonja_currency"), false, "funcionales rechazadas: no se escribe");
});

test("guardar cookies desde Configuración no reinicia tema ni moneda", async () => {
  const r = await c.post("/configuracion/cookies", { nivel: "essential" });
  assert.equal(r.status, 302);
  const html = (await c.get("/configuracion")).texto;
  assert.match(html, /data-theme="dark"/);
  assert.match(html, /value="USD" selected/);
});

test("el tema retirado 'light' se normaliza a 'ocean'", async () => {
  const r = await c.postJSON("/configuracion/guardar-rapido", { clave: "tema", valor: "light" });
  assert.equal(r.status, 200);
  const html = (await c.get("/inicio")).texto;
  assert.match(html, /data-theme="ocean"/);
  assert.match(html, /data-bs-theme="light"/);
});
