// ============================================================
//  EXPORTAR el stock (respaldo / importar a Shopify a mano)
// ============================================================

const CAMPOS = [
  "codigo", "estado", "nombre", "marca", "categoria", "talle",
  "condicion", "precio", "descripcion", "plantillaUsada", "creada",
];

function escaparCSV(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function aCSV(prendas) {
  const filas = [CAMPOS.join(",")];
  prendas.forEach((p) => filas.push(CAMPOS.map((c) => escaparCSV(p[c])).join(",")));
  return filas.join("\n");
}

export function aJSON(prendas) {
  // Sacamos los blobs/dataURL pesados del JSON de respaldo de texto.
  const limpias = prendas.map(({ fotoOriginalURL, fotoFinalURL, ...resto }) => resto);
  return JSON.stringify(limpias, null, 2);
}

export function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
