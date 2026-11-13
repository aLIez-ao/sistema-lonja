import Tipo from "./Tipo.js";
import Lote from "./Lote.js";
import Especie from "./Especie.js";
import EspecieCatalogo from "./EspecieCatalogo.js";
import Comprador from "./Comprador.js";
import Compra from "./Compra.js";
import Usuario from "./Usuario.js";
import DireccionEntrega from "./DireccionEntrega.js";
import CarritoItem from "./CarritoItem.js";
import Pedido from "./Pedido.js";
import PedidoItem from "./PedidoItem.js";

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

// Usuario 1 --- 1 Comprador (la cuenta en línea se vincula por codigo_cpr)
Usuario.belongsTo(Comprador, { foreignKey: "codigo_cpr", as: "comprador", onDelete: "SET NULL" });
Comprador.hasOne(Usuario, { foreignKey: "codigo_cpr", as: "cuenta" });

// Carrito persistente y pedidos en línea.
Usuario.hasMany(CarritoItem, { foreignKey: { name: "id_usuario", allowNull: false }, as: "carrito", onDelete: "CASCADE" });
CarritoItem.belongsTo(Usuario, { foreignKey: { name: "id_usuario", allowNull: false }, as: "usuario" });
Lote.hasMany(CarritoItem, { foreignKey: { name: "id_lte", allowNull: false }, as: "carritos", onDelete: "CASCADE" });
CarritoItem.belongsTo(Lote, { foreignKey: { name: "id_lte", allowNull: false }, as: "lote" });
Usuario.hasMany(Pedido, { foreignKey: { name: "id_usuario", allowNull: false }, as: "pedidos", onDelete: "RESTRICT" });
Pedido.belongsTo(Usuario, { foreignKey: { name: "id_usuario", allowNull: false }, as: "usuario" });
Comprador.hasMany(Pedido, { foreignKey: { name: "codigo_cpr", allowNull: false }, as: "pedidos", onDelete: "RESTRICT" });
Pedido.belongsTo(Comprador, { foreignKey: { name: "codigo_cpr", allowNull: false }, as: "comprador" });
DireccionEntrega.hasMany(Pedido, { foreignKey: { name: "id_dir", allowNull: true }, as: "pedidos", onDelete: "SET NULL" });
Pedido.belongsTo(DireccionEntrega, { foreignKey: { name: "id_dir", allowNull: true }, as: "direccion" });
Pedido.hasMany(PedidoItem, { foreignKey: { name: "id_ped", allowNull: false }, as: "items", onDelete: "CASCADE" });
PedidoItem.belongsTo(Pedido, { foreignKey: { name: "id_ped", allowNull: false }, as: "pedido" });
Lote.hasMany(PedidoItem, { foreignKey: { name: "id_lte", allowNull: false }, as: "pedidosItem", onDelete: "RESTRICT" });
PedidoItem.belongsTo(Lote, { foreignKey: { name: "id_lte", allowNull: false }, as: "lote" });
Pedido.hasMany(Compra, { foreignKey: { name: "id_ped", allowNull: true }, as: "compras", onDelete: "SET NULL" });
Compra.belongsTo(Pedido, { foreignKey: { name: "id_ped", allowNull: true }, as: "pedido" });

// Usuario 1 --- N DireccionEntrega
Usuario.hasMany(DireccionEntrega, { foreignKey: { name: "id_usuario", allowNull: false }, as: "direcciones", onDelete: "CASCADE" });
DireccionEntrega.belongsTo(Usuario, { foreignKey: { name: "id_usuario", allowNull: false }, as: "usuario" });

export { Tipo, Lote, Especie, EspecieCatalogo, Comprador, Compra, Usuario, DireccionEntrega, CarritoItem, Pedido, PedidoItem };
export { ROLES } from "./Usuario.js";
