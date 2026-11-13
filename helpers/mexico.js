// Catálogos para las listas clicables de direcciones de entrega.
export const ESTADOS = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato",
  "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca",
  "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco",
  "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
];

// Municipios principales de Veracruz. La lista es una ayuda: el campo admite
// cualquier municipio escrito por el comprador.
export const MUNICIPIOS_VERACRUZ = [
  "Acayucan", "Actopan", "Agua Dulce", "Alto Lucero", "Altotonga", "Alvarado",
  "Amatlán de los Reyes", "Ángel R. Cabada", "Atoyac", "Atzalan", "Banderilla", "Boca del Río",
  "Camerino Z. Mendoza", "Carlos A. Carrillo", "Catemaco", "Cazones de Herrera", "Cerro Azul",
  "Chicontepec", "Chinameca", "Chocamán", "Citlaltépetl", "Coatepec", "Coatzacoalcos",
  "Coatzintla", "Colipa", "Comapa", "Córdoba", "Cosamaloapan", "Cosautlán de Carvajal",
  "Coscomatepec", "Cosoleacaque", "Cotaxtla", "Cuitláhuac", "El Higo", "Emiliano Zapata",
  "Espinal", "Filomeno Mata", "Fortín", "Gutiérrez Zamora", "Huatusco", "Huayacocotla",
  "Hueyapan de Ocampo", "Ignacio de la Llave", "Isla", "Ixcatepec", "Ixhuatlán del Café",
  "Ixhuatlán del Sureste", "Ixhuatlán de Madero", "Ixtaczoquitlán", "Jalacingo", "Jáltipan",
  "Jamapa", "Jesús Carranza", "Jilotepec", "José Azueta", "Juan Rodríguez Clara",
  "La Antigua", "La Perla", "Las Choapas", "Lerdo de Tejada", "Los Reyes", "Manlio Fabio Altamirano",
  "Martínez de la Torre", "Mecayapan", "Medellín", "Minatitlán", "Misantla", "Moloacán",
  "Nanchital", "Naolinco", "Naranjos Amatlán", "Nautla", "Nogales", "Oluta", "Omealca",
  "Orizaba", "Otatitlán", "Ozuluama", "Pajapan", "Pánuco", "Papantla", "Paso de Ovejas",
  "Paso del Macho", "Perote", "Platón Sánchez", "Playa Vicente", "Poza Rica", "Pueblo Viejo",
  "Puente Nacional", "Rafael Delgado", "Rafael Lucio", "Río Blanco", "Saltabarranca",
  "San Andrés Tuxtla", "San Juan Evangelista", "San Rafael", "Santiago Tuxtla",
  "Sayula de Alemán", "Soconusco", "Soledad Atzompa", "Soledad de Doblado", "Soteapan",
  "Tamalín", "Tamiahua", "Tampico Alto", "Tancoco", "Tantima", "Tantoyuca", "Tatatila",
  "Tecolutla", "Tehuipango", "Tempoal", "Tenampa", "Tenochtitlán", "Teocelo", "Tepatlaxco",
  "Tepetlán", "Tepetzintla", "Tequila", "Texcatepec", "Texhuacán", "Texistepec", "Tezonapa",
  "Tierra Blanca", "Tihuatlán", "Tlacojalpan", "Tlacolulan", "Tlacotalpan", "Tlalixcoyan",
  "Tlaltetela", "Tlapacoyan", "Tlaquilpa", "Tlilapan", "Tomatlán", "Tonayán", "Totutla",
  "Tres Valles", "Túxpam", "Tuxtilla", "Ursulo Galván", "Uxpanapa", "Vega de Alatorre",
  "Veracruz", "Villa Aldama", "Xalapa", "Xico", "Xoxocotla", "Yanga", "Yecuatla", "Zacualpan",
  "Zaragoza", "Zentla", "Zongolica", "Zontecomatlán", "Zozocolco de Hidalgo",
];

/** Municipios sugeridos para un estado (solo Veracruz tiene catálogo local). */
export const municipiosDe = (estado) =>
  String(estado || "").trim().toLowerCase() === "veracruz" ? MUNICIPIOS_VERACRUZ : [];
