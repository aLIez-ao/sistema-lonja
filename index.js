import dotenv from "dotenv";
import db from "./config/db.js";
import "./models/index.js";
import app from "./app.js";
import { crearAdministradorInicial, crearTiposIniciales } from "./helpers/semillas.js";
import { asegurarEsquema } from "./helpers/migraciones.js";
import { verificarTransporte } from "./helpers/email.js";
import { liberarPedidosVencidos } from "./helpers/pedidos.js";

dotenv.config({ path: ".env" });
const port = process.env.PORT || 2800;

(async () => {
  try {
    if (!process.env.SC_JWT) throw new Error("Falta SC_JWT en .env (firma de los tokens)");
    await db.authenticate();
    console.log("Conexión a la base de datos establecida.");

    // BD_SYNC: safe (solo crea lo que falta) | alter | force (borra todo)
    const modo = process.env.BD_SYNC || "safe";
    await db.sync(modo === "force" ? { force: true } : modo === "alter" ? { alter: true } : {});
    console.log(`Modelos sincronizados (${modo}).`);

    await asegurarEsquema();
    await crearAdministradorInicial();
    await crearTiposIniciales();

// Diagnóstico del correo: informa sin detener el servidor
    const correo = await verificarTransporte();
    if (correo.configurado && !correo.error) console.log("\x1b[32mCorreo listo\x1b[0m");
    else if (correo.error) console.warn(`\x1b[31mGmail rechazó las credenciales: ${correo.error}\x1b[0m`);
    else console.warn("\x1b[33mCorreo NO configurado (modo simulador). Define GMAIL_USER y GMAIL_PASS en .env\x1b[0m");

    const barridoReservas = setInterval(() => {
      liberarPedidosVencidos().catch((error) => console.warn("No se pudieron limpiar reservas vencidas:", error.message));
    }, 60_000);
    barridoReservas.unref();

    app.listen(port, () => {
      console.log(`Servidor corriendo en \x1b[36mhttp://localhost:${port}\x1b[0m`);
    });
  } catch (err) {
    console.error("Error al iniciar:", err);
    process.exit(1);
  }
})();
