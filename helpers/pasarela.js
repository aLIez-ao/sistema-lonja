import crypto from "crypto";

const soloDigitos = (valor) => String(valor ?? "").replace(/\D/g, "");

export function numeroTarjetaValido(numero) {
  const digitos = soloDigitos(numero);
  if (digitos.length < 13 || digitos.length > 19) return false;
  let suma = 0;
  let duplicar = false;
  for (let i = digitos.length - 1; i >= 0; i -= 1) {
    let n = Number(digitos[i]);
    if (duplicar && (n *= 2) > 9) n -= 9;
    suma += n;
    duplicar = !duplicar;
  }
  return suma % 10 === 0;
}

function tarjetaDePrueba(digitos) {
  if (digitos === "4242424242424242") return { aprobado: true, motivo: "aprobada", marca: "Visa" };
  if (digitos === "4000000000000002") return { aprobado: false, motivo: "Tarjeta rechazada" };
  if (digitos === "4000000000009995") return { aprobado: false, motivo: "Fondos insuficientes" };
  return { aprobado: false, motivo: "Usa una tarjeta de prueba válida" };
}

/** Pasarela educativa simulada; no efectúa cargos ni conserva número o CVV. */
export async function cobrar({ metodo = "tarjeta", monto, referencia, tarjeta = {} }) {
  if (metodo === "transferencia") return { aprobado: true, referencia: `SPEI-${crypto.randomBytes(6).toString("hex").toUpperCase()}`, marca: "SPEI", monto: Number(monto), idempotencia: referencia };
  if (metodo === "efectivo") return { aprobado: true, referencia: `LONJA-${crypto.randomBytes(6).toString("hex").toUpperCase()}`, marca: "Efectivo en lonja", monto: Number(monto), idempotencia: referencia };
  if (metodo !== "tarjeta") return { aprobado: false, motivo: "Método de pago no válido" };
  const numero = soloDigitos(tarjeta.numero);
  const mes = Number(tarjeta.mes);
  const anioEntrada = String(tarjeta.anio ?? "");
  const anio = Number(anioEntrada.length === 2 ? `20${anioEntrada}` : anioEntrada);
  const cvv = soloDigitos(tarjeta.cvv);
  if (!numeroTarjetaValido(numero)) return { aprobado: false, motivo: "Revisa el número de tarjeta" };
  if (!/^\d{3,4}$/.test(cvv)) return { aprobado: false, motivo: "El CVV debe tener 3 o 4 dígitos" };
  const ahora = new Date();
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio)
      || anio < ahora.getFullYear() || (anio === ahora.getFullYear() && mes < ahora.getMonth() + 1)) {
    return { aprobado: false, motivo: "La tarjeta está vencida o la fecha no es válida" };
  }
  const resultado = tarjetaDePrueba(numero);
  if (!resultado.aprobado) return resultado;
  return {
    aprobado: true,
    referencia: `SIM-${crypto.randomBytes(8).toString("hex")}`,
    ultimos4: numero.slice(-4),
    marca: resultado.marca,
    monto: Number(monto),
    idempotencia: referencia,
  };
}
