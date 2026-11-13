import Tipo from "./Tipo.js";
import Lote from "./Lote.js";
import Especie from "./Especie.js";
import EspecieCatalogo from "./EspecieCatalogo.js";
import Comprador from "./Comprador.js";
import Compra from "./Compra.js";
import Usuario from "./Usuario.js";

// Tipo 1 --- N Especie
Tipo.hasMany(Especie, { foreignKey: { name: "id_tpo", allowNull: false }, as: "especies", onDelete: "RESTRICT" });
Especie.belongsTo(Tipo, { foreignKey: { name: "id_tpo", allowNull: false }, as: "tipo" });

// Tipo 1 --- N EspecieCatalogo
Tipo.hasMany(EspecieCatalogo, { foreignKey: { name: "id_tpo", allowNull: false }, as: "catalogo", onDelete: "RESTRICT" });
EspecieCatalogo.belongsTo(Tipo, { foreignKey: { name: "id_tpo", allowNull: false }, as: "tipo" });

// Catálogo 1 --- N Especie (no se puede borrar un catálogo en uso)
EspecieCatalogo.hasMany(Especie, { foreignKey: { name: "id_cat", allowNull: true }, as: "especies", onDelete: "RESTRICT" });
Especie.belongsTo(EspecieCatalogo, { foreignKey: { name: "id_cat", allowNull: true }, as: "catalogo" });

// Lote 1 --- N Especie (si se borra el lote se borran sus especies)
Lote.hasMany(Especie, { foreignKey: { name: "id_lte", allowNull: false }, as: "especies", onDelete: "CASCADE" });
Especie.belongsTo(Lote, { foreignKey: { name: "id_lte", allowNull: false }, as: "lote" });

// Lote 1 --- 1 Compra (no se puede borrar un lote ya comprado)
Lote.hasOne(Compra, { foreignKey: "id_cmp", as: "compra", onDelete: "RESTRICT" });
Compra.belongsTo(Lote, { foreignKey: "id_cmp", as: "lote" });

// Comprador 1 --- N Compra
Comprador.hasMany(Compra, { foreignKey: "codigo_cpr", as: "compras", onDelete: "RESTRICT" });
Compra.belongsTo(Comprador, { foreignKey: "codigo_cpr", as: "comprador" });

export { Tipo, Lote, Especie, EspecieCatalogo, Comprador, Compra, Usuario };
export { ROLES } from "./Usuario.js";
