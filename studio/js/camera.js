// ============================================================
//  CÁMARA — captura en vivo con la cámara trasera del teléfono.
//  Saca la foto a la mayor resolución posible para que el
//  recorte salga limpio.
// ============================================================

let stream = null;

// Modos de captura: definen la guía visual y el encuadre sugerido.
export const MODOS = {
  colgada: { nombre: "Colgada en par", emoji: "🪝", guia: "vertical" },
  lisa:    { nombre: "Lisa (flat-lay)", emoji: "🧺", guia: "cuadrada" },
  piso:    { nombre: "En el piso",      emoji: "🟫", guia: "cuadrada" },
};

// Arranca la cámara y la conecta al elemento <video>.
export async function iniciar(video) {
  detener();
  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 2160 },
      height: { ideal: 2160 },
    },
  };
  stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function detener() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

// Captura el cuadro actual del video a un canvas y devuelve { canvas, blob }.
// Recorta a un cuadrado centrado (la guía cuadrada) o deja el alto completo.
export async function capturar(video, { cuadrado = true } = {}) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new Error("La cámara todavía no está lista.");

  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (cuadrado) {
    const lado = Math.min(vw, vh);
    sx = (vw - lado) / 2;
    sy = (vh - lado) / 2;
    sw = sh = lado;
  }

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

  const blob = await new Promise((res) =>
    canvas.toBlob(res, "image/jpeg", 0.95)
  );
  return { canvas, blob };
}

// ¿Hay cámara disponible en este dispositivo/navegador?
export function camaraSoportada() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
