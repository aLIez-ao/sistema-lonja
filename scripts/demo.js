// Generador de datos de prueba ampliados para el Sistema Lonja
import db from "../config/db.js";
import { Tipo, Comprador, Lote, Especie, Compra, EspecieCatalogo, Usuario, DireccionEntrega, Pedido, PedidoItem, CarritoItem, Lista, ListaItem, Pregunta, Opinion } from "../models/index.js";
import { crearTiposIniciales, crearAdministradorInicial } from "../helpers/semillas.js";
import { asegurarEsquema } from "../helpers/migraciones.js";
import { redondea } from "../helpers/fechas.js";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DataTypes, Op } from "sequelize";

const DemoRegistro = db.define("DemoRegistro", {
  tipo: { type: DataTypes.STRING(24), primaryKey: true },
  id_registro: { type: DataTypes.STRING(40), primaryKey: true },
}, { tableName: "demo_registro", timestamps: false });

export async function cargarDemo(database = db, { limpio = false } = {}) {
  if (database !== db) throw new Error("cargarDemo requiere la conexión configurada del proyecto.");
  await db.sync();
  await asegurarEsquema();
  await crearTiposIniciales();
  await crearAdministradorInicial();

  if (limpio) {
    const marcas = await DemoRegistro.findAll({ raw: true });
    const ids = (tipo) => marcas.filter((m) => m.tipo === tipo).map((m) => m.id_registro);
    const idsNum = (tipo) => ids(tipo).map(Number).filter(Number.isFinite);
    const pedidoIds = idsNum("pedido"); const listaIds = idsNum("lista"); const loteIds = idsNum("lote");
    await PedidoItem.destroy({ where: { id_ped: { [Op.in]: pedidoIds } } });
    await Compra.destroy({ where: { id_cmp: { [Op.in]: [...idsNum("compra"), ...loteIds] } } });
    await Pedido.destroy({ where: { id_ped: { [Op.in]: pedidoIds } } });
    await Pregunta.destroy({ where: { id_usuario: { [Op.in]: idsNum("usuario") } } });
    await Opinion.destroy({ where: { id_usuario: { [Op.in]: idsNum("usuario") } } });
    await ListaItem.destroy({ where: { id_lista: { [Op.in]: listaIds } } });
    await Lista.destroy({ where: { id_lista: { [Op.in]: listaIds } } });
    await CarritoItem.destroy({ where: { id_usuario: { [Op.in]: idsNum("usuario") } } });
    await DireccionEntrega.destroy({ where: { id_dir: { [Op.in]: idsNum("direccion") } } });
    await Usuario.destroy({ where: { id: { [Op.in]: idsNum("usuario") } } });
    await Comprador.destroy({ where: { codigo_cpr: { [Op.in]: idsNum("comprador") } } });
    await Especie.destroy({ where: { id_lte: { [Op.in]: loteIds } } });
    await Lote.destroy({ where: { id_lte: { [Op.in]: loteIds } } });
    await EspecieCatalogo.destroy({ where: { id_cat: { [Op.in]: idsNum("catalogo") } } });
    await DemoRegistro.destroy({ where: {} });
    console.log("Datos demo identificados eliminados.");
  }

const [pescado, marisco, molusco] = await Promise.all([
  Tipo.findOne({ where: { nombre: "Pescado" } }),
  Tipo.findOne({ where: { nombre: "Marisco" } }),
  Tipo.findOne({ where: { nombre: "Molusco" } }),
]);

// 1. Amplia lista de Compradores (Restaurantes, Pescaderías, Marisquerías,
//    Coctelerías, Hoteles y Mayoristas de Veracruz y municipios cercanos)
const listaCompradores = [
  { nombre: "Ana", apellido_paterno: "López", apellido_materno: "Ruiz", direccion: "Calle Hidalgo 12, Centro Histórico, Veracruz", correo: "ana.lopez@example.com" },
  { nombre: "Luis", apellido_paterno: "Pérez", apellido_materno: "Gómez", direccion: "Av. Díaz Mirón 340, Veracruz", correo: "luis.perez@example.com" },
  { nombre: "Carlos", apellido_paterno: "Hernández", apellido_materno: "Vargas", direccion: "Restaurante El Malecon, Blvd. Ávila Camacho 110, Boca del Río", correo: "carlos.mariscos@example.com" },
  { nombre: "María Elena", apellido_paterno: "Castillo", apellido_materno: "Morales", direccion: "Pescadería La Estrella, Mercado Hidalgo Loc. 45, Veracruz", correo: "maria.pescaderia@example.com" },
  { nombre: "Roberto", apellido_paterno: "Navarro", apellido_materno: "Salgado", direccion: "Marisquería El Pescador, Callejón Toña La Negra 88, Veracruz", correo: "roberto.navarro@example.com" },
  { nombre: "Sofia", apellido_paterno: "Mendoza", apellido_materno: "Ríos", direccion: "Hotel & Mariscos Costa Dorada, Av. Costanera 500, Veracruz", correo: "sofia.mendoza@example.com" },
  { nombre: "Fernando", apellido_paterno: "Cruz", apellido_materno: "Alonso", direccion: "Distribuidora del Golfo, Bodega 3 Central de Abastos", correo: "fernando.distribuidora@example.com" },
  { nombre: "Patricia", apellido_paterno: "Vázquez", apellido_materno: "Domínguez", direccion: "Coctelería Doña Paty, Playas del Sur S/N, Veracruz", correo: "patricia.vazquez@example.com" },
  { nombre: "José Antonio", apellido_paterno: "Ramírez", apellido_materno: "Ledesma", direccion: "Marisquería El Delfín, Av. Ruiz Cortines 2205, Veracruz", correo: "jantonio.ramirez@gmail.com" },
  { nombre: "Gabriela", apellido_paterno: "Santos", apellido_materno: "Ferreira", direccion: "Pescadería El Anzuelo, Mercado Jáuregui Loc. 12, Veracruz", correo: "gabriela.santos@outlook.com" },
  { nombre: "Miguel Ángel", apellido_paterno: "Rosales", apellido_materno: "Prieto", direccion: "Restaurante La Palapa, Zona Portuaria, Coatzacoalcos", correo: "miguel.rosales@outlook.com" },
  { nombre: "Carmen", apellido_paterno: "Domínguez", apellido_materno: "Serra", direccion: "Coctelería La Sirena, Blvd. Cárdenas del Río 45, Poza Rica", correo: "carmen.dominguez@hotmail.com" },
  { nombre: "Andrés", apellido_paterno: "Villalobos", apellido_materno: "Pineda", direccion: "Frigorífico El Norte, Carretera Costera Km 8, Tuxpan", correo: "andres.villalobos@friogolfo.mx" },
  { nombre: "Lucía", apellido_paterno: "Ferrer", apellido_materno: "Cámara", direccion: "Marisquería Doña Lupe, Calle Enríquez 78, Xalapa", correo: "lucia.ferrer@yahoo.com.mx" },
  { nombre: "Óscar", apellido_paterno: "Bravo", apellido_materno: "Zamudio", direccion: "Restaurante El Faro, Playa Norte, Alvarado", correo: "oscar.bravo@hotelesfaro.com" },
  { nombre: "Diana", apellido_paterno: "Reyes", apellido_materno: "Montaño", direccion: "Pescadería La Almeja de Oro, Av. 5 Poniente 210, Orizaba", correo: "diana.reyes.montano@gmail.com" },
  { nombre: "Héctor", apellido_paterno: "Aguilar", apellido_materno: "Córdova", direccion: "Mariscos El Puente, Calle 7 Núm. 302, Col. Centro, Córdoba", correo: "hector.aguilar.cordova@gmail.com" },
  { nombre: "Valeria", apellido_paterno: "Ochoa", apellido_materno: "Betancourt", direccion: "Coctelería La Velera, Av. Úrsulo Galván 89, Medellín de Bravo", correo: "valeria.ochoa@marvalver.com.mx" },
];

const compradoresCreados = [];
for (const c of listaCompradores) {
  const [comprador] = await Comprador.findOrCreate({
    where: { correo: c.correo },
    defaults: c,
  });
  compradoresCreados.push(comprador);
  await DemoRegistro.findOrCreate({ where: { tipo: "comprador", id_registro: String(comprador.codigo_cpr) } });
}

// Fechas relativas de prueba para el calendario.
// - haceMinutos: para los lotes de HOY (siempre en el pasado).
// - diasAtras: fecha de hace N días con hora y minutos específicos
//   (simula las subastas de la madrugada y variación horaria real).
// - fechaPasada: fecha exacta de años anteriores para variar el año.
const haceMinutos = (m) => { const d = new Date(); d.setHours(5, 0, 0, 0); d.setMinutes(d.getMinutes() + m); return d; };
const diasAtras = (dias, hora = 6, minuto = 0) => {
  const f = new Date();
  f.setDate(f.getDate() - dias);
  f.setHours(hora, minuto, 0, 0);
  return f;
};
const fechaPasada = (anio, mes, dia, hora = 6, minuto = 0) =>
  new Date(anio, mes - 1, dia, hora, minuto, 0, 0);

// Catálogo de lotes de prueba distribuidos en fechas
const lotesPrueba = [
  // --- COMPRAS DE HOY ---
  {
    fecha: haceMinutos(8),
    kilos: 135.5,
    numero_cajas: 11,
    precio_kilo_salida: 65,
    especies: [["Huachinango del Golfo", pescado]],
    comprador: compradoresCreados[0], // Ana
    final: 78.5,
  },
  {
    fecha: haceMinutos(26),
    kilos: 92.0,
    numero_cajas: 9,
    precio_kilo_salida: 95,
    especies: [["Camarón Cristal Jumbo", marisco]],
    comprador: compradoresCreados[2], // Carlos
    final: 120.0,
  },
  {
    fecha: haceMinutos(55),
    kilos: 64.2,
    numero_cajas: 6,
    precio_kilo_salida: 75,
    especies: [["Robalo Blanco", pescado], ["Sierra Fresca", pescado]],
    comprador: compradoresCreados[3], // María Elena
    final: 88.0,
  },
  {
    fecha: haceMinutos(83),
    kilos: 27.4,
    numero_cajas: 3,
    precio_kilo_salida: 140,
    especies: [["Langostino del Norte", marisco]],
    comprador: compradoresCreados[13], // Lucía
    final: 162.5,
  },

  // --- LOTES DISPONIBLES DE HOY (SIN COMPRAR) PARA PRUEBA DE REGISTRO ---
  {
    fecha: haceMinutos(12),
    kilos: 88.0,
    numero_cajas: 8,
    precio_kilo_salida: 62.0,
    especies: [["Robalo de Muelle", pescado]],
    comprador: null, // Lote libre
  },
  {
    fecha: haceMinutos(41),
    kilos: 52.5,
    numero_cajas: 5,
    precio_kilo_salida: 95.0,
    especies: [["Ostión Fresco en Concha", molusco]],
    comprador: null, // Lote libre
  },
  {
    fecha: haceMinutos(74),
    kilos: 40.0,
    numero_cajas: 4,
    precio_kilo_salida: 130.0,
    especies: [["Langosta Espinosa", marisco]],
    comprador: null, // Lote libre
  },
  {
    fecha: haceMinutos(97),
    kilos: 15.8,
    numero_cajas: 2,
    precio_kilo_salida: 110.0,
    especies: [["Caracol Burgado", molusco]],
    comprador: null, // Lote libre
  },

  // --- COMPRAS DE AYER ---
  {
    fecha: diasAtras(1, 5, 40),
    kilos: 110.0,
    numero_cajas: 10,
    precio_kilo_salida: 50,
    especies: [["Mojarra Tilapia", pescado]],
    comprador: compradoresCreados[1], // Luis
    final: 58.0,
  },
  {
    fecha: diasAtras(1, 6, 25),
    kilos: 78.5,
    numero_cajas: 7,
    precio_kilo_salida: 110,
    especies: [["Pulpo Maya Fresco", molusco]],
    comprador: compradoresCreados[4], // Roberto
    final: 135.5,
  },
  {
    fecha: diasAtras(1, 7, 10),
    kilos: 45.0,
    numero_cajas: 4,
    precio_kilo_salida: 80,
    especies: [["Jaiba Azul", marisco], ["Ostión de Laguna", molusco]],
    comprador: compradoresCreados[5], // Sofia
    final: 94.0,
  },
  {
    fecha: diasAtras(1, 8, 45),
    kilos: 210.3,
    numero_cajas: 18,
    precio_kilo_salida: 48,
    especies: [["Sardina Monterrey", pescado]],
    comprador: compradoresCreados[8], // José Antonio
    final: 52.5,
  },
  {
    fecha: diasAtras(1, 9, 20),
    kilos: 33.6,
    numero_cajas: 3,
    precio_kilo_salida: 105,
    especies: [["Almeja Chocolata", molusco]],
    comprador: null, // Lote libre
  },

  // --- COMPRAS DE HACE 2 DÍAS ---
  {
    fecha: diasAtras(2, 5, 55),
    kilos: 150.0,
    numero_cajas: 15,
    precio_kilo_salida: 60,
    especies: [["Cazón de Altura", pescado]],
    comprador: compradoresCreados[6], // Fernando
    final: 72.0,
  },
  {
    fecha: diasAtras(2, 6, 30),
    kilos: 85.0,
    numero_cajas: 8,
    precio_kilo_salida: 85,
    especies: [["Peto Veracruzano", pescado]],
    comprador: compradoresCreados[7], // Patricia
    final: 98.0,
  },
  {
    fecha: diasAtras(2, 7, 15),
    kilos: 67.8,
    numero_cajas: 7,
    precio_kilo_salida: 90,
    especies: [["Camarón Blanco", marisco], ["Calamar de Castilla", molusco]],
    comprador: compradoresCreados[9], // Gabriela
    final: 104.5,
  },
  {
    fecha: diasAtras(2, 10, 5),
    kilos: 60.9,
    numero_cajas: 6,
    precio_kilo_salida: 72,
    especies: [["Picuda del Arrecife", pescado]],
    comprador: null, // Lote libre
  },

  // --- COMPRAS DE HACE 3 DÍAS ---
  {
    fecha: diasAtras(3, 5, 30),
    kilos: 124.6,
    numero_cajas: 12,
    precio_kilo_salida: 68,
    especies: [["Corvina Rayada", pescado]],
    comprador: compradoresCreados[10], // Miguel Ángel
    final: 79.9,
  },
  {
    fecha: diasAtras(3, 6, 50),
    kilos: 58.2,
    numero_cajas: 6,
    precio_kilo_salida: 102,
    especies: [["Camarón Cristal Jumbo", marisco]],
    comprador: compradoresCreados[11], // Carmen
    final: 126.8,
  },
  {
    fecha: diasAtras(3, 8, 15),
    kilos: 96.4,
    numero_cajas: 9,
    precio_kilo_salida: 82,
    especies: [["Mero de Cuevas", pescado], ["Pámpano Real", pescado]],
    comprador: compradoresCreados[12], // Andrés
    final: 95.0,
  },
  {
    fecha: diasAtras(3, 11, 25),
    kilos: 25.4,
    numero_cajas: 3,
    precio_kilo_salida: 88,
    especies: [["Cangrejo Moro", marisco]],
    comprador: null, // Lote libre
  },

  // --- COMPRAS DE HACE 4 DÍAS ---
  {
    fecha: diasAtras(4, 5, 45),
    kilos: 125.0,
    numero_cajas: 12,
    precio_kilo_salida: 70,
    especies: [["Huachinango del Golfo", pescado], ["Robalo Blanco", pescado]],
    comprador: compradoresCreados[14], // Óscar
    final: 84.5,
  },
  {
    fecha: diasAtras(4, 6, 35),
    kilos: 72.9,
    numero_cajas: 8,
    precio_kilo_salida: 55,
    especies: [["Trucha Arcoíris", pescado]],
    comprador: compradoresCreados[15], // Diana
    final: 63.5,
  },
  {
    fecha: diasAtras(4, 7, 55),
    kilos: 36.5,
    numero_cajas: 4,
    precio_kilo_salida: 150,
    especies: [["Langosta Espinosa", marisco]],
    comprador: compradoresCreados[16], // Héctor
    final: 178.0,
  },
  {
    fecha: diasAtras(4, 12, 10),
    kilos: 47.7,
    numero_cajas: 5,
    precio_kilo_salida: 58,
    especies: [["Mejillón de Roca", molusco]],
    comprador: null, // Lote libre
  },

  // --- COMPRAS DE HACE 5 DÍAS ---
  {
    fecha: diasAtras(5, 5, 20),
    kilos: 41.2,
    numero_cajas: 5,
    precio_kilo_salida: 98,
    especies: [["Ostión de Laguna", molusco]],
    comprador: compradoresCreados[17], // Valeria
    final: 118.5,
  },
  {
    fecha: diasAtras(5, 6, 45),
    kilos: 133.7,
    numero_cajas: 13,
    precio_kilo_salida: 42,
    especies: [["Lisa Estuarina", pescado], ["Bagre de Río", pescado]],
    comprador: compradoresCreados[0], // Ana
    final: 48.9,
  },

  // --- COMPRAS DE HACE 7 DÍAS ---
  {
    fecha: diasAtras(7, 5, 35),
    kilos: 105.0,
    numero_cajas: 10,
    precio_kilo_salida: 120,
    especies: [["Camarón Café de Roca", marisco]],
    comprador: compradoresCreados[3], // María Elena
    final: 140.0,
  },
  {
    fecha: diasAtras(7, 6, 20),
    kilos: 88.4,
    numero_cajas: 9,
    precio_kilo_salida: 38,
    especies: [["Chucumite", pescado], ["Lebrancha", pescado]],
    comprador: compradoresCreados[5], // Sofia
    final: 44.5,
  },
  {
    fecha: diasAtras(7, 7, 40),
    kilos: 29.9,
    numero_cajas: 3,
    precio_kilo_salida: 125,
    especies: [["Pulpo Rojo del Arrecife", molusco]],
    comprador: compradoresCreados[9], // Gabriela
    final: 149.0,
  },

  // --- COMPRAS DE HACE 10 DÍAS ---
  {
    fecha: diasAtras(10, 5, 15),
    kilos: 118.8,
    numero_cajas: 11,
    precio_kilo_salida: 58,
    especies: [["Barracuda del Golfo", pescado]],
    comprador: compradoresCreados[2], // Carlos
    final: 66.0,
  },
  {
    fecha: diasAtras(10, 6, 55),
    kilos: 164.2,
    numero_cajas: 15,
    precio_kilo_salida: 88,
    especies: [["Camarón Blanco", marisco]],
    comprador: compradoresCreados[6], // Fernando
    final: 101.9,
  },

  // --- COMPRAS DE HACE 12 DÍAS ---
  {
    fecha: diasAtras(12, 5, 50),
    kilos: 142.5,
    numero_cajas: 14,
    precio_kilo_salida: 46,
    especies: [["Jurel de Castilla", pescado]],
    comprador: compradoresCreados[11], // Carmen
    final: 53.8,
  },
  {
    fecha: diasAtras(12, 7, 25),
    kilos: 37.7,
    numero_cajas: 4,
    precio_kilo_salida: 92,
    especies: [["Almeja Chocolata", molusco], ["Ostión de Laguna", molusco]],
    comprador: compradoresCreados[13], // Lucía
    final: 108.0,
  },

  // --- COMPRAS DE HACE 15 DÍAS ---
  {
    fecha: diasAtras(15, 6, 10),
    kilos: 101.3,
    numero_cajas: 10,
    precio_kilo_salida: 52,
    especies: [["Mojarra Tilapia", pescado], ["Corvina Rayada", pescado]],
    comprador: compradoresCreados[1], // Luis
    final: 60.5,
  },
  {
    fecha: diasAtras(15, 8, 30),
    kilos: 24.6,
    numero_cajas: 2,
    precio_kilo_salida: 145,
    especies: [["Langostino del Norte", marisco]],
    comprador: compradoresCreados[7], // Patricia
    final: 170.0,
  },

  // --- COMPRAS DE HACE 21 DÍAS ---
  {
    fecha: diasAtras(21, 5, 25),
    kilos: 187.3,
    numero_cajas: 17,
    precio_kilo_salida: 40,
    especies: [["Sierra Fresca", pescado], ["Sardina Monterrey", pescado], ["Chucumite", pescado]],
    comprador: compradoresCreados[10], // Miguel Ángel
    final: 47.5,
  },
  {
    fecha: diasAtras(21, 7, 5),
    kilos: 53.1,
    numero_cajas: 5,
    precio_kilo_salida: 85,
    especies: [["Calamar de Castilla", molusco]],
    comprador: compradoresCreados[4], // Roberto
    final: 99.9,
  },

  // --- COMPRAS DE 2025 ---
  {
    fecha: fechaPasada(2025, 12, 18, 6, 10),
    kilos: 118.6,
    numero_cajas: 10,
    precio_kilo_salida: 74,
    especies: [["Huachinango del Golfo", pescado]],
    comprador: compradoresCreados[0], // Ana
    final: 89.5,
  },
  {
    fecha: fechaPasada(2025, 9, 5, 5, 35),
    kilos: 64.9,
    numero_cajas: 6,
    precio_kilo_salida: 96,
    especies: [["Pulpo Maya Fresco", molusco]],
    comprador: compradoresCreados[17], // Valeria
    final: 117.0,
  },
  {
    fecha: fechaPasada(2025, 6, 21, 7, 20),
    kilos: 205.4,
    numero_cajas: 16,
    precio_kilo_salida: 44,
    especies: [["Sardina Monterrey", pescado]],
    comprador: compradoresCreados[8], // José Antonio
    final: 49.8,
  },
  {
    fecha: fechaPasada(2025, 2, 14, 6, 45),
    kilos: 43.3,
    numero_cajas: 4,
    precio_kilo_salida: 132,
    especies: [["Langosta Espinosa", marisco]],
    comprador: compradoresCreados[16], // Héctor
    final: 158.0,
  },

  // --- COMPRAS DE 2024 ---
  {
    fecha: fechaPasada(2024, 11, 9, 5, 50),
    kilos: 97.2,
    numero_cajas: 9,
    precio_kilo_salida: 68,
    especies: [["Robalo Blanco", pescado], ["Sierra Fresca", pescado]],
    comprador: compradoresCreados[3], // María Elena
    final: 81.5,
  },
  {
    fecha: fechaPasada(2024, 7, 30, 6, 5),
    kilos: 152.8,
    numero_cajas: 14,
    precio_kilo_salida: 52,
    especies: [["Cazón de Altura", pescado]],
    comprador: compradoresCreados[14], // Óscar
    final: 63.0,
  },
  {
    fecha: fechaPasada(2024, 3, 12, 7, 35),
    kilos: 55.6,
    numero_cajas: 5,
    precio_kilo_salida: 108,
    especies: [["Camarón Café de Roca", marisco]],
    comprador: compradoresCreados[15], // Diana
    final: 129.9,
  },
  {
    fecha: fechaPasada(2024, 5, 18, 8, 40),
    kilos: 38.1,
    numero_cajas: 4,
    precio_kilo_salida: 79,
    especies: [["Jaiba Azul", marisco]],
    comprador: null, // Lote libre
  },

  // --- COMPRAS DE 2023 ---
  {
    fecha: fechaPasada(2023, 10, 3, 6, 20),
    kilos: 126.7,
    numero_cajas: 11,
    precio_kilo_salida: 61,
    especies: [["Peto Veracruzano", pescado]],
    comprador: compradoresCreados[10], // Miguel Ángel
    final: 73.4,
  },
  {
    fecha: fechaPasada(2023, 4, 27, 5, 45),
    kilos: 49.9,
    numero_cajas: 5,
    precio_kilo_salida: 94,
    especies: [["Almeja Chocolata", molusco]],
    comprador: compradoresCreados[9], // Gabriela
    final: 112.5,
  },
  {
    fecha: fechaPasada(2023, 8, 16, 9, 10),
    kilos: 71.3,
    numero_cajas: 7,
    precio_kilo_salida: 57,
    especies: [["Lisa Estuarina", pescado]],
    comprador: null, // Lote libre
  },

  // --- COMPRAS DE 2022 ---
  {
    fecha: fechaPasada(2022, 12, 7, 6, 30),
    kilos: 88.8,
    numero_cajas: 8,
    precio_kilo_salida: 86,
    especies: [["Camarón Blanco", marisco]],
    comprador: compradoresCreados[13], // Lucía
    final: 103.6,
  },
];

console.log("Cargando lotes y compras de prueba...");

for (const item of lotesPrueba) {
  let lote = await Lote.findOne({ where: { kilos: item.kilos, numero_cajas: item.numero_cajas, precio_kilo_salida: item.precio_kilo_salida, fecha: item.fecha } });
  if (!lote) lote = await Lote.create({ kilos: item.kilos, numero_cajas: item.numero_cajas, precio_kilo_salida: item.precio_kilo_salida, fecha: item.fecha });
  await DemoRegistro.findOrCreate({ where: { tipo: "lote", id_registro: String(lote.id_lte) } });

  for (const [nombre, tipo] of item.especies) {
    const catalogo = await EspecieCatalogo.findOne({ where: { nombre } });
    const [especie] = await Especie.findOrCreate({ where: { nombre, id_lte: lote.id_lte }, defaults: { id_tpo: tipo.id_tpo, id_cat: catalogo?.id_cat } });
    if (catalogo) await especie.update({ id_cat: catalogo.id_cat });
  }

  if (item.comprador) {
    const [compra] = await Compra.findOrCreate({ where: { id_cmp: lote.id_lte }, defaults: { codigo_cpr: item.comprador.codigo_cpr, precio_kilo_final: item.final, precio_total: redondea(item.kilos * item.final), fecha: item.fecha } });
    await DemoRegistro.findOrCreate({ where: { tipo: "compra", id_registro: String(compra.id_cmp) } });
  }
}

// A catalog item for every historical species, with a predictable short description.
const tiposPorNombre = new Map(lotesPrueba.flatMap((l) => l.especies.map(([nombre, tipo]) => [nombre, tipo])));
const catalogos = new Map();
const lotesDemoIds = (await DemoRegistro.findAll({ where: { tipo: "lote" }, attributes: ["id_registro"], raw: true })).map((r) => Number(r.id_registro));
for (const [nombre, tipo] of tiposPorNombre) {
  let catalogo = await EspecieCatalogo.findOne({ where: { nombre } });
  const propio = !catalogo;
  if (!catalogo) catalogo = await EspecieCatalogo.create({ nombre, id_tpo: tipo.id_tpo, descripcion: `${nombre} de las costas del Golfo de México.`, activo: true });
  catalogos.set(nombre, catalogo);
  await Especie.update({ id_cat: catalogo.id_cat }, { where: { nombre, id_cat: null, id_lte: { [Op.in]: lotesDemoIds } } });
  if (propio) await DemoRegistro.findOrCreate({ where: { tipo: "catalogo", id_registro: String(catalogo.id_cat) } });
}

// Six deterministic online buyers (the last one remains unverified) and addresses.
const compradoresWeb = [];
let capturistaDemo = await Usuario.findOne({ where: { usuario: "demo_capturista" } });
if (!capturistaDemo) capturistaDemo = await Usuario.create({ usuario: "demo_capturista", nombre_completo: "Capturista Demo", correo: "capturista@demo.lonja.test", password: "LonjaDemo2026", rol: "capturista", email_verificado: true });
await DemoRegistro.findOrCreate({ where: { tipo: "usuario", id_registro: String(capturistaDemo.id) } });
for (let i = 0; i < 6; i += 1) {
  const correo = `comprador${i + 1}@demo.lonja.test`;
  let comprador = await Comprador.findOne({ where: { correo } });
  if (!comprador) comprador = await Comprador.create({ nombre: ["Marina", "Carlos", "Lucía", "Jorge", "Elena", "Noé"][i], apellido_paterno: "Demo", apellido_materno: "Lonja", correo, direccion: "Veracruz, Veracruz" });
  await DemoRegistro.findOrCreate({ where: { tipo: "comprador", id_registro: String(comprador.codigo_cpr) } });
  let usuario = await Usuario.findOne({ where: { usuario: `demo_comprador${i + 1}` } });
  if (!usuario) usuario = await Usuario.create({ usuario: `demo_comprador${i + 1}`, nombre_completo: `${comprador.nombre} Demo`, correo, password: "LonjaDemo2026", rol: "comprador", codigo_cpr: comprador.codigo_cpr, email_verificado: i < 5 });
  await DemoRegistro.findOrCreate({ where: { tipo: "usuario", id_registro: String(usuario.id) } });
  let direccion = await DireccionEntrega.findOne({ where: { id_usuario: usuario.id, alias: "Principal" } });
  if (!direccion) direccion = await DireccionEntrega.create({ id_usuario: usuario.id, alias: "Principal", destinatario: usuario.nombre_completo, telefono: "2291000000", calle: "Muelle Fiscal", num_ext: String(i + 1), colonia: "Centro", cp: "91700", municipio: "Veracruz", estado: "Veracruz", principal: true });
  await DemoRegistro.findOrCreate({ where: { tipo: "direccion", id_registro: String(direccion.id_dir) } });
  compradoresWeb.push({ comprador, usuario, direccion });
}

// At least 40 available lots, on the same deterministic daily schedule.
const lotesDisponiblesDemo = [];
for (let i = 0; i < 40; i += 1) {
  const fecha = haceMinutos(20 + i * 3);
  const kilos = 20 + ((i * 17) % 180);
  const cajas = 2 + (i % 18);
  const precio = 35 + ((i * 13) % 125);
  const existente = await Lote.findOne({ where: { fecha, kilos, numero_cajas: cajas, precio_kilo_salida: precio } });
  const lote = existente || await Lote.create({ fecha, kilos, numero_cajas: cajas, precio_kilo_salida: precio });
  await DemoRegistro.findOrCreate({ where: { tipo: "lote", id_registro: String(lote.id_lte) } });
  const especie = [...catalogos.values()][i % catalogos.size];
  await Especie.findOrCreate({ where: { id_lte: lote.id_lte, id_cat: especie.id_cat }, defaults: { nombre: especie.nombre, id_tpo: tiposPorNombre.get(especie.nombre).id_tpo } });
  lotesDisponiblesDemo.push(lote);
}

// Orders covering all lifecycle states with matching snapshots and purchases.
const estadosDemo = ["pendiente_pago", "pagado", "preparando", "enviado", "entregado", "expirado"];
for (let i = 0; i < estadosDemo.length; i += 1) {
  const lote = lotesDisponiblesDemo[40 - estadosDemo.length + i];
  const cuenta = compradoresWeb[i % compradoresWeb.length];
  const estado = estadosDemo[i];
  const [pedido] = await Pedido.findOrCreate({ where: { id_usuario: cuenta.usuario.id, notas: `DEMO-${estado}` }, defaults: {
    id_usuario: cuenta.usuario.id, codigo_cpr: cuenta.comprador.codigo_cpr, estado, entrega: i % 2 ? "recoger" : "domicilio",
    id_dir: i % 2 ? null : cuenta.direccion.id_dir, dir_destinatario: i % 2 ? null : cuenta.direccion.destinatario,
    dir_telefono: i % 2 ? null : cuenta.direccion.telefono, dir_texto: i % 2 ? "Muelle Fiscal de Veracruz" : `${cuenta.direccion.calle} ${cuenta.direccion.num_ext}, ${cuenta.direccion.colonia}, Veracruz`,
    subtotal: redondea(Number(lote.kilos) * Number(lote.precio_kilo_salida)), costo_envio: 0, total: redondea(Number(lote.kilos) * Number(lote.precio_kilo_salida)),
    reservado_hasta: estado === "pendiente_pago" ? new Date(Date.now() + 15 * 60000) : null,
    fecha_pago: ["pagado", "preparando", "enviado", "entregado"].includes(estado) ? new Date() : null, notas: `DEMO-${estado}`,
  } });
  await DemoRegistro.findOrCreate({ where: { tipo: "pedido", id_registro: String(pedido.id_ped) } });
  await PedidoItem.findOrCreate({ where: { id_ped: pedido.id_ped, id_lte: lote.id_lte }, defaults: { id_ped: pedido.id_ped, id_lte: lote.id_lte, kilos: lote.kilos, precio_kilo: lote.precio_kilo_salida, subtotal: pedido.subtotal } });
  if (["pagado", "preparando", "enviado", "entregado"].includes(estado)) {
    const [compra] = await Compra.findOrCreate({ where: { id_cmp: lote.id_lte }, defaults: { id_cmp: lote.id_lte, codigo_cpr: cuenta.comprador.codigo_cpr, id_ped: pedido.id_ped, precio_kilo_final: lote.precio_kilo_salida, precio_total: pedido.total } });
    await DemoRegistro.findOrCreate({ where: { tipo: "compra", id_registro: String(compra.id_cmp) } });
  }
}

// A small deterministic social graph, with opinions backed by purchases above.
for (let i = 0; i < compradoresWeb.length; i += 1) {
  const cuenta = compradoresWeb[i];
  let lista = await Lista.findOne({ where: { id_usuario: cuenta.usuario.id, nombre: "Favoritos" } });
  if (!lista) lista = await Lista.create({ id_usuario: cuenta.usuario.id, nombre: "Favoritos" });
  await DemoRegistro.findOrCreate({ where: { tipo: "lista", id_registro: String(lista.id_lista) } });
  const favorito = lotesDisponiblesDemo[i];
  await ListaItem.findOrCreate({ where: { id_lista: lista.id_lista, tipo: "lote", id_ref: favorito.id_lte }, defaults: { fecha: new Date() } });
  const especieFavorita = [...catalogos.values()][i % catalogos.size];
  await ListaItem.findOrCreate({ where: { id_lista: lista.id_lista, tipo: "especie", id_ref: especieFavorita.id_cat }, defaults: { fecha: new Date() } });
  const carros = lotesDisponiblesDemo.slice(i, i + 2).filter((l) => ![lotesDisponiblesDemo[34].id_lte, lotesDisponiblesDemo[35].id_lte, lotesDisponiblesDemo[36].id_lte, lotesDisponiblesDemo[37].id_lte, lotesDisponiblesDemo[38].id_lte].includes(l.id_lte));
  for (const lote of carros) await CarritoItem.findOrCreate({ where: { id_usuario: cuenta.usuario.id, id_lte: lote.id_lte }, defaults: { fecha: new Date() } });
  await Pregunta.findOrCreate({ where: { id_usuario: cuenta.usuario.id, texto: `Pregunta demo ${i + 1}` }, defaults: { id_usuario: cuenta.usuario.id, id_lte: favorito.id_lte, texto: `Pregunta demo ${i + 1}`, estado: i === 5 ? "oculta" : i % 3 === 0 ? "respondida" : "pendiente", respuesta: i % 3 === 0 ? "Respuesta de demostración." : null } });
  if (i < 4) {
    const compra = await Compra.findOne({ where: { codigo_cpr: cuenta.comprador.codigo_cpr, id_ped: { [Op.ne]: null } } });
    if (compra) {
      const especie = await Especie.findOne({ where: { id_lte: compra.id_cmp }, order: [["id_epe", "ASC"]] });
      if (especie?.id_cat) await Opinion.findOrCreate({ where: { id_usuario: cuenta.usuario.id, id_cat: especie.id_cat }, defaults: { id_usuario: cuenta.usuario.id, id_cat: especie.id_cat, estrellas: 3 + (i % 3), titulo: "Opinión de demostración", texto: "Producto recibido en buenas condiciones.", visible: true } });
    }
  }
}

const especiesDistintas = new Set(
  lotesPrueba.flatMap((l) => l.especies.map(([nombre]) => nombre))
).size;
const comprasGeneradas = lotesPrueba.filter((l) => l.comprador).length;

console.log("\x1b[32mDatos de prueba ampliados cargados exitosamente.\x1b[0m");
console.log(`- ${listaCompradores.length} compradores registrados.`);
console.log(`- ${lotesPrueba.length} lotes generados (${comprasGeneradas} compras en múltiples fechas y años, ${lotesPrueba.length - comprasGeneradas} lotes libres).`);
console.log(`- ${especiesDistintas} especies distintas registradas.`);
console.log("- Personal demo: demo_capturista / LonjaDemo2026 (solo desarrollo).");
console.log("- 6 cuentas comprador: demo_comprador1–6 / LonjaDemo2026 (solo desarrollo); la sexta no está verificada.");
console.log(`- ${await Lote.count()} lotes totales, ${await Pedido.count()} pedidos y ${await Opinion.count()} opiniones en la base.`);
return { compradores: listaCompradores.length + compradoresWeb.length, lotes: await Lote.count(), pedidos: await Pedido.count(), opiniones: await Opinion.count() };
}

const esPrincipal = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (esPrincipal) {
  const args = new Set(process.argv.slice(2));
  if (args.has("--limpio") && (!args.has("--confirmar") || process.env.NODE_ENV === "production")) {
    console.error("--limpio requiere --confirmar y no puede ejecutarse en NODE_ENV=production.");
    process.exitCode = 1;
  } else {
    try { await cargarDemo(db, { limpio: args.has("--limpio") }); }
    finally { await db.close(); }
  }
}
