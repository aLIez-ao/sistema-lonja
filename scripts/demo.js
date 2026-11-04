// Carga datos de ejemplo para probar el sistema:  npm run demo
// Requiere que las tablas existan (arranca el servidor una vez antes).
import db from "../config/db.js";
import { Tipo, Comprador, Lote, Especie, Compra } from "../models/index.js";
import { crearTiposIniciales } from "../helpers/semillas.js";
import { redondea } from "../helpers/fechas.js";

await db.sync();
await crearTiposIniciales();
const [pescado, marisco, molusco] = await Promise.all(["Pescado", "Marisco", "Molusco"].map((n) => Tipo.findOne({ where: { nombre: n } })));

const [ana] = await Comprador.findOrCreate({ where: { correo: "ana.lopez@example.com" }, defaults: { nombre: "Ana", apellido_paterno: "López", apellido_materno: "Ruiz", direccion: "Calle Hidalgo 12, Veracruz" } });
const [luis] = await Comprador.findOrCreate({ where: { correo: "luis.perez@example.com" }, defaults: { nombre: "Luis", apellido_paterno: "Pérez", direccion: "Av. Díaz Mirón 340, Veracruz" } });

const lotes = [
  { kilos: 120.5, numero_cajas: 10, precio_kilo_salida: 45, especies: [["Huachinango", pescado]], comprador: ana, final: 60.25 },
  { kilos: 80, numero_cajas: 8, precio_kilo_salida: 90, especies: [["Camarón", marisco]], comprador: luis, final: 110 },
  { kilos: 55.25, numero_cajas: 5, precio_kilo_salida: 70, especies: [["Ostión", molusco], ["Jaiba", marisco]], comprador: ana, final: 82.5 },
  { kilos: 40, numero_cajas: 4, precio_kilo_salida: 55, especies: [["Mojarra", pescado]], comprador: null }, // sin comprar
];
for (const l of lotes) {
  const lote = await Lote.create({ kilos: l.kilos, numero_cajas: l.numero_cajas, precio_kilo_salida: l.precio_kilo_salida });
  for (const [nombre, tipo] of l.especies) await Especie.create({ nombre, id_lte: lote.id_lte, id_tpo: tipo.id_tpo });
  if (l.comprador) await Compra.create({ id_cmp: lote.id_lte, codigo_cpr: l.comprador.codigo_cpr, precio_kilo_final: l.final, precio_total: redondea(l.kilos * l.final) });
}
console.log("Datos de ejemplo cargados.");
await db.close();
