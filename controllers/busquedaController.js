import { ENTIDADES, sugerencias } from "../helpers/busqueda.js";

/** GET /buscar/sugerencias?entidad=...&q=... → [{ id, titulo, subtitulo, url }] */
export const sugerenciasBusqueda = async (req, res) => {
  const entidad = String(req.query.entidad || "");
  if (!ENTIDADES.includes(entidad)) return res.json([]);

  if (entidad === "usuarios" && req.usuario?.rol !== "admin") {
    return res.status(403).json({ error: "No tienes permiso para buscar usuarios." });
  }

  const datos = await sugerencias(entidad, req.query.q, req.usuario);
  res.json(datos ?? []);
};
