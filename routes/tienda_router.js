import express from "express";
import * as c from "../controllers/tiendaController.js";

// Se monta en la raíz: "/" es la tienda y "/tienda/*" sus páginas internas.
const router = express.Router();

router.get("/", c.portada);
router.get("/tienda", (req, res) => res.redirect("/"));
router.get("/tienda/lote/:id", c.detalleLote);
router.get("/tienda/especie/:id", c.fichaEspecie);
router.get("/tienda/sugerencias", c.sugerencias);

export default router;
