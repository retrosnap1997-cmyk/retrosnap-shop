// ============================================================
//  CONTROLADOR PRINCIPAL de RetroSnap Studio
//  Flujo: stock → capturar (VARIAS) → recorte en lote → ficha.
// ============================================================

import { CATEGORIAS, MARCAS, CONDICIONES, categoriaPorId, PREFIJO_DEFECTO } from "./catalog.js";
import * as DB from "./db.js";
import * as Cam from "./camera.js";
import * as Cut from "./cutout.js";
import { generarCodigo } from "./codes.js";
import { aCSV, aJSON, descargar } from "./export.js";
import { TEMPLATES, templatePorId, precargarTemplates } from "./templates.js";
import * as Cloud from "./cloud.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Etiqueta de versión visible (para confirmar que NO estás viendo caché viejo).
const VERSION = "v10 · auto-percha + modelo full";

// ---------- Estado del flujo de captura (multi-foto) ----------
const flujo = {
  modo: "colgada",
  capturas: [],        // Blobs originales (varias fotos de la MISMA prenda)
  recortes: [],        // canvas recortados (transparentes), en paralelo a capturas
  cover: 0,            // índice de la foto principal
  fondo: "blanco",     // "blanco" | "#rrggbb" | "transparente" | "tpl:<id>"
  motor: null,
};

let templatesImg = {}; // plantillas precargadas (id → HTMLImageElement)

function fondoActual() {
  if (flujo.fondo.startsWith("tpl:")) {
    const id = flujo.fondo.slice(4);
    const t = templatePorId(id);
    return { templateImg: templatesImg[id] || null, caja: t ? t.caja || null : null };
  }
  return { templateImg: null, caja: null };
}

// ---------- Navegación ----------
function ir(pantalla) {
  $$(".screen").forEach((s) => s.classList.remove("activa"));
  $("#screen-" + pantalla).classList.add("activa");
  $$(".tab").forEach((t) => t.classList.toggle("activa", t.dataset.ir === pantalla));

  if (pantalla === "capturar") { arrancarCamara(); renderCamTray(); }
  else Cam.detener();
  if (pantalla === "stock") renderStock();
}

// ---------- Toast ----------
let toastTimer;
function toast(txt) {
  const t = $("#toast");
  t.textContent = txt;
  t.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("visible"), 2400);
}

const dinero = (n) => "$" + n;

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : s;
  return d.innerHTML;
}

// ============================================================
//  STOCK
// ============================================================
function imgURLDe(p) {
  if (p.fotoFinalURL) return p.fotoFinalURL;
  if (p.fotos && p.fotos[0]) return p.fotos[0];
  if (p.fotoFinalBlob) return URL.createObjectURL(p.fotoFinalBlob);
  if (p.fotosFinalBlobs && p.fotosFinalBlobs[0]) return URL.createObjectURL(p.fotosFinalBlobs[0]);
  return "";
}
function numFotos(p) {
  return (p.fotos && p.fotos.length) ||
         (p.fotosFinalBlobs && p.fotosFinalBlobs.length) ||
         (p.fotoFinalURL || p.fotoFinalBlob ? 1 : 0);
}

async function renderStock() {
  const locales = await DB.listarPrendas();
  let prendas = locales;

  if (navigator.onLine && await Cloud.estaConfigurada()) {
    try {
      const remotas = await Cloud.bajarPrendas();
      const enRemoto = new Set(remotas.map((p) => p.codigo));
      for (const p of remotas) await DB.guardarPrenda(p);
      const pendientes = locales.filter((p) => p.pendienteSync && !enRemoto.has(p.codigo));
      prendas = [...pendientes, ...remotas];
    } catch (e) {
      console.warn("[stock] no pude leer la nube, muestro lo local:", e);
    }
  }

  const grid = $("#stock-grid");
  $("#stock-vacio").hidden = prendas.length > 0;
  $("#stock-stats").textContent = prendas.length
    ? `${prendas.length} prenda${prendas.length > 1 ? "s" : ""} · ${prendas.filter(p => p.pendienteSync).length} sin subir`
    : "";

  grid.innerHTML = prendas.map((p) => {
    const url = imgURLDe(p);
    const cat = categoriaPorId(p.categoria);
    const n = numFotos(p);
    return `
      <article class="prenda" data-codigo="${p.codigo}">
        <div class="prenda-img">
          ${url ? `<img src="${url}" alt="${esc(p.nombre)}" loading="lazy">` : `<div class="sin-img">${cat ? cat.emoji : "📦"}</div>`}
          <span class="prenda-cod">${esc(p.codigo)}</span>
          ${n > 1 ? `<span class="prenda-nfotos" title="${n} fotos">📷 ${n}</span>` : ""}
          ${p.pendienteSync ? `<span class="prenda-sync" title="Pendiente de subir a la nube">⏳</span>` : ""}
        </div>
        <div class="prenda-info">
          <strong>${esc(p.nombre || "(sin nombre)")}</strong>
          <span>${esc(p.marca || "")} ${p.talle ? "· " + esc(p.talle) : ""}</span>
          <span class="prenda-precio">${dinero(p.precio || 0)}</span>
        </div>
        <button class="prenda-del" data-del="${p.codigo}" title="Borrar">🗑️</button>
      </article>`;
  }).join("");
}

// ============================================================
//  CAPTURAR (varias fotos)
// ============================================================
function renderModos() {
  $("#modos").innerHTML = Object.entries(Cam.MODOS).map(([id, m]) =>
    `<button class="modo-chip ${id === flujo.modo ? "activa" : ""}" data-modo="${id}">
       <span>${m.emoji}</span>${m.nombre}
     </button>`
  ).join("");
  aplicarGuia();
}

function aplicarGuia() {
  const m = Cam.MODOS[flujo.modo];
  $("#cam-guia").className = "cam-guia guia-" + (m ? m.guia : "cuadrada");
}

async function arrancarCamara() {
  if (!Cam.camaraSoportada()) return; // en PC sin cámara, se usa Galería
  try { await Cam.iniciar($("#cam-video")); }
  catch (e) { console.warn("cámara:", e); }
}

// Cada disparo SUMA una foto a la prenda actual (no avanza solo).
async function sacarFoto() {
  try {
    const cuadrado = Cam.MODOS[flujo.modo].guia === "cuadrada";
    const { blob } = await Cam.capturar($("#cam-video"), { cuadrado });
    flujo.capturas.push(blob);
    renderCamTray();
    toast(`Foto ${flujo.capturas.length} ✓`);
  } catch (e) {
    console.error(e);
    toast(e.message || "No pude sacar la foto.");
  }
}

// Tira de miniaturas de las fotos tomadas + botón "Continuar".
function renderCamTray() {
  const tray = $("#cam-tray");
  const n = flujo.capturas.length;
  tray.hidden = n === 0;
  tray.innerHTML = flujo.capturas.map((b, i) =>
    `<div class="tray-item">
       <img src="${URL.createObjectURL(b)}" alt="">
       <button class="tray-del" data-quita-cap="${i}" title="Quitar">✕</button>
     </div>`).join("");
  const listo = $("#btn-cam-listo");
  listo.hidden = n === 0;
  listo.textContent = `Recortar ${n} foto${n > 1 ? "s" : ""} →`;
}

// ============================================================
//  RECORTE EN LOTE
// ============================================================
async function procesarRecorteBatch() {
  const cargando = $("#recorte-cargando");
  const barra = $("#recorte-barra");
  const msg = $("#recorte-msg");
  cargando.hidden = false;
  $("#recorte-grid").innerHTML = "";
  $("#btn-a-ficha").disabled = true;
  flujo.recortes = [];
  flujo.cover = 0;

  const N = flujo.capturas.length;
  let algunIA = false, algunOff = false;

  for (let i = 0; i < N; i++) {
    try {
      const { canvas, motor } = await Cut.recortar(flujo.capturas[i], {
        onProgress: (texto, pct) => {
          msg.textContent = `Recortando ${i + 1}/${N} — ${texto}`;
          barra.style.width = Math.round(((i + pct) / N) * 100) + "%";
        },
      });
      flujo.recortes.push(canvas);
      if (motor === "ia") algunIA = true; else algunOff = true;
    } catch (e) {
      console.error("recorte falló en", i, e);
    }
  }

  cargando.hidden = true;
  flujo.motor = algunIA ? "ia" : "offline";
  $("#motor-nota").textContent = algunIA
    ? "Recortado con IA ✨" + (algunOff ? " · alguna salió con recorte offline" : "")
    : "Recorte offline (con internet sale más fino).";

  renderRecorteGrid();
  $("#btn-a-ficha").disabled = flujo.recortes.length === 0;
  if (!flujo.recortes.length) toast("No pude recortar ninguna. Probá otras fotos.");
}

function renderRecorteGrid() {
  $("#recorte-contador").textContent = flujo.recortes.length ? `(${flujo.recortes.length})` : "";
  const { templateImg, caja } = fondoActual();
  const grid = $("#recorte-grid");
  grid.innerHTML = flujo.recortes.map((_, i) =>
    `<div class="recorte-thumb ${i === flujo.cover ? "es-cover" : ""}" data-i="${i}">
       <canvas></canvas>
       ${i === flujo.cover ? `<span class="thumb-cover">⭐ Principal</span>` : ""}
       <button class="thumb-del" data-del-foto="${i}" title="Quitar">🗑️</button>
     </div>`).join("");
  grid.querySelectorAll(".recorte-thumb").forEach((el, i) => {
    pintarThumb(el.querySelector("canvas"), flujo.recortes[i], templateImg, caja);
  });
}

function pintarThumb(canvas, recorteCanvas, templateImg, caja) {
  const size = 600;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  if (!templateImg && flujo.fondo === "transparente") pintarDamero(ctx, size);
  else Cut.dibujarFondo(ctx, size, { fondo: flujo.fondo, templateImg });
  Cut.colocarPrenda(ctx, size, recorteCanvas, caja);
}

function renderFondos() {
  const chipsTpl = TEMPLATES.map((t) =>
    `<button class="fondo-chip fondo-tpl" data-fondo="tpl:${t.id}">🎨 ${esc(t.nombre)}</button>`
  ).join("");
  const chipsColor = [
    ['blanco', '#fff', 'Blanco'],
    ['#f4f1ec', '#f4f1ec', 'Hueso'],
    ['#0F0A0A', '#0F0A0A', 'Negro'],
    ['transparente', 'transparent', 'PNG'],
  ].map(([f, c, n]) =>
    `<button class="fondo-chip" data-fondo="${f}" style="--c:${c}">${n}</button>`
  ).join("");
  $("#fondos-chips").innerHTML = chipsTpl + chipsColor;
  sincronizarFondoChips();
}

function pintarDamero(ctx, size) {
  const t = 40;
  for (let y = 0; y < size; y += t) {
    for (let x = 0; x < size; x += t) {
      ctx.fillStyle = ((x / t + y / t) % 2 === 0) ? "#e9e9e9" : "#ffffff";
      ctx.fillRect(x, y, t, t);
    }
  }
}

function sincronizarFondoChips() {
  $$(".fondo-chip").forEach((c) =>
    c.classList.toggle("activa", c.dataset.fondo === flujo.fondo));
}

// ============================================================
//  FICHA
// ============================================================
function poblarSelects() {
  $("#f-categoria").innerHTML = CATEGORIAS.map((c) => `<option value="${c.id}">${c.emoji} ${c.nombre}</option>`).join("");
  $("#f-marca").innerHTML = MARCAS.map((m) => `<option>${esc(m)}</option>`).join("");
  $("#f-condicion").innerHTML = CONDICIONES.map((c) => `<option>${esc(c)}</option>`).join("");
}

function aplicarPlantillaFicha(catId) {
  const cat = categoriaPorId(catId);
  if (!cat) return;
  const f = cat.ficha;
  $("#f-condicion").value = f.condicion;
  $("#f-precio").value = f.precio;
  if (!$("#f-desc").value.trim() || $("#f-desc").dataset.auto === "1") {
    $("#f-desc").value = f.descripcion;
    $("#f-desc").dataset.auto = "1";
  }
  $("#f-talle").innerHTML = f.talles.map((t) => `<option>${esc(t)}</option>`).join("");
  if (cat.fondo === "modelo") flujo.fondo = TEMPLATES.length ? "tpl:" + TEMPLATES[0].id : "blanco";
  else if (cat.fondo === "arena") flujo.fondo = "#f4f1ec";
  else flujo.fondo = "blanco";
  sincronizarFondoChips();
  renderRecorteGrid();
}

function prepararFicha() {
  poblarSelects();
  $("#f-nombre").value = "";
  $("#f-desc").value = "";
  $("#f-desc").dataset.auto = "1";
  $("#f-categoria").value = CATEGORIAS[0].id;
  aplicarPlantillaFicha(CATEGORIAS[0].id);
}

async function guardarPrenda() {
  const catId = $("#f-categoria").value;
  const nombre = $("#f-nombre").value.trim();
  if (!nombre) { toast("Poné un nombre a la prenda."); return; }
  if (!flujo.recortes.length) { toast("Falta al menos una foto recortada."); return; }

  $("#btn-guardar").disabled = true;
  try {
    const codigo = await generarCodigo(catId);
    const { templateImg, caja } = fondoActual();

    // Componer TODAS las fotos con el fondo elegido; la principal va primera.
    const orden = [flujo.cover, ...flujo.recortes.map((_, i) => i).filter((i) => i !== flujo.cover)];
    const fotosFinalBlobs = [];
    for (const i of orden) {
      fotosFinalBlobs.push(await Cut.componer(flujo.recortes[i], { fondo: flujo.fondo, templateImg, caja }));
    }

    const prenda = {
      codigo,
      estado: "lista_publicar",
      nombre,
      marca: $("#f-marca").value,
      categoria: catId,
      talle: $("#f-talle").value,
      condicion: $("#f-condicion").value,
      precio: Number($("#f-precio").value) || 0,
      descripcion: $("#f-desc").value.trim(),
      fotosFinalBlobs,                 // todas las fotos editadas
      fotoFinalBlob: fotosFinalBlobs[0], // portada (= principal)
      coverIndex: 0,
      plantillaUsada: flujo.fondo,
      motorRecorte: flujo.motor,
      creada: new Date().toISOString(),
      shopifyId: null,
      instagramId: null,
    };
    await DB.guardarPrenda(prenda);

    if (await Cloud.estaConfigurada()) {
      try {
        await Cloud.subirPrenda(prenda);     // sube todas las fotos + fila
        prenda.fotoFinalURL = prenda.fotos ? prenda.fotos[0] : null;
        prenda.pendienteSync = false;
        await DB.guardarPrenda(prenda);
        toast(`Guardada y subida: ${codigo} (${fotosFinalBlobs.length} fotos) ☁️`);
      } catch (e) {
        console.warn("[guardar] la nube falló, queda pendiente:", e);
        prenda.pendienteSync = true;
        await DB.guardarPrenda(prenda);
        toast(`Guardada local: ${codigo} — se sube al sincronizar`);
      }
    } else {
      toast(`Guardada: ${codigo} (${fotosFinalBlobs.length} fotos) 🤙`);
    }
    resetFlujo();
    ir("stock");
  } catch (e) {
    console.error(e);
    toast("No pude guardar. Probá de nuevo.");
  } finally {
    $("#btn-guardar").disabled = false;
  }
}

function resetFlujo() {
  flujo.capturas = [];
  flujo.recortes = [];
  flujo.cover = 0;
  flujo.motor = null;
}

// ============================================================
//  AJUSTES / NUBE
// ============================================================
async function cargarAjustes() {
  const prefijo = await DB.getConfig("prefijo", PREFIJO_DEFECTO);
  $("#a-prefijo").value = prefijo;
  $("#a-ejemplo").textContent = `${prefijo}-TEE-0001`;
  const { url, key } = await Cloud.configActual();
  $("#a-cloud-url").value = url;
  $("#a-cloud-key").value = key;
  const ver = $("#app-version");
  if (ver) ver.textContent = "Versión: " + VERSION;
  await actualizarEstadoNube();
}

async function actualizarEstadoNube() {
  const el = $("#cloud-estado");
  if (!el) return;
  el.textContent = (await Cloud.estaConfigurada())
    ? "Estado: configurada ☁️ — el stock se sincroniza con la nube."
    : "Estado: sin configurar (el stock vive solo en este teléfono).";
}

async function sincronizar() {
  if (!(await Cloud.estaConfigurada())) { toast("Configurá la nube primero."); return; }
  toast("Sincronizando…");
  try {
    const locales = await DB.listarPrendas();
    for (const p of locales.filter((x) => x.pendienteSync)) {
      await Cloud.subirPrenda(p);
      p.fotoFinalURL = p.fotos ? p.fotos[0] : p.fotoFinalURL;
      p.pendienteSync = false;
      await DB.guardarPrenda(p);
    }
    await renderStock();
    toast("Stock sincronizado ☁️");
  } catch (e) {
    console.error(e);
    toast("Error al sincronizar: " + e.message);
  }
}

// ============================================================
//  EXPORTAR
// ============================================================
async function exportar() {
  const prendas = await DB.listarPrendas();
  if (!prendas.length) { toast("No hay nada para exportar todavía."); return; }
  const fecha = new Date().toISOString().slice(0, 10);
  descargar(`retrosnap-stock-${fecha}.csv`, aCSV(prendas), "text/csv");
  descargar(`retrosnap-stock-${fecha}.json`, aJSON(prendas), "application/json");
  toast("Stock exportado ⬇️");
}

// ============================================================
//  EVENTOS
// ============================================================
function bind() {
  document.body.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-ir]");
    if (nav) ir(nav.dataset.ir);
  });

  $("#modos").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-modo]");
    if (!chip) return;
    flujo.modo = chip.dataset.modo;
    renderModos();
  });

  // Cámara: cada disparo suma una foto
  $("#btn-shutter").addEventListener("click", sacarFoto);
  $("#btn-cam-listo").addEventListener("click", () => {
    if (!flujo.capturas.length) return;
    ir("recorte");
    procesarRecorteBatch();
  });

  // Galería: elegí VARIAS fotos de una vez
  $("#btn-galeria").addEventListener("click", () => $("#file-galeria").click());
  $("#file-galeria").addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((f) => flujo.capturas.push(f));
    e.target.value = "";
    ir("recorte");
    procesarRecorteBatch();
  });

  // Tira de la cámara: quitar una foto tomada
  $("#cam-tray").addEventListener("click", (e) => {
    const q = e.target.closest("[data-quita-cap]");
    if (!q) return;
    flujo.capturas.splice(+q.dataset.quitaCap, 1);
    renderCamTray();
  });

  // Recorte: cambiar fondo (aplica a todas)
  $(".fondos").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-fondo]");
    if (!chip) return;
    flujo.fondo = chip.dataset.fondo;
    sincronizarFondoChips();
    renderRecorteGrid();
  });

  // Grilla de recortes: elegir principal / quitar
  $("#recorte-grid").addEventListener("click", (e) => {
    const del = e.target.closest("[data-del-foto]");
    if (del) {
      const i = +del.dataset.delFoto;
      flujo.recortes.splice(i, 1);
      flujo.capturas.splice(i, 1);
      if (flujo.cover >= flujo.recortes.length) flujo.cover = Math.max(0, flujo.recortes.length - 1);
      else if (i < flujo.cover) flujo.cover--;
      renderRecorteGrid();
      $("#btn-a-ficha").disabled = flujo.recortes.length === 0;
      return;
    }
    const thumb = e.target.closest(".recorte-thumb");
    if (thumb) { flujo.cover = +thumb.dataset.i; renderRecorteGrid(); }
  });

  $("#btn-rehacer").addEventListener("click", () => { resetFlujo(); ir("capturar"); });
  $("#btn-a-ficha").addEventListener("click", () => { prepararFicha(); ir("ficha"); });

  $("#f-categoria").addEventListener("change", (e) => aplicarPlantillaFicha(e.target.value));
  $("#f-desc").addEventListener("input", (e) => { e.target.dataset.auto = "0"; });
  $("#btn-guardar").addEventListener("click", guardarPrenda);

  $("#stock-grid").addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del]");
    if (!del) return;
    if (confirm("¿Borrar esta prenda del stock?")) {
      const codigo = del.dataset.del;
      await DB.borrarPrenda(codigo);
      if (await Cloud.estaConfigurada()) {
        try { await Cloud.borrarPrendaCloud(codigo); }
        catch (e) { console.warn("[borrar] nube:", e); }
      }
      renderStock();
    }
  });

  $("#btn-export").addEventListener("click", exportar);
  $("#btn-export-2").addEventListener("click", exportar);

  $("#btn-cloud-probar").addEventListener("click", async () => {
    await Cloud.guardarConfig($("#a-cloud-url").value, $("#a-cloud-key").value);
    await actualizarEstadoNube();
    toast("Probando conexión…");
    try { await Cloud.probar(); toast("Conexión OK ✅"); }
    catch (e) { toast("Falló: " + e.message); }
  });
  $("#btn-cloud-sync").addEventListener("click", async () => {
    await Cloud.guardarConfig($("#a-cloud-url").value, $("#a-cloud-key").value);
    await actualizarEstadoNube();
    sincronizar();
  });

  $("#a-prefijo").addEventListener("input", async (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") || PREFIJO_DEFECTO;
    await DB.setConfig("prefijo", v);
    $("#a-ejemplo").textContent = `${v}-TEE-0001`;
  });

  const dot = $("#online-dot");
  const actualizarOnline = () => dot.classList.toggle("off", !navigator.onLine);
  window.addEventListener("online", actualizarOnline);
  window.addEventListener("offline", actualizarOnline);
  actualizarOnline();
}

// ============================================================
//  INIT
// ============================================================
async function init() {
  renderModos();
  templatesImg = await precargarTemplates();
  renderFondos();
  bind();
  await cargarAjustes();
  await renderStock();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW:", e));
  }
}

init();
