// Utilidades compartidas por las pruebas: app con SQLite en memoria y un cliente con cookies.
process.env.BD_DIALEC = "sqlite";
process.env.BD_STORAGE = ":memory:";
process.env.SC_JWT = "clave_de_pruebas";
process.env.ADMIN_USER = "admin";
process.env.ADMIN_PASSWORD = "AdminPrueba123";
process.env.GMAIL_USER = "";
process.env.GMAIL_PASS = "";
process.env.EMAIL_USER = "";
process.env.EMAIL_PASS = "";

const { default: db } = await import("../config/db.js");
const modelos = await import("../models/index.js");
const { default: app } = await import("../app.js");
const { crearAdministradorInicial, crearTiposIniciales } = await import("../helpers/semillas.js");
const { asegurarEsquema } = await import("../helpers/migraciones.js");

export { db, app, modelos };

/** Arranca la app sobre una BD limpia. Devuelve { base, cerrar }. */
export async function arrancar() {
  await db.sync({ force: true });
  await asegurarEsquema();
  await crearAdministradorInicial();
  await crearTiposIniciales();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, cerrar: async () => { server.close(); await db.close(); } };
}

/** Cliente HTTP mínimo que conserva todas las cookies (como un navegador). */
export function cliente(base) {
  const tarro = new Map();
  const req = async (metodo, ruta, datos, json = false) => {
    const headers = { cookie: [...tarro].map(([k, v]) => `${k}=${v}`).join("; ") };
    let body;
    if (datos && json) { headers["content-type"] = "application/json"; body = JSON.stringify(datos); }
    else if (datos) { headers["content-type"] = "application/x-www-form-urlencoded"; body = new URLSearchParams(datos).toString(); }
    const r = await fetch(base + ruta, { method: metodo, redirect: "manual", headers, body });
    for (const linea of r.headers.getSetCookie()) {
      const [par, ...attrs] = linea.split(";");
      const i = par.indexOf("=");
      const nombre = par.slice(0, i).trim();
      const valor = par.slice(i + 1);
      const expira = attrs.map((a) => a.trim()).find((a) => /^expires=/i.test(a));
      if (valor === "" || (expira && new Date(expira.slice(8)) < new Date())) tarro.delete(nombre);
      else tarro.set(nombre, valor);
    }
    const tipo = r.headers.get("content-type") || "";
    const cuerpo = tipo.includes("pdf") ? Buffer.from(await r.arrayBuffer()) : await r.text();
    return { status: r.status, loc: r.headers.get("location"), texto: cuerpo, headers: r.headers };
  };
  return {
    cookies: tarro,
    get: (ruta) => req("GET", ruta),
    post: (ruta, datos = {}) => req("POST", ruta, datos),
    postJSON: (ruta, datos) => req("POST", ruta, datos, true),
    entrar: (usuario, password) => req("POST", "/credenciales", { usuario, password }),
  };
}
