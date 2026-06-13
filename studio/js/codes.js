// ============================================================
//  CÓDIGOS automáticos de prenda
//  Formato:  <PREFIJO>-<ABREV>-<NNNN>   ej: RS-TEE-0042
// ============================================================

import { proximoCorrelativo, getConfig } from "./db.js";
import { categoriaPorId, PREFIJO_DEFECTO } from "./catalog.js";
import * as Cloud from "./cloud.js";

function pad(n, largo = 4) {
  return String(n).padStart(largo, "0");
}

// Genera y reserva un código nuevo para la categoría dada.
// Si la nube está configurada, el número sale de la nube (sin choques
// entre dispositivos); si no, usa el contador local.
export async function generarCodigo(categoriaId) {
  const cat = categoriaPorId(categoriaId);
  const abrev = cat ? cat.abrev : "GEN";
  const prefijo = (await getConfig("prefijo", PREFIJO_DEFECTO)) || PREFIJO_DEFECTO;
  const base = `${prefijo}-${abrev}-`;

  let n = null;
  if (await Cloud.estaConfigurada()) {
    try { n = await Cloud.proximoNumeroNube(base); }
    catch (e) { console.warn("[codes] nube no respondió, uso contador local:", e); }
  }
  if (n == null) n = await proximoCorrelativo(abrev);
  return base + pad(n);
}

// Versión sin guiones para hashtags de Instagram: #RSTEE0042
export function codigoHashtag(codigo) {
  return "#" + codigo.replace(/-/g, "");
}
