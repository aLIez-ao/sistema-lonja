// Generador de datos de prueba ampliados para el Sistema Lonja
import db from "../config/db.js";
import { Tipo, Comprador, Lote, Especie, Compra } from "../models/index.js";
import { crearTiposIniciales } from "../helpers/semillas.js";
import { asegurarColumnasUsuario } from "../helpers/migraciones.js";
import { redondea } from "../helpers/fechas.js";

await db.sync();
await asegurarColumnasUsuario();
await crearTiposIniciales();

const [pescado, marisco, molusco] = await Promise.all([
  Tipo.findOne({ where: { nombre: "Pescado" } }),
  Tipo.findOne({ where: { nombre: "Marisco" } }),
  Tipo.findOne({ where: { nombre: "Molusco" } }),
]);

// 1. Amplia lista de Compradores (Restaurantes, Pescaderías y Mayoristas de Veracruz)
const listaCompradores = [
  { nombre: "Ana", apellido_paterno: "López", apellido_materno: "Ruiz", direccion: "Calle Hidalgo 12, Centro Histórico, Veracruz", correo: "ana.lopez@example.com" },
  { nombre: "Luis", apellido_paterno: "Pérez", apellido_materno: "Gómez", direccion: "Av. Díaz Mirón 340, Veracruz", correo: "luis.perez@example.com" },
  { nombre: "Carlos", apellido_paterno: "Hernández", apellido_materno: "Vargas", direccion: "Restaurante El Malecon, Blvd. Ávila Camacho 110, Boca del Río", correo: "carlos.mariscos@example.com" },
  { nombre: "María Elena", apellido_paterno: "Castillo", apellido_materno: "Morales", direccion: "Pescadería La Estrella, Mercado Hidalgo Loc. 45, Veracruz", correo: "maria.pescaderia@example.com" },
  { nombre: "Roberto", apellido_paterno: "Navarro", apellido_materno: "Salgado", direccion: "Marisquería El Pescador, Callejón Toña La Negra 88, Veracruz", correo: "roberto.navarro@example.com" },
  { nombre: "Sofia", apellido_paterno: "Mendoza", apellido_materno: "Ríos", direccion: "Hotel & Mariscos Costa Dorada, Av. Costanera 500, Veracruz", correo: "sofia.mendoza@example.com" },
  { nombre: "Fernando", apellido_paterno: "Cruz", apellido_materno: "Alonso", direccion: "Distribuidora del Golfo, Bodega 3 Central de Abastos", correo: "fernando.distribuidora@example.com" },
  { nombre: "Patricia", apellido_paterno: "Vázquez", apellido_materno: "Domínguez", direccion: "Coctelería Doña Paty, Playas del Sur S/N, Veracruz", correo: "patricia.vazquez@example.com" },
];

const compradoresCreados = [];
for (const c of listaCompradores) {
  const [comprador] = await Comprador.findOrCreate({
    where: { correo: c.correo },
    defaults: c,
  });
  compradoresCreados.push(comprador);
}

// Fechas relativas de prueba para el calendario
const ahora = new Date();
const ayer = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
const hace2Dias = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
const hace4Dias = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

// Catálogo de lotes de prueba distribuidos en fechas
const lotesPrueba = [
  // --- COMPRAS DE HOY ---
  {
    fecha: ahora,
    kilos: 135.5,
    numero_cajas: 11,
    precio_kilo_salida: 65,
    especies: [["Huachinango del Golfo", pescado]],
    comprador: compradoresCreados[0], // Ana
    final: 78.5,
  },
  {
    fecha: ahora,
    kilos: 92.0,
    numero_cajas: 9,
    precio_kilo_salida: 95,
    especies: [["Camarón Cristal Jumbo", marisco]],
    comprador: compradoresCreados[2], // Carlos
    final: 120.0,
  },
  {
    fecha: ahora,
    kilos: 64.2,
    numero_cajas: 6,
    precio_kilo_salida: 75,
    especies: [["Robalo Blanco", pescado], ["Sierra Fresca", pescado]],
    comprador: compradoresCreados[3], // María Elena
    final: 88.0,
  },

  // --- COMPRAS DE AYER ---
  {
    fecha: ayer,
    kilos: 110.0,
    numero_cajas: 10,
    precio_kilo_salida: 50,
    especies: [["Mojarra Tilapia", pescado]],
    comprador: compradoresCreados[1], // Luis
    final: 58.0,
  },
  {
    fecha: ayer,
    kilos: 78.5,
    numero_cajas: 7,
    precio_kilo_salida: 110,
    especies: [["Pulpo Maya Fresco", molusco]],
    comprador: compradoresCreados[4], // Roberto
    final: 135.5,
  },
  {
    fecha: ayer,
    kilos: 45.0,
    numero_cajas: 4,
    precio_kilo_salida: 80,
    especies: [["Jaiba Azul", marisco], ["Ostión de Laguna", molusco]],
    comprador: compradoresCreados[5], // Sofia
    final: 94.0,
  },

  // --- COMPRAS DE HACE 2 DÍAS ---
  {
    fecha: hace2Dias,
    kilos: 150.0,
    numero_cajas: 15,
    precio_kilo_salida: 60,
    especies: [["Cazón de Altura", pescado]],
    comprador: compradoresCreados[6], // Fernando
    final: 72.0,
  },
  {
    fecha: hace2Dias,
    kilos: 85.0,
    numero_cajas: 8,
    precio_kilo_salida: 85,
    especies: [["Peto Veracruzano", pescado]],
    comprador: compradoresCreados[7], // Patricia
    final: 98.0,
  },

  // --- COMPRAS DE HACE 4 DÍAS ---
  {
    fecha: hace4Dias,
    kilos: 125.0,
    numero_cajas: 12,
    precio_kilo_salida: 70,
    especies: [["Huachinango del Golfo", pescado], ["Robalo Blanco", pescado]],
    comprador: compradoresCreados[0],
    final: 84.5,
  },

  // --- COMPRAS DE HACE 7 DÍAS ---
  {
    fecha: hace7Dias,
    kilos: 105.0,
    numero_cajas: 10,
    precio_kilo_salida: 120,
    especies: [["Camarón Café de Roca", marisco]],
    comprador: compradoresCreados[2],
    final: 140.0,
  },

  // --- LOTES DISPONIBLES (SIN COMPRAR) PARA PRUEBA DE REGISTRO ---
  {
    fecha: ahora,
    kilos: 88.0,
    numero_cajas: 8,
    precio_kilo_salida: 62.0,
    especies: [["Robalo de Muelle", pescado]],
    comprador: null, // Lote libre
  },
  {
    fecha: ahora,
    kilos: 52.5,
    numero_cajas: 5,
    precio_kilo_salida: 95.0,
    especies: [["Ostión Fresco en Concha", molusco]],
    comprador: null, // Lote libre
  },
  {
    fecha: ahora,
    kilos: 40.0,
    numero_cajas: 4,
    precio_kilo_salida: 130.0,
    especies: [["Langosta Espinosa", marisco]],
    comprador: null, // Lote libre
  },
];

console.log("Cargando lotes y compras de prueba...");

for (const item of lotesPrueba) {
  const lote = await Lote.create({
    kilos: item.kilos,
    numero_cajas: item.numero_cajas,
    precio_kilo_salida: item.precio_kilo_salida,
    fecha: item.fecha,
  });

  for (const [nombre, tipo] of item.especies) {
    await Especie.create({
      nombre,
      id_lte: lote.id_lte,
      id_tpo: tipo.id_tpo,
    });
  }

  if (item.comprador) {
    await Compra.create({
      id_cmp: lote.id_lte,
      codigo_cpr: item.comprador.codigo_cpr,
      precio_kilo_final: item.final,
      precio_total: redondea(item.kilos * item.final),
      fecha: item.fecha,
    });
  }
}

console.log("✅ Datos de prueba ampliados cargados exitosamente.");
console.log(`- ${listaCompradores.length} compradores registrados.`);
console.log(`- ${lotesPrueba.length} lotes generados (con compras en múltiples fechas y lotes libres).`);

await db.close();
