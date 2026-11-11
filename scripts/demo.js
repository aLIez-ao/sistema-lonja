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
}

// Fechas relativas de prueba para el calendario.
// - haceMinutos: para los lotes de HOY (siempre en el pasado).
// - diasAtras: fecha de hace N días con hora y minutos específicos
//   (simula las subastas de la madrugada y variación horaria real).
// - fechaPasada: fecha exacta de años anteriores para variar el año.
const haceMinutos = (m) => new Date(Date.now() - m * 60 * 1000);
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

const especiesDistintas = new Set(
  lotesPrueba.flatMap((l) => l.especies.map(([nombre]) => nombre))
).size;
const comprasGeneradas = lotesPrueba.filter((l) => l.comprador).length;

console.log("\x1b[32mDatos de prueba ampliados cargados exitosamente.\x1b[0m");
console.log(`- ${listaCompradores.length} compradores registrados.`);
console.log(`- ${lotesPrueba.length} lotes generados (${comprasGeneradas} compras en múltiples fechas y años, ${lotesPrueba.length - comprasGeneradas} lotes libres).`);
console.log(`- ${especiesDistintas} especies distintas registradas.`);

await db.close();
