// ============================================================
//  CONTROLADOR PRINCIPAL de RetroSnap Studio
//  Conecta las pantallas: stock → capturar → recorte → ficha.
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

// ---------- Estado del flujo de captura ----------
const flujo = {
  modo: "colgada",
  capturaBlob: null,   // foto original
  recorteCanvas: null, // prenda recortada (transparente, cuadrada)
  fondo: "blanco",     // "blanco" | "#rrggbb" | "transparente" | "tpl:<id>"
  motor: null,
};

// Imágenes de las plantillas precargadas (id → HTMLImageElement)
let templatesImg = {};

// Devuelve { templateImg, caja } si el fondo actual es una plantilla.
function fondoActual() {
  if (flujo.fondo.startsWith("tpl:")) {
    const id = flujo.fondo.slice(4);
    const t = templatePorId(id);
    return { templateImg: templatesImg[id] || null, caja: t ? t.caja || null : null };
  }
  return { templateImg: null, caja: null };
}

// ---------- Navegación entre pantallas ----------
function ir(pantalla) {
  $$(".screen").forEach((s) => s.classList.remove("activa"));
  $("#screen-" + pantalla).classList.add("activa");
  $$(".tab").forEach((t) => t.classList.toggle("activa", t.dataset.ir === pantalla));

  // Encender/apagar la cámara según corresponda.
  if (pantalla === "capturar") arrancarCamara();
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

// ---------- Dinero ----------
const dinero = (n) => "$" + n;

// ============================================================
//  STOCK
// ============================================================
async function renderStock() {
  const locales = await DB.listarPrendas();
  let prendas = locales;

  // Si la nube está configurada y hay señal, ella es la fuente de verdad.
  if (navigator.onLine && await Cloud.estaConfigurada()) {
    try {
      const remotas = await Cloud.bajarPrendas();
      const enRemoto = new Set(remotas.map((p) => p.codigo));
      for (const p of remotas) await DB.guardarPrenda(p); // cachear para offline
      const pendientes = locales.filter((p) => p.pendienteSync && !enRemoto.has(p.codigo));
      prendas = [...pendientes, ...remotas];
    } catch (e) {
      console.warn("[stock] no pude leer la nube, muestro lo local:", e);
    }
  }

  const grid = $("#stock-grid");
  const vacio = $("#stock-vacio");
  const stats = $("#stock-stats");

  vacio.hidden = prendas.length > 0;
  stats.textContent = prendas.length
    ? `${prendas.length} prenda${prendas.length > 1 ? "s" : ""} · ${prendas.filter(p => p.pendienteSync).length} sin subir`
    : "";

  grid.innerHTML = prendas.map((p) => {
    const url = imgURLDe(p);
    const cat = categoriaPorId(p.categoria);
    return `
      <article class="prenda" data-codigo="${p.codigo}">
        <div class="prenda-img">
          ${url ? `<img src="${url}" alt="${esc(p.nombre)}" loading="lazy">` : `<div class="sin-img">${cat ? cat.emoji : "📦"}</div>`}
          <span class="prenda-cod">${esc(p.codigo)}</span>
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

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : s;
  return d.innerHTML;
}

// URL de imagen de una prenda: la de la nube si existe, si no el blob local.
function imgURLDe(p) {
  if (p.fotoFinalURL) return p.fotoFinalURL;
  if (p.fotoFinalBlob) return URL.createObjectURL(p.fotoFinalBlob);
  return "";
}

// ============================================================
//  CAPTURAR
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
  if (!Cam.camaraSoportada()) {
    toast("Este navegador no permite usar la cámara.");
    return;
  }
  try {
    await Cam.iniciar($("#cam-video"));
  } catch (e) {
    console.error(e);
    toast("No pude abrir la cámara. Revisá los permisos.");
  }
}

async function sacarFoto() {
  try {
    const cuadrado = Cam.MODOS[flujo.modo].guia === "cuadrada";
    const { blob } = await Cam.capturar($("#cam-video"), { cuadrado });
    flujo.capturaBlob = blob;
    ir("recorte");
    procesarRecorte();
  } catch (e) {
    console.error(e);
    toast(e.message || "No pude sacar la foto.");
  }
}

// ============================================================
//  RECORTE
// ============================================================
async function procesarRecorte() {
  const cargando = $("#recorte-cargando");
  const barra = $("#recorte-barra");
  const msg = $("#recorte-msg");
  cargando.hidden = false;
  $("#btn-a-ficha").disabled = true;

  try {
    const { canvas, motor } = await Cut.recortar(flujo.capturaBlob, {
      onProgress: (texto, pct) => {
        msg.textContent = texto;
        barra.style.width = Math.round(pct * 100) + "%";
      },
    });
    flujo.recorteCanvas = canvas;
    flujo.motor = motor;
    $("#motor-nota").textContent = motor === "ia"
      ? "Recortado con IA ✨"
      : "Recorte offline (fondo parejo). Con internet sale más fino.";
    pintarPreview();
    $("#btn-a-ficha").disabled = false;
  } catch (e) {
    console.error(e);
    toast("No pude recortar. Probá otra foto.");
  } finally {
    cargando.hidden = true;
  }
}

// Dibuja la previsualización del recorte sobre el fondo/plantilla elegido.
function pintarPreview() {
  if (!flujo.recorteCanvas) return;
  const canvas = $("#recorte-canvas");
  const size = 1000;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  const { templateImg, caja } = fondoActual();
  if (!templateImg && flujo.fondo === "transparente") {
    pintarDamero(ctx, size); // solo visual: marca la transparencia
  } else {
    Cut.dibujarFondo(ctx, size, { fondo: flujo.fondo, templateImg });
  }
  Cut.colocarPrenda(ctx, size, flujo.recorteCanvas, caja);
}

// Construye los chips de fondo: primero las plantillas (si hay), luego colores.
function renderFondos() {
  const chipsTpl = TEMPLATES.map((t) =>
    `<button class="fondo-chip fondo-tpl" data-fondo="tpl:${t.id}">🎨 ${esc(t.nombre)}</button>`
  ).join("");
  const chipsColor = [
    ['blanco', '#fff', 'Blanco'],
    ['#f6f1e7', '#f6f1e7', 'Arena'],
    ['#176d6d', '#176d6d', 'Océano'],
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

// ============================================================
//  FICHA
// ============================================================
function poblarSelects() {
  $("#f-categoria").innerHTML = CATEGORIAS.map((c) => `<option value="${c.id}">${c.emoji} ${c.nombre}</option>`).join("");
  $("#f-marca").innerHTML = MARCAS.map((m) => `<option>${esc(m)}</option>`).join("");
  $("#f-condicion").innerHTML = CONDICIONES.map((c) => `<option>${esc(c)}</option>`).join("");
}

// Al cambiar categoría, autocompletamos según la plantilla de ficha.
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
  // Fondo sugerido por categoría: "modelo" usa la 1ª plantilla si hay alguna.
  if (cat.fondo === "modelo") flujo.fondo = TEMPLATES.length ? "tpl:" + TEMPLATES[0].id : "blanco";
  else if (cat.fondo === "arena") flujo.fondo = "#f6f1e7";
  else flujo.fondo = "blanco";
  sincronizarFondoChips();
  pintarPreview();
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
  if (!flujo.recorteCanvas) { toast("Falta la foto recortada."); return; }

  $("#btn-guardar").disabled = true;
  try {
    const codigo = await generarCodigo(catId);
    const { templateImg, caja } = fondoActual();
    const fotoFinalBlob = await Cut.componer(flujo.recorteCanvas, { fondo: flujo.fondo, templateImg, caja });

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
      fotoOriginalBlob: flujo.capturaBlob,
      fotoFinalBlob,
      plantillaUsada: flujo.fondo,
      motorRecorte: flujo.motor,
      creada: new Date().toISOString(),
      shopifyId: null,
      instagramId: null,
    };
    await DB.guardarPrenda(prenda);

    // Subir a la nube (si está configurada). Si falla, queda pendiente.
    if (await Cloud.estaConfigurada()) {
      try {
        prenda.fotoFinalURL = await Cloud.subirPrenda(prenda);
        prenda.pendienteSync = false;
        await DB.guardarPrenda(prenda);
        toast("Guardada y subida: " + codigo + " ☁️");
      } catch (e) {
        console.warn("[guardar] la nube falló, queda pendiente:", e);
        prenda.pendienteSync = true;
        await DB.guardarPrenda(prenda);
        toast("Guardada local: " + codigo + " — se sube al sincronizar");
      }
    } else {
      toast("Guardada: " + codigo + " 🤙");
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
  flujo.capturaBlob = null;
  flujo.recorteCanvas = null;
  flujo.motor = null;
}

// ============================================================
//  FONDOS
// ============================================================
function sincronizarFondoChips() {
  $$(".fondo-chip").forEach((c) =>
    c.classList.toggle("activa", c.dataset.fondo === flujo.fondo));
}

// ============================================================
//  AJUSTES
// ============================================================
async function cargarAjustes() {
  const prefijo = await DB.getConfig("prefijo", PREFIJO_DEFECTO);
  $("#a-prefijo").value = prefijo;
  $("#a-ejemplo").textContent = `${prefijo}-TEE-0001`;

  const { url, key } = await Cloud.configActual();
  $("#a-cloud-url").value = url;
  $("#a-cloud-key").value = key;
  await actualizarEstadoNube();
}

// ============================================================
//  NUBE
// ============================================================
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
    // Subir lo que quedó pendiente (sin señal o por error).
    const locales = await DB.listarPrendas();
    for (const p of locales.filter((x) => x.pendienteSync)) {
      p.fotoFinalURL = await Cloud.subirPrenda(p);
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
  // Navegación (tabs + botones data-ir)
  document.body.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-ir]");
    if (nav) ir(nav.dataset.ir);
  });

  // Modos de captura
  $("#modos").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-modo]");
    if (!chip) return;
    flujo.modo = chip.dataset.modo;
    renderModos();
  });

  // Disparador
  $("#btn-shutter").addEventListener("click", sacarFoto);

  // Subir foto desde la galería (mismo flujo de recorte que la cámara)
  $("#btn-galeria").addEventListener("click", () => $("#file-galeria").click());
  $("#file-galeria").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    flujo.capturaBlob = f;
    e.target.value = "";        // permite re-elegir la misma foto
    ir("recorte");
    procesarRecorte();
  });

  // Recorte: fondos
  $(".fondos").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-fondo]");
    if (!chip) return;
    flujo.fondo = chip.dataset.fondo;
    sincronizarFondoChips();
    pintarPreview();
  });
  $("#btn-rehacer").addEventListener("click", () => ir("capturar"));
  $("#btn-a-ficha").addEventListener("click", () => { prepararFicha(); ir("ficha"); });

  // Ficha
  $("#f-categoria").addEventListener("change", (e) => aplicarPlantillaFicha(e.target.value));
  $("#f-desc").addEventListener("input", (e) => { e.target.dataset.auto = "0"; });
  $("#btn-guardar").addEventListener("click", guardarPrenda);

  // Stock: borrar
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

  // Export
  $("#btn-export").addEventListener("click", exportar);
  $("#btn-export-2").addEventListener("click", exportar);

  // Nube
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

  // Ajustes: prefijo
  $("#a-prefijo").addEventListener("input", async (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") || PREFIJO_DEFECTO;
    await DB.setConfig("prefijo", v);
    $("#a-ejemplo").textContent = `${v}-TEE-0001`;
  });

  // Conexión
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

  // Service worker (PWA offline)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW:", e));
  }
}

init();
