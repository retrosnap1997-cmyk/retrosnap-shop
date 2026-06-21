// ============================================================
//  EDITOR de borrado manual ("borrar objeto")
//  Pincel que borra (alpha→0) el gancho/alambres/percha que la IA
//  dejó. Trabaja sobre el recorte CRUDO de cada foto.
// ============================================================

let S = null; // sesión de edición actual

const el = (id) => document.getElementById(id);

function coords(e) {
  const ed = S.ed;
  const r = ed.getBoundingClientRect();
  const escala = ed.width / r.width;
  return {
    x: (e.clientX - r.left) * escala,
    y: (e.clientY - r.top) * (ed.height / r.height),
    escala,
  };
}

function pushUndo() {
  const ctx = S.ed.getContext("2d");
  S.history.push(ctx.getImageData(0, 0, S.ed.width, S.ed.height));
  if (S.history.length > 10) S.history.shift();
}

// Borra una "línea" gruesa (trazo continuo) con destination-out.
function borrar(x0, y0, x1, y1, radio) {
  const ctx = S.ed.getContext("2d");
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = radio * 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x1, y1, radio, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

export function initEditor() {
  const ed = el("ed-canvas");

  ed.addEventListener("pointerdown", (e) => {
    if (!S) return;
    e.preventDefault();
    ed.setPointerCapture(e.pointerId);
    pushUndo();
    S.dibujando = true;
    const p = coords(e);
    S.radio = (+el("ed-size").value) * p.escala;
    S.lastX = p.x; S.lastY = p.y;
    borrar(p.x, p.y, p.x, p.y, S.radio);
  });

  ed.addEventListener("pointermove", (e) => {
    if (!S || !S.dibujando) return;
    const p = coords(e);
    borrar(S.lastX, S.lastY, p.x, p.y, S.radio);
    S.lastX = p.x; S.lastY = p.y;
  });

  const fin = () => { if (S) S.dibujando = false; };
  ed.addEventListener("pointerup", fin);
  ed.addEventListener("pointercancel", fin);
  ed.addEventListener("pointerleave", fin);

  el("ed-deshacer").addEventListener("click", () => {
    if (!S || !S.history.length) return;
    S.ed.getContext("2d").putImageData(S.history.pop(), 0, 0);
  });
  el("ed-restaurar").addEventListener("click", () => {
    if (!S) return;
    pushUndo();
    S.ed.getContext("2d").putImageData(S.original, 0, 0);
  });
  el("ed-cerrar").addEventListener("click", cerrar);
  el("ed-listo").addEventListener("click", aplicar);
}

function aplicar() {
  if (!S) return;
  // Volcar el resultado al canvas crudo de la prenda e invalidar su cache.
  const rc = S.raw.getContext("2d");
  rc.clearRect(0, 0, S.raw.width, S.raw.height);
  rc.drawImage(S.ed, 0, 0);
  delete S.raw._rsFilas;
  const cb = S.alListo;
  cerrar();
  if (cb) cb();
}

function cerrar() {
  el("editor").hidden = true;
  S = null;
}

// Abre el editor para un canvas crudo. Llama alListo() al aplicar.
export function abrirEditor(rawCanvas, alListo) {
  const ed = el("ed-canvas");
  ed.width = rawCanvas.width;
  ed.height = rawCanvas.height;
  const ctx = ed.getContext("2d");
  ctx.clearRect(0, 0, ed.width, ed.height);
  ctx.drawImage(rawCanvas, 0, 0);
  S = {
    ed, raw: rawCanvas, alListo,
    original: ctx.getImageData(0, 0, ed.width, ed.height),
    history: [], dibujando: false, lastX: 0, lastY: 0, radio: 40,
  };
  el("editor").hidden = false;
}
