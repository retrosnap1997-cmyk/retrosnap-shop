// ============================================================
//  RECORTE LIMPIO de la prenda (quitar el fondo)
//
//  Estrategia (en orden de calidad):
//   1) Motor IA en el navegador  → @imgly/background-removal
//      (modelo tipo U²-Net, calidad de estudio, corre local).
//      Necesita internet la PRIMERA vez para bajar el modelo;
//      después queda cacheado.
//   2) Respaldo offline → recorte por color desde los bordes
//      (sirve cuando el fondo es parejo: pared/piso liso).
//
//  Después del recorte:
//   • auto-recuadre: corta los márgenes vacíos y centra la prenda,
//   • composición sobre el fondo elegido (transparente/blanco/color).
// ============================================================

let _imgly = null;

async function cargarImgly() {
  if (_imgly) return _imgly;
  _imgly = await import("@imgly/background-removal");
  return _imgly;
}

const IMGLY_CONFIG = {
  // Datos del modelo desde el CDN OFICIAL de imgly (la versión coincide con la
  // librería). Se descargan la 1ª vez (~40 MB) y quedan cacheados por el navegador.
  publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.5.5/dist/",
  model: "isnet_fp16",            // buen balance calidad/peso para teléfono
  output: { format: "image/png" },
};

// ---------- API principal ----------
// Recibe un Blob de imagen y devuelve { canvas, motor } con la prenda recortada
// (fondo transparente), ya auto-recuadrada y centrada en un cuadrado.
export async function recortar(blob, { onProgress, size = 1600 } = {}) {
  let recortado;
  let motor = "ia";
  try {
    if (onProgress) onProgress("Cargando motor de recorte…", 0.05);
    const { removeBackground } = await cargarImgly();
    const out = await removeBackground(blob, {
      ...IMGLY_CONFIG,
      progress: (key, current, total) => {
        if (onProgress && total) {
          const pct = Math.min(0.95, current / total);
          onProgress("Recortando con IA…", pct);
        }
      },
    });
    recortado = await blobACanvas(out);
  } catch (err) {
    console.warn("[cutout] Motor IA no disponible, uso respaldo offline:", err);
    if (onProgress) onProgress("Sin internet: recorte rápido offline…", 0.4);
    motor = "offline";
    recortado = recorteOffline(await blobACanvas(blob));
  }

  if (onProgress) onProgress("Encuadrando…", 0.97);
  const canvas = autoRecuadre(recortado, { size });
  if (onProgress) onProgress("Listo", 1);
  return { canvas, motor };
}

// Dibuja el FONDO en un contexto: un color, transparente, o una imagen de
// plantilla (modelo/escena) que cubre todo el cuadro.
export function dibujarFondo(ctx, size, { fondo = "blanco", templateImg = null } = {}) {
  if (templateImg) {
    // "cover": la plantilla llena el cuadrado sin deformarse.
    const r = Math.max(size / templateImg.width, size / templateImg.height);
    const w = templateImg.width * r, h = templateImg.height * r;
    ctx.drawImage(templateImg, (size - w) / 2, (size - h) / 2, w, h);
  } else if (fondo !== "transparente") {
    ctx.fillStyle = fondo === "blanco" ? "#ffffff" : fondo;
    ctx.fillRect(0, 0, size, size);
  }
}

// Coloca la prenda recortada. Si la plantilla define una "caja" (x,y,w,h en
// 0..1) la prenda se ubica ahí; si no, ocupa todo el cuadro.
export function colocarPrenda(ctx, size, canvasRecortado, caja = null) {
  if (caja) {
    ctx.drawImage(canvasRecortado, caja.x * size, caja.y * size, caja.w * size, caja.h * size);
  } else {
    ctx.drawImage(canvasRecortado, 0, 0, size, size);
  }
}

// Compone la prenda recortada (canvas RGBA) sobre un fondo o plantilla y
// devuelve un Blob listo para guardar/publicar.
//   fondo: "transparente" | "blanco" | "#rrggbb"
//   templateImg: HTMLImageElement de la plantilla (opcional)
//   caja: ubicación de la prenda dentro de la plantilla (opcional)
export async function componer(canvasRecortado, { fondo = "blanco", size = 1600, templateImg = null, caja = null } = {}) {
  const out = document.createElement("canvas");
  out.width = out.height = size;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingQuality = "high";

  dibujarFondo(ctx, size, { fondo, templateImg });
  colocarPrenda(ctx, size, canvasRecortado, caja);

  const tipo = (!templateImg && fondo === "transparente") ? "image/png" : "image/jpeg";
  return new Promise((res) => out.toBlob(res, tipo, 0.92));
}

// ---------- Helpers de imagen ----------
async function blobACanvas(blob) {
  const bitmap = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bitmap.width;
  c.height = bitmap.height;
  c.getContext("2d").drawImage(bitmap, 0, 0);
  return c;
}

// Auto-recuadre: detecta el rectángulo de píxeles visibles (alpha>umbral),
// lo recorta con un margen y lo centra en un canvas cuadrado de 'size'.
function autoRecuadre(canvas, { size = 1600, margen = 0.08 } = {}) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;

  let minX = w, minY = h, maxX = 0, maxY = 0, hay = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 24) {
        hay = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!hay) { minX = 0; minY = 0; maxX = w - 1; maxY = h - 1; }

  const recW = maxX - minX + 1;
  const recH = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = out.height = size;
  const octx = out.getContext("2d");

  // Escala para que la prenda ocupe (1 - 2*margen) del cuadro, manteniendo proporción.
  const disp = size * (1 - margen * 2);
  const escala = Math.min(disp / recW, disp / recH);
  const dw = recW * escala;
  const dh = recH * escala;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(canvas, minX, minY, recW, recH, dx, dy, dw, dh);
  return out;
}

// ---------- Respaldo offline: recorte por color desde los bordes ----------
// Hace un "flood fill" desde el marco quitando los píxeles parecidos al fondo.
// Funciona bien cuando el fondo es parejo (pared lisa, piso uniforme).
function recorteOffline(canvas, { tolerancia = 30 } = {}) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const idx = (x, y) => (y * w + x) * 4;

  // Color de fondo estimado = promedio de las 4 esquinas.
  const esquinas = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  let br = 0, bg = 0, bb = 0;
  esquinas.forEach(([x, y]) => { const i = idx(x, y); br += d[i]; bg += d[i + 1]; bb += d[i + 2]; });
  br /= 4; bg /= 4; bb /= 4;

  const visitado = new Uint8Array(w * h);
  const pila = [];
  // Sembrar desde todo el borde.
  for (let x = 0; x < w; x++) { pila.push(x, 0); pila.push(x, h - 1); }
  for (let y = 0; y < h; y++) { pila.push(0, y); pila.push(w - 1, y); }

  const tol2 = tolerancia * tolerancia * 3;
  while (pila.length) {
    const y = pila.pop();
    const x = pila.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const p = y * w + x;
    if (visitado[p]) continue;
    const i = idx(x, y);
    const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb;
    if (dr * dr + dg * dg + db * db > tol2) continue; // no es fondo
    visitado[p] = 1;
    d[i + 3] = 0; // transparente
    pila.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  // Suavizado de borde simple: bajar alpha en píxeles frontera.
  ctx.putImageData(img, 0, 0);
  return canvas;
}
