// ============================================================
//  CONFIGURACIÓN DE LA TIENDA — editá estos valores a tu gusto
// ============================================================
//  Todo lo que está acá se usa en el sitio automáticamente.
//  Guardá el archivo y recargá la página para ver los cambios.

const TIENDA = {
  nombre: "RETROSNAP",
  eslogan: "Surf Goodies · Santa Teresa, Costa Rica",

  // Número de WhatsApp al que llegan los pedidos (código de país + número, SIN + ni espacios)
  whatsapp: "50600000000",

  // Moneda de los precios
  moneda: "USD",
  simbolo: "$",

  // Redes (dejá "" para ocultar el ícono)
  instagram: "https://instagram.com/",
  tiktok: "",
  facebook: "",

  // Textos del hero (portada)
  heroTitulo: "Surf wear con segunda vida",
  heroTexto: "Ropa de surf retro y de segunda vuelta, curada a mano. Menos fast fashion, más línea de olas.",
  heroBoton: "Ver lo nuevo",

  // Banner de sostenibilidad
  ecoTitulo: "Le damos otra vuelta al lineup",
  ecoTexto: "Cada prenda que rescatamos es una menos en el vertedero. Seleccionamos, lavamos y dejamos lista cada pieza para que vuelva al agua con vos.",

  // Banner de alquiler de moto (poné mostrar: false para ocultarlo)
  moto: {
    mostrar: true,
    titulo: "¿Sin ruedas en Santa Teresa?",
    texto: "Alquilamos moto con rack porta-tablas incluido opcional. $25/día · $140/semana · $500/mes.",
    boton: "Reservar por WhatsApp",
    mensaje: "Hola RetroSnap! Quiero info para alquilar la moto 🛵",
  },

  // Footer
  direccion: "Calle principal, antes de la subida de Bohemia · Santa Teresa, CR",
  email: "hola@retrosnap.com",
  horario: "Lunes a Domingo · 9:00 – 18:00",
};

// Categorías de la tienda (orden = orden del menú)
const CATEGORIAS = [
  { id: "tees",      nombre: "Remeras",     emoji: "👕" },
  { id: "hoodies",   nombre: "Hoodies",     emoji: "🧥" },
  { id: "shorts",    nombre: "Boardshorts", emoji: "🩳" },
  { id: "jackets",   nombre: "Camperas",    emoji: "🧥" },
  { id: "hats",      nombre: "Gorras",      emoji: "🧢" },
  { id: "acc",       nombre: "Accesorios",  emoji: "🕶️" },
  { id: "tablas",    nombre: "Tablas",      emoji: "🏄" },
  { id: "racks",     nombre: "Racks moto",  emoji: "🛵" },
];

// Marcas para el menú "Shop by brand"
const MARCAS = [
  "Billabong",
  "Rip Curl",
  "Quiksilver",
  "O'Neill",
  "Volcom",
  "RetroSnap",
];
