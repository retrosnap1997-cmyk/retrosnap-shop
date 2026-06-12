// ============================================================
//  CATÁLOGO — categorías, abreviaturas de código y plantillas
//  de ficha (autocompletado por tipo de prenda).
//  Editá acá para sumar categorías o cambiar valores por defecto.
// ============================================================

// Cada categoría tiene:
//   id      → identificador interno (igual al de la tienda)
//   nombre  → lo que ves en la app
//   emoji   → ícono
//   abrev   → abreviatura para el código (RS-<ABREV>-0001)
//   fondo   → fondo sugerido por defecto: "modelo" | "blanco" | "arena"
//   ficha   → valores por defecto del formulario para esta categoría
export const CATEGORIAS = [
  {
    id: "tees", nombre: "Remeras", emoji: "👕", abrev: "TEE", fondo: "modelo",
    ficha: { condicion: "Muy buen estado", talles: ["S", "M", "L", "XL"],
      precio: 25, descripcion: "Remera vintage rescatada, curada a mano. Una sola en stock." },
  },
  {
    id: "hoodies", nombre: "Hoodies", emoji: "🧥", abrev: "HOOD", fondo: "modelo",
    ficha: { condicion: "Muy buen estado", talles: ["S", "M", "L", "XL"],
      precio: 40, descripcion: "Hoodie abrigado para las mañanas de offshore. Frisa en buen estado." },
  },
  {
    id: "shorts", nombre: "Boardshorts", emoji: "🩳", abrev: "SHORT", fondo: "modelo",
    ficha: { condicion: "Como nuevo", talles: ["W30", "W32", "W34", "W36"],
      precio: 28, descripcion: "Boardshort de corte clásico, secado rápido." },
  },
  {
    id: "jackets", nombre: "Camperas", emoji: "🧥", abrev: "JACK", fondo: "modelo",
    ficha: { condicion: "Muy buen estado", talles: ["S", "M", "L", "XL"],
      precio: 50, descripcion: "Campera ideal para el atardecer en la playa." },
  },
  {
    id: "hats", nombre: "Gorras", emoji: "🧢", abrev: "HAT", fondo: "blanco",
    ficha: { condicion: "Nuevo", talles: [""],
      precio: 18, descripcion: "Gorra con onda retro. Ajuste regulable." },
  },
  {
    id: "acc", nombre: "Accesorios", emoji: "🕶️", abrev: "ACC", fondo: "blanco",
    ficha: { condicion: "Nuevo", talles: [""],
      precio: 15, descripcion: "Accesorio con estilo retro." },
  },
  {
    id: "tablas", nombre: "Tablas", emoji: "🏄", abrev: "TABLA", fondo: "blanco",
    ficha: { condicion: "Usado", talles: ["6'1", "6'4", "7'0", "8'0"],
      precio: 280, descripcion: "Tabla en buen estado, sin entradas de agua. Incluye quillas." },
  },
  {
    id: "racks", nombre: "Racks moto", emoji: "🛵", abrev: "RACK", fondo: "blanco",
    ficha: { condicion: "Nuevo", talles: [""],
      precio: 60, descripcion: "Soporte porta-tablas para moto. Incluye instalación en el local." },
  },
];

export const MARCAS = [
  "Billabong", "Rip Curl", "Quiksilver", "O'Neill", "Volcom", "RetroSnap", "Otra",
];

export const CONDICIONES = ["Nuevo", "Como nuevo", "Muy buen estado", "Usado"];

// Prefijo de la marca para los códigos (configurable en Ajustes)
export const PREFIJO_DEFECTO = "RS";

export function categoriaPorId(id) {
  return CATEGORIAS.find((c) => c.id === id) || null;
}
