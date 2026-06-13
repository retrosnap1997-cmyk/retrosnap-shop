// ============================================================
//  PRODUCTOS — agregá, editá o borrá productos de esta lista
// ============================================================
//  Cada producto es un bloque { ... }. Copiá uno, pegalo abajo
//  y cambiale los datos para agregar uno nuevo.
//
//  Campos:
//   id        → único, no repetir (cualquier texto corto)
//   nombre    → lo que se ve en la tarjeta
//   marca     → tiene que coincidir con alguna de MARCAS (config.js) para el filtro
//   categoria → id de CATEGORIAS (config.js): tees, hoodies, shorts, jackets, hats, acc, tablas, racks
//   talle     → "M", "L", "W32", "7'0"... o "" si no aplica
//   condicion → "Nuevo", "Como nuevo", "Muy buen estado", "Usado"
//   precio    → número, sin símbolo
//   descripcion → texto del detalle (se ve al hacer click)
//   img       → ruta a tu foto, ej: "img/remera-azul.jpg".
//               Si lo dejás en null se genera una imagen placeholder automática.
//   destacado → true = aparece en "Lo nuevo" de la portada

const PRODUCTOS = [
  {
    id: "tee-001",
    nombre: "Remera logo retro '90s",
    marca: "Billabong",
    categoria: "tees",
    talle: "L",
    condicion: "Muy buen estado",
    precio: 22,
    descripcion: "Remera vintage de los 90, algodón pesado, estampa original. Rescatada y lista para volver al agua.",
    img: null,
    destacado: true,
  },
  {
    id: "tee-002",
    nombre: "Remera surf trip fade",
    marca: "Rip Curl",
    categoria: "tees",
    talle: "M",
    condicion: "Como nuevo",
    precio: 25,
    descripcion: "Color levemente desgastado por el sol, como debe ser. Sin manchas ni agujeros.",
    img: null,
    destacado: true,
  },
  {
    id: "hood-001",
    nombre: "Hoodie clásico oversize",
    marca: "Quiksilver",
    categoria: "hoodies",
    talle: "XL",
    condicion: "Muy buen estado",
    precio: 45,
    descripcion: "Hoodie abrigado para las mañanas de offshore. Frisa gruesa, cierre perfecto.",
    img: null,
    destacado: true,
  },
  {
    id: "short-001",
    nombre: "Boardshort retro stripes",
    marca: "O'Neill",
    categoria: "shorts",
    talle: "W32",
    condicion: "Como nuevo",
    precio: 30,
    descripcion: "Boardshort de corte clásico, secado rápido. Usado dos veces.",
    img: null,
    destacado: true,
  },
  {
    id: "jack-001",
    nombre: "Campera windbreaker Y2K",
    marca: "Volcom",
    categoria: "jackets",
    talle: "L",
    condicion: "Muy buen estado",
    precio: 55,
    descripcion: "Rompeviento estilo Y2K, ideal para el atardecer en la playa.",
    img: null,
    destacado: false,
  },
  {
    id: "hat-001",
    nombre: "Gorra trucker bordada",
    marca: "RetroSnap",
    categoria: "hats",
    talle: "",
    condicion: "Nuevo",
    precio: 18,
    descripcion: "Gorra trucker con logo RetroSnap bordado. Edición de la casa.",
    img: null,
    destacado: true,
  },
  {
    id: "acc-001",
    nombre: "Lentes de sol retro",
    marca: "RetroSnap",
    categoria: "acc",
    talle: "",
    condicion: "Nuevo",
    precio: 15,
    descripcion: "Lentes estilo retro con protección UV400.",
    img: null,
    destacado: false,
  },
  {
    id: "tabla-001",
    nombre: "Tabla 7'0 funboard ~45L",
    marca: "RetroSnap",
    categoria: "tablas",
    talle: "7'0",
    condicion: "Usado",
    precio: 280,
    descripcion: "Funboard ideal para progresar. Reparaciones prolijas, sin entradas de agua. Incluye quillas.",
    img: null,
    destacado: true,
  },
  {
    id: "tabla-002",
    nombre: "Shortboard 6'1 ~32L",
    marca: "RetroSnap",
    categoria: "tablas",
    talle: "6'1",
    condicion: "Muy buen estado",
    precio: 350,
    descripcion: "Shortboard performance, lista para olas con pared. Incluye quillas FCS.",
    img: null,
    destacado: false,
  },
  {
    id: "rack-001",
    nombre: "Rack porta-tablas para moto + instalación",
    marca: "RetroSnap",
    categoria: "racks",
    talle: "",
    condicion: "Nuevo",
    precio: 60,
    descripcion: "Soporte lateral para llevar tu tabla en la moto. Incluye instalación en nuestro local (~10 min). Coordinamos turno por WhatsApp.",
    img: null,
    destacado: true,
  },
  {
    id: "hood-002",
    nombre: "Hoodie sunset fade",
    marca: "Billabong",
    categoria: "hoodies",
    talle: "M",
    condicion: "Usado",
    precio: 35,
    descripcion: "Hoodie con historia y color atardecer. Suave de tanto uso, cero roturas.",
    img: null,
    destacado: false,
  },
  {
    id: "tee-003",
    nombre: "Remera competencia local '02",
    marca: "Quiksilver",
    categoria: "tees",
    talle: "S",
    condicion: "Muy buen estado",
    precio: 28,
    descripcion: "Pieza de colección de una competencia local del 2002. Única en stock.",
    img: null,
    destacado: true,
  },
];
