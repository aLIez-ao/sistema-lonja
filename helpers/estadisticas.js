// Estadísticas del tablero de inicio.
import { Op } from "sequelize";
import { Compra, Lote, Comprador, Especie, Tipo } from "../models/index.js";
import { hoy, rangoDelDia, redondea, formatoFecha, formatoHora, NOMBRES_MESES } from "./fechas.js";

const DIA = 24 * 60 * 60 * 1000;
const claveDia = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TZ || "America/Mexico_City" }).format(new Date(d));

const sumar = (compras) => {
  const kilos = compras.reduce((s, c) => s + Number(c.lote.kilos), 0);
  const total = compras.reduce((s, c) => s + Number(c.precio_total), 0);
  return { compras: compras.length, kilos: redondea(kilos), total: redondea(total), precioMedio: kilos ? redondea(total / kilos) : 0 };
};

/** Variación porcentual respecto a un valor anterior; null si no hay con qué comparar. */
const variacion = (actual, anterior) => (anterior > 0 ? redondea(((actual - anterior) / anterior) * 100) : null);

const top = (mapa, campo, n = 5) =>
  [...mapa.entries()].map(([nombre, v]) => ({ nombre, ...v, [campo]: redondea(v[campo]) })).sort((a, b) => b[campo] - a[campo]).slice(0, n);

export async function estadisticasInicio() {
  const fechaHoy = hoy();
  const { inicio: inicioHoy, fin: finHoy } = rangoDelDia(fechaHoy);
  const [anio, mes] = fechaHoy.split("-").map(Number);
  const inicioMes = rangoDelDia(`${fechaHoy.slice(0, 8)}01`).inicio;
  const mesAnterior = mes === 1 ? `${anio - 1}-12-01` : `${anio}-${String(mes - 1).padStart(2, "0")}-01`;
  const inicioMesAnterior = rangoDelDia(mesAnterior).inicio;
  const inicio30 = new Date(inicioHoy.getTime() - 29 * DIA);
  const desde = new Date(Math.min(inicioMesAnterior.getTime(), inicio30.getTime()));

  const [compras, totalLotes, lotesVendidos, compradores, especies] = await Promise.all([
    Compra.findAll({
      where: { fecha: { [Op.gte]: desde, [Op.lt]: finHoy } },
      order: [["fecha", "DESC"]],
      include: [
        { model: Comprador, as: "comprador" },
        { model: Lote, as: "lote", include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }] },
      ],
    }),
    Lote.count(),
    Compra.count(),
    Comprador.count(),
    Especie.count({ distinct: true, col: "nombre" }),
  ]);

  const entre = (a, b) => compras.filter((c) => c.fecha >= a && c.fecha < b);
  const deHoy = sumar(entre(inicioHoy, finHoy));
  const deAyer = sumar(entre(new Date(inicioHoy.getTime() - DIA), inicioHoy));
  const comprasMes = entre(inicioMes, finHoy);
  const delMes = sumar(comprasMes);
  const delMesAnterior = sumar(entre(inicioMesAnterior, inicioMes));
  const ultimos30 = entre(inicio30, finHoy);

  // Serie diaria de los últimos 30 días (los días sin compras cuentan como 0)
  const porDia = new Map();
  for (let i = 0; i < 30; i++) porDia.set(claveDia(new Date(inicio30.getTime() + i * DIA + DIA / 2)), 0);
  for (const c of ultimos30) {
    const k = claveDia(c.fecha);
    if (porDia.has(k)) porDia.set(k, porDia.get(k) + Number(c.precio_total));
  }

  const porEspecie = new Map();
  const porComprador = new Map();
  let sobreprecio = 0;
  let conSalida = 0;
  for (const c of ultimos30) {
    for (const nombre of new Set(c.lote.especies.map((e) => e.nombre))) {
      const acc = porEspecie.get(nombre) ?? { kilos: 0 };
      acc.kilos += Number(c.lote.kilos);
      porEspecie.set(nombre, acc);
    }
    const salida = Number(c.lote.precio_kilo_salida);
    if (salida > 0) { sobreprecio += (Number(c.precio_kilo_final) - salida) / salida; conSalida += 1; }
  }
  for (const c of comprasMes) {
    const nombre = `${c.comprador.nombre} ${c.comprador.apellido_paterno}`;
    const acc = porComprador.get(nombre) ?? { total: 0 };
    acc.total += Number(c.precio_total);
    porComprador.set(nombre, acc);
  }

  const topEspecies = top(porEspecie, "kilos");
  const topCompradores = top(porComprador, "total");
  const disponibles = Math.max(0, totalLotes - lotesVendidos);

  return {
    fecha: formatoFecha(inicioHoy.getTime() + DIA / 2),
    nombreMes: NOMBRES_MESES[mes - 1],
    hoy: { ...deHoy, variacionImporte: variacion(deHoy.total, deAyer.total) },
    mes: { ...delMes, variacionImporte: variacion(delMes.total, delMesAnterior.total), anterior: delMesAnterior.total },
    sobreprecioMedio: conSalida ? redondea((sobreprecio / conSalida) * 100) : null,
    lotes: { total: totalLotes, vendidos: lotesVendidos, disponibles, porcentajeVendido: totalLotes ? Math.round((lotesVendidos / totalLotes) * 100) : 0 },
    catalogo: { compradores, especies },
    ultimasCompras: compras.slice(0, 6).map((c) => ({
      id: c.id_cmp,
      fecha: formatoFecha(c.fecha),
      hora: formatoHora(c.fecha),
      especies: c.lote.especies.map((e) => e.nombre).join(", ") || "—",
      comprador: `${c.comprador.nombre} ${c.comprador.apellido_paterno}`,
      kilos: Number(c.lote.kilos),
      total: Number(c.precio_total),
    })),
    graficas: {
      dias: [...porDia.keys()].map((k) => `${k.slice(8)}/${k.slice(5, 7)}`),
      importesDia: [...porDia.values()].map(redondea),
      nombresEspecies: topEspecies.map((e) => e.nombre),
      kilosEspecies: topEspecies.map((e) => e.kilos),
      nombresCompradores: topCompradores.map((c) => c.nombre),
      totalesCompradores: topCompradores.map((c) => c.total),
    },
    hayActividad30: ultimos30.length > 0,
  };
}
