// ============================================================
//  PLANTILLAS / MODELOS (Fase 2 — fondos con tus escenas)
//
//  Cada plantilla es una IMAGEN de fondo (tu modelo/escena) sobre
//  la que la app monta la prenda recortada. Funciona 100% en el
//  teléfono, sin internet ni claves.
//
//  PARA AGREGAR UNA PLANTILLA:
//   1) Poné la imagen en  studio/templates/  (ej: verano.jpg, idealmente
//      cuadrada, 1600x1600).
//   2) Sumá una entrada acá abajo.
//
//  Campos:
//   id     → único (sin espacios)
//   nombre → lo que ves en la app
//   img    → ruta a la imagen, ej "templates/verano.jpg"
//   caja   → (opcional) dónde y de qué tamaño va la prenda, en valores
//            0..1 del cuadro. Si no la ponés, la prenda ocupa todo el cuadro.
//            Ej: { x:0.18, y:0.12, w:0.64, h:0.76 } = centrada, con margen.
// ============================================================

export const TEMPLATES = [
  // ── Ejemplo (descomentá y poné tu imagen real en studio/templates/) ──
  // {
  //   id: "verano",
  //   nombre: "Modelo verano",
  //   img: "templates/verano.jpg",
  //   caja: { x: 0.18, y: 0.10, w: 0.64, h: 0.78 },
  // },
];

export function templatePorId(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}

// Precarga las imágenes de las plantillas y devuelve un mapa id → HTMLImageElement.
export async function precargarTemplates() {
  const mapa = {};
  await Promise.all(TEMPLATES.map((t) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { mapa[t.id] = img; resolve(); };
    img.onerror = () => { console.warn("[templates] no cargó:", t.img); resolve(); };
    img.src = t.img;
  })));
  return mapa;
}
