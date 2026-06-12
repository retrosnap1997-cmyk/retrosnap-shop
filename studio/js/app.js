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
  const prendas = await DB.listarPrendas();
  const grid = $("#stock-grid");
  const vacio = $("#stock-vacio");
  const stats = $("#stock-stats");

  vacio.hidden = prendas.length > 0;
  stats.textContent = prendas.length
    ? `${prendas.length} prenda${prendas.length > 1 ? "s" : ""} · ${prendas.filter(p => p.estado === "publicada").length} publicadas`
    : "";

  grid.innerHTML = prendas.map((p) => {
    const url = p.fotoFinalBlob ? URL.createObjectURL(p.fotoFinalBlob) : "";
    const cat = categoriaPorId(p.categoria);
    return `
      <article class="prenda" data-codigo="${p.codigo}">
        <div class="prenda-img">
          ${url ? `<img src="${url}" alt="${esc(p.nombre)}">` : `<div class="sin-img">${cat ? cat.emoji : "📦"}</div>`}
          <span class="prenda-cod">${esc(p.codigo)}</span>
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
    toast("Guardada: " + codigo + " 🤙");
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
      await DB.borrarPrenda(del.dataset.del);
      renderStock();
    }
  });

  // Export
  $("#btn-export").addEventListener("click", exportar);
  $("#btn-export-2").addEventListener("click", exportar);

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
