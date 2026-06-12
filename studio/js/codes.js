// ============================================================
//  CÓDIGOS automáticos de prenda
//  Formato:  <PREFIJO>-<ABREV>-<NNNN>   ej: RS-TEE-0042
// ============================================================

import { proximoCorrelativo, getConfig } from "./db.js";
import { categoriaPorId, PREFIJO_DEFECTO } from "./catalog.js";

function pad(n, largo = 4) {
  return String(n).padStart(largo, "0");
}

// Genera y reserva un código nuevo para la categoría dada.
// Reserva = incrementa el contador, así nunca se repite.
export async function generarCodigo(categoriaId) {
  const cat = categoriaPorId(categoriaId);
  const abrev = cat ? cat.abrev : "GEN";
  const prefijo = (await getConfig("prefijo", PREFIJO_DEFECTO)) || PREFIJO_DEFECTO;
  const n = await proximoCorrelativo(abrev);
  return `${prefijo}-${abrev}-${pad(n)}`;
}

// Versión sin guiones para hashtags de Instagram: #RSTEE0042
export function codigoHashtag(codigo) {
  return "#" + codigo.replace(/-/g, "");
}
