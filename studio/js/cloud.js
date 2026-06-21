// ============================================================
//  NUBE — sincroniza el stock con Supabase (control central).
//
//  El teléfono guarda local (offline). La NUBE es la fuente de
//  verdad: ves el stock desde cualquier dispositivo o la compu.
//
//  Config: se carga la URL + clave "anon" desde Ajustes (se
//  guardan en el teléfono, NO en el repo). Opcionalmente desde
//  un archivo studio/js/cloud-config.js (ignorado por git).
//
//  Tabla esperada en Supabase: ver studio/CONFIG-NUBE.md
// ============================================================

import { getConfig, setConfig } from "./db.js";

const BUCKET = "prendas";
let _client = null;
let _firma = null;

// Lee la config (Ajustes tiene prioridad; si no, window.CLOUD_CONFIG).
export async function configActual() {
  const cc = (typeof window !== "undefined" && window.CLOUD_CONFIG) || {};
  const url = (await getConfig("cloud_url", cc.url || "")) || "";
  const key = (await getConfig("cloud_key", cc.key || "")) || "";
  return { url: url.trim(), key: key.trim() };
}

export async function estaConfigurada() {
  const { url, key } = await configActual();
  return !!(url && key);
}

export async function guardarConfig(url, key) {
  await setConfig("cloud_url", (url || "").trim());
  await setConfig("cloud_key", (key || "").trim());
  _client = null; // forzar recreación
}

async function cliente() {
  const { url, key } = await configActual();
  if (!url || !key) return null;
  const firma = url + "|" + key;
  if (_client && _firma === firma) return _client;
  const { createClient } = await import("@supabase/supabase-js");
  _client = createClient(url, key);
  _firma = firma;
  return _client;
}

// Verifica que la conexión y la tabla existan.
export async function probar() {
  const c = await cliente();
  if (!c) throw new Error("Falta la URL o la clave.");
  const { error } = await c.from("prendas").select("codigo").limit(1);
  if (error) throw new Error(error.message || "No pude leer la tabla 'prendas'.");
  return true;
}

// ---------- Imágenes (varias por prenda: codigo-0.jpg, codigo-1.jpg, …) ----------
async function subirImagenes(c, codigo, blobs) {
  const urls = [];
  for (let i = 0; i < blobs.length; i++) {
    if (!blobs[i]) continue;
    const path = `${codigo}-${i}.jpg`;
    const { error } = await c.storage.from(BUCKET).upload(path, blobs[i], {
      upsert: true, contentType: blobs[i].type || "image/jpeg",
    });
    if (error) throw new Error("Storage: " + error.message);
    urls.push(c.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

// ---------- Prendas ----------
function aFila(p, urls) {
  const fotos = (urls && urls.length) ? urls : (p.fotos || (p.fotoFinalURL ? [p.fotoFinalURL] : []));
  return {
    codigo: p.codigo, estado: p.estado, nombre: p.nombre, marca: p.marca,
    categoria: p.categoria, talle: p.talle, condicion: p.condicion,
    precio: p.precio, descripcion: p.descripcion, plantilla: p.plantillaUsada || null,
    foto_url: fotos[0] ?? null,        // portada (compatibilidad con consumidores simples)
    fotos: JSON.stringify(fotos),      // array completo de URLs
    creada: p.creada,
  };
}

function aPrenda(f) {
  let fotos = [];
  try { fotos = f.fotos ? JSON.parse(f.fotos) : []; } catch { fotos = []; }
  if (!fotos.length && f.foto_url) fotos = [f.foto_url];
  return {
    codigo: f.codigo, estado: f.estado, nombre: f.nombre, marca: f.marca,
    categoria: f.categoria, talle: f.talle, condicion: f.condicion,
    precio: f.precio, descripcion: f.descripcion, plantillaUsada: f.plantilla,
    fotoFinalURL: f.foto_url || fotos[0] || null, fotos,
    creada: f.creada, enNube: true,
  };
}

// Sube/actualiza una prenda (TODAS sus fotos + fila). Devuelve la URL de portada.
export async function subirPrenda(prenda) {
  const c = await cliente();
  if (!c) return null;
  const blobs = (prenda.fotosFinalBlobs && prenda.fotosFinalBlobs.length)
    ? prenda.fotosFinalBlobs
    : (prenda.fotoFinalBlob ? [prenda.fotoFinalBlob] : []);
  const urls = await subirImagenes(c, prenda.codigo, blobs);
  const fila = aFila(prenda, urls);
  let { error } = await c.from("prendas").upsert(fila, { onConflict: "codigo" });
  // Compatibilidad: si la tabla todavía no tiene la columna 'fotos', reintenta sin ella.
  if (error && /fotos/i.test(error.message || "")) {
    const { fotos, ...sinFotos } = fila;
    ({ error } = await c.from("prendas").upsert(sinFotos, { onConflict: "codigo" }));
  }
  if (error) throw new Error(error.message);
  prenda.fotos = urls;
  return urls[0] || null;
}

// Trae todo el stock de la nube (más nuevas primero).
export async function bajarPrendas() {
  const c = await cliente();
  if (!c) return [];
  const { data, error } = await c.from("prendas").select("*").order("creada", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(aPrenda);
}

export async function borrarPrendaCloud(codigo) {
  const c = await cliente();
  if (!c) return;
  // Borra la portada vieja (codigo.jpg) y hasta 16 fotos (codigo-0..15.jpg).
  const paths = [`${codigo}.jpg`, ...Array.from({ length: 16 }, (_, i) => `${codigo}-${i}.jpg`)];
  await c.storage.from(BUCKET).remove(paths);
  const { error } = await c.from("prendas").delete().eq("codigo", codigo);
  if (error) throw new Error(error.message);
}

// Próximo número correlativo MIRANDO la nube (evita choques entre dispositivos).
// base = "RS-TEE-"  → devuelve max(existentes)+1
export async function proximoNumeroNube(base) {
  const c = await cliente();
  if (!c) return null;
  const { data, error } = await c.from("prendas").select("codigo").like("codigo", base + "%");
  if (error) throw new Error(error.message);
  let max = 0;
  (data || []).forEach((r) => {
    const m = String(r.codigo).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max + 1;
}
