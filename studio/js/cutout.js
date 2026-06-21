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
  model: "isnet",                 // máxima calidad de bordes (más pesado pero más fino)
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

  if (onProgress) onProgress("Listo", 1);
  // Devolvemos el recorte CRUDO (transparente). El encuadre/recorte de percha
  // se hace con enmarcar() en el momento de mostrar/componer (permite ajustar).
  return { canvas: recortado, motor };
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

// Escanea el recorte UNA vez y cachea, por fila: cantidad de píxeles opacos
// (densidad) y bordes X. Reusado por enmarcar() para que el slider sea fluido.
function filasDe(canvas) {
  if (canvas._rsFilas) return canvas._rsFilas;
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  const rowCount = new Int32Array(h);
  const rowMin = new Int32Array(h).fill(w);
  const rowMax = new Int32Array(h).fill(-1);
  let minY = h, maxY = 0, maxCount = 1, hay = false;
  for (let y = 0; y < h; y++) {
    const base = y * w;
    let cnt = 0, rmin = w, rmax = -1;
    for (let x = 0; x < w; x++) {
      if (data[(base + x) * 4 + 3] > 24) { cnt++; if (x < rmin) rmin = x; if (x > rmax) rmax = x; }
    }
    rowCount[y] = cnt; rowMin[y] = rmin; rowMax[y] = rmax;
    if (cnt > 0) { hay = true; if (y < minY) minY = y; if (y > maxY) maxY = y; if (cnt > maxCount) maxCount = cnt; }
  }
  if (!hay) { minY = 0; maxY = h - 1; }
  canvas._rsFilas = { w, h, rowCount, rowMin, rowMax, minY, maxY, maxCount, hay };
  return canvas._rsFilas;
}

// Encuadra la prenda en un cuadrado de 'size':
//  • recorta la PERCHA midiendo DENSIDAD (filas con pocos píxeles = gancho/alambres),
//  • aplica un recorte manual extra desde arriba (topCrop 0..0.5),
//  • centra la prenda con un margen.
export function enmarcar(canvas, { size = 1600, margen = 0.08, recortarColgador = true, topCrop = 0 } = {}) {
  const f = filasDe(canvas);
  let minY = f.minY, maxY = f.maxY;

  // Recorte de percha: saltar desde arriba las filas POCO densas (gancho/alambres).
  if (recortarColgador && f.hay) {
    const umbral = f.maxCount * 0.22;            // < 22% de la densidad máxima = "fino"
    const tope = minY + (maxY - minY) * 0.45;    // nunca más del 45% del alto
    let y = minY;
    while (y < tope && f.rowCount[y] < umbral) y++;
    minY = y;
  }
  // Recorte manual extra desde arriba.
  if (topCrop > 0) minY = Math.min(maxY - 1, minY + Math.round((maxY - minY) * topCrop));

  // Bordes horizontales sobre las filas que quedan.
  let minX = f.w, maxX = 0;
  for (let y = minY; y <= maxY; y++) {
    if (f.rowMax[y] >= 0) { if (f.rowMin[y] < minX) minX = f.rowMin[y]; if (f.rowMax[y] > maxX) maxX = f.rowMax[y]; }
  }
  if (maxX < minX) { minX = 0; maxX = f.w - 1; }

  const recW = Math.max(1, maxX - minX + 1);
  const recH = Math.max(1, maxY - minY + 1);
  const out = document.createElement("canvas");
  out.width = out.height = size;
  const octx = out.getContext("2d");
  const disp = size * (1 - margen * 2);
  const escala = Math.min(disp / recW, disp / recH);
  const dw = recW * escala, dh = recH * escala;
  const dx = (size - dw) / 2, dy = (size - dh) / 2;
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
