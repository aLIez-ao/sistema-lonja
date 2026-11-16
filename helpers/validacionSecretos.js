const VALOR_EJEMPLO_JWT = "cambia_esta_clave_por_una_larga_y_aleatoria";
const VALOR_EJEMPLO_ADMIN = "CambiaEstaClave123";

/** Valida secretos de arranque sin devolver ni registrar sus valores. */
export function validarSecretosInicio(env = process.env) {
  const esProduccion = env.NODE_ENV === "production";
  const errores = [];
  const avisos = [];
  const registrar = (mensaje) => (esProduccion ? errores : avisos).push(mensaje);

  if (!env.SC_JWT) registrar("Falta SC_JWT para firmar los tokens.");
  else if (env.SC_JWT === VALOR_EJEMPLO_JWT || env.SC_JWT.length < 32) registrar("SC_JWT debe ser un secreto propio de al menos 32 caracteres.");

  if (env.ADMIN_PASSWORD === VALOR_EJEMPLO_ADMIN) registrar("ADMIN_PASSWORD conserva la contraseña de ejemplo; cámbiala antes de iniciar.");

  return { errores, avisos };
}
