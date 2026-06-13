// ============================================================
//  LÓGICA DEL SITIO — en general no hace falta tocar este archivo
//  (los textos se editan en config.js y los productos en products.js)
// ============================================================

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ---------- Estado ----------
  let filtroCategoria = null;
  let filtroMarca = null;
  let busqueda = "";
  let carrito = cargarCarrito();

  // ---------- Helpers ----------
  function dinero(n) {
    return TIENDA.simbolo + n + (TIENDA.moneda === "USD" ? "" : " " + TIENDA.moneda);
  }

  function cargarCarrito() {
    try { return JSON.parse(localStorage.getItem("rs_carrito")) || {}; }
    catch { return {}; }
  }
  function guardarCarrito() {
    localStorage.setItem("rs_carrito", JSON.stringify(carrito));
  }

  // Paleta para placeholders generados
  const PALETA = ["#e8603c", "#176d6d", "#f2b441", "#7a9e7e", "#b6655f", "#5b7fa6"];

  function imagenDe(p, grande) {
    if (p.img) return p.img;
    const cat = CATEGORIAS.find((c) => c.id === p.categoria);
    const emoji = cat ? cat.emoji : "🏄";
    const color = PALETA[Math.abs(hash(p.id)) % PALETA.length];
    const size = grande ? 800 : 480;
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
      `<rect width='100%' height='100%' fill='${color}'/>` +
      `<circle cx='${size * 0.8}' cy='${size * 0.15}' r='${size * 0.25}' fill='rgba(255,255,255,0.18)'/>` +
      `<circle cx='${size * 0.1}' cy='${size * 0.9}' r='${size * 0.3}' fill='rgba(0,0,0,0.08)'/>` +
      `<text x='50%' y='52%' font-size='${size * 0.3}' text-anchor='middle' dominant-baseline='middle'>${emoji}</text>` +
      `<text x='50%' y='80%' font-size='${size * 0.05}' text-anchor='middle' fill='rgba(255,255,255,0.85)' font-family='sans-serif' font-weight='bold' letter-spacing='3'>${escaparXML(p.marca.toUpperCase())}</text>` +
      `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i) | 0;
    return h;
  }

  function escaparXML(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&apos;");
  }

  function escaparHTML(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // ---------- Render: textos de config ----------
  function aplicarConfig() {
    document.title = TIENDA.nombre + " · " + TIENDA.eslogan;
    $("#logo-texto").innerHTML = "RETRO<em>SNAP</em>";
    $("#hero-titulo").textContent = TIENDA.heroTitulo;
    $("#hero-texto").textContent = TIENDA.heroTexto;
    $("#hero-boton").textContent = TIENDA.heroBoton;
    $("#eco-titulo").textContent = TIENDA.ecoTitulo;
    $("#eco-texto").textContent = TIENDA.ecoTexto;
    $("#footer-direccion").textContent = TIENDA.direccion;
    $("#footer-email").textContent = TIENDA.email;
    $("#footer-horario").textContent = TIENDA.horario;
    $("#footer-nombre").textContent = TIENDA.nombre;
    $("#anio").textContent = new Date().getFullYear();

    // Banner moto
    if (TIENDA.moto && TIENDA.moto.mostrar) {
      $("#moto-titulo").textContent = TIENDA.moto.titulo;
      $("#moto-texto").textContent = TIENDA.moto.texto;
      const btn = $("#moto-boton");
      btn.textContent = TIENDA.moto.boton;
      btn.href = "https://wa.me/" + TIENDA.whatsapp + "?text=" + encodeURIComponent(TIENDA.moto.mensaje);
    } else {
      $("#banner-moto").style.display = "none";
    }

    // Redes
    const redes = [
      ["instagram", "📸 Instagram"],
      ["tiktok", "🎵 TikTok"],
      ["facebook", "👍 Facebook"],
    ];
    const ul = $("#footer-redes");
    redes.forEach(([k, label]) => {
      if (TIENDA[k]) {
        const li = document.createElement("li");
        li.innerHTML = `<a href="${TIENDA[k]}" target="_blank" rel="noopener">${label}</a>`;
        ul.appendChild(li);
      }
    });
  }

  // ---------- Render: menús ----------
  function renderMenus() {
    const ddShop = $("#dd-shop");
    ddShop.innerHTML = `<a href="#tienda" data-cat="">Ver todo</a>` +
      CATEGORIAS.map((c) => `<a href="#tienda" data-cat="${c.id}">${c.emoji} ${c.nombre}</a>`).join("");

    const ddMarcas = $("#dd-marcas");
    ddMarcas.innerHTML = MARCAS.map((m) => `<a href="#tienda" data-marca="${escaparHTML(m)}">${escaparHTML(m)}</a>`).join("");

    ddShop.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-cat]");
      if (!a) return;
      filtroCategoria = a.dataset.cat || null;
      filtroMarca = null;
      cerrarDropdowns();
      renderTienda();
    });
    ddMarcas.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-marca]");
      if (!a) return;
      filtroMarca = a.dataset.marca;
      filtroCategoria = null;
      cerrarDropdowns();
      renderTienda();
    });
  }

  function cerrarDropdowns() {
    $$(".dropdown").forEach((d) => d.classList.remove("abierto"));
  }

  // ---------- Render: categorías ----------
  function renderCategorias() {
    $("#grid-cats").innerHTML = CATEGORIAS.map((c) =>
      `<a class="cat-tile ${filtroCategoria === c.id ? "activa" : ""}" href="#tienda" data-cat="${c.id}">
        <span class="emoji">${c.emoji}</span>${c.nombre}
      </a>`
    ).join("");
  }

  // ---------- Render: marcas ----------
  function renderMarcas() {
    $("#marcas-strip").innerHTML = MARCAS.map((m) =>
      `<button class="marca-chip ${filtroMarca === m ? "activa" : ""}" data-marca="${escaparHTML(m)}">${escaparHTML(m)}</button>`
    ).join("");
  }

  // ---------- Render: productos ----------
  function cardHTML(p) {
    const tagClase = p.condicion === "Nuevo" ? "tag-condicion nuevo" : "tag-condicion";
    const titulo = escaparHTML(p.nombre) + (p.talle ? ` · ${escaparHTML(p.talle)}` : "");
    return `
      <article class="card" data-id="${p.id}">
        <div class="card-img" data-accion="ver">
          <img src="${imagenDe(p)}" alt="${escaparHTML(p.nombre)}" loading="lazy">
          <span class="${tagClase}">${escaparHTML(p.condicion)}</span>
        </div>
        <div class="card-body">
          <span class="card-marca">${escaparHTML(p.marca)}</span>
          <span class="card-nombre" data-accion="ver">${titulo}</span>
          <div class="card-pie">
            <span class="precio">${dinero(p.precio)}</span>
            <button class="btn-add" data-accion="agregar">Agregar</button>
          </div>
        </div>
      </article>`;
  }

  function renderNovedades() {
    const nuevos = PRODUCTOS.filter((p) => p.destacado);
    $("#grid-novedades").innerHTML = nuevos.map(cardHTML).join("") ||
      `<p class="sin-resultados">Marcá productos con <code>destacado: true</code> en products.js para que aparezcan acá.</p>`;
  }

  function renderTienda() {
    let lista = PRODUCTOS;
    if (filtroCategoria) lista = lista.filter((p) => p.categoria === filtroCategoria);
    if (filtroMarca) lista = lista.filter((p) => p.marca === filtroMarca);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      lista = lista.filter((p) =>
        (p.nombre + " " + p.marca + " " + p.talle + " " + p.descripcion).toLowerCase().includes(q)
      );
    }

    const cat = CATEGORIAS.find((c) => c.id === filtroCategoria);
    let titulo = "Toda la tienda";
    if (cat) titulo = cat.nombre;
    if (filtroMarca) titulo = filtroMarca;
    if (busqueda) titulo = `Resultados para "${busqueda}"`;
    $("#tienda-titulo").textContent = titulo;

    $("#grid-tienda").innerHTML = lista.map(cardHTML).join("") ||
      `<p class="sin-resultados">No encontramos nada con ese filtro 🌊 Probá con otra búsqueda.</p>`;

    renderCategorias();
    renderMarcas();
  }

  // ---------- Modal de producto ----------
  function abrirModal(p) {
    $("#modal-img").src = imagenDe(p, true);
    $("#modal-img").alt = p.nombre;
    $("#modal-marca").textContent = p.marca;
    $("#modal-nombre").textContent = p.nombre + (p.talle ? ` · ${p.talle}` : "");
    $("#modal-precio").textContent = dinero(p.precio);
    $("#modal-desc").textContent = p.descripcion;
    $("#modal-meta").textContent =
      `Condición: ${p.condicion}` + (p.talle ? ` · Talle: ${p.talle}` : "");
    $("#modal-add").dataset.id = p.id;
    $("#modal").classList.add("abierto");
    $("#overlay").classList.add("visible");
  }

  function cerrarModal() {
    $("#modal").classList.remove("abierto");
    if (!$("#drawer").classList.contains("abierto")) $("#overlay").classList.remove("visible");
  }

  // ---------- Carrito ----------
  function agregarAlCarrito(id) {
    carrito[id] = (carrito[id] || 0) + 1;
    guardarCarrito();
    renderCarrito();
    toast("Agregado al carrito 🤙");
  }

  function cambiarCantidad(id, delta) {
    carrito[id] = (carrito[id] || 0) + delta;
    if (carrito[id] <= 0) delete carrito[id];
    guardarCarrito();
    renderCarrito();
  }

  function renderCarrito() {
    const ids = Object.keys(carrito);
    const items = ids
      .map((id) => ({ p: PRODUCTOS.find((x) => x.id === id), qty: carrito[id] }))
      .filter((x) => x.p);

    const totalQty = items.reduce((a, x) => a + x.qty, 0);
    const totalMonto = items.reduce((a, x) => a + x.qty * x.p.precio, 0);

    $("#cart-count").textContent = totalQty;
    $("#cart-count").style.display = totalQty ? "flex" : "none";

    const cont = $("#drawer-items");
    if (!items.length) {
      cont.innerHTML = `<div class="drawer-vacio">Tu carrito está vacío 🏖️<br>Sumá algo de la tienda.</div>`;
    } else {
      cont.innerHTML = items.map(({ p, qty }) => `
        <div class="cart-item">
          <img src="${imagenDe(p)}" alt="">
          <div class="info">
            <strong>${escaparHTML(p.nombre)}${p.talle ? " · " + escaparHTML(p.talle) : ""}</strong>
            ${dinero(p.precio)} c/u
            <div class="cart-qty">
              <button data-accion="menos" data-id="${p.id}">−</button>
              <span>${qty}</span>
              <button data-accion="mas" data-id="${p.id}">+</button>
            </div>
          </div>
          <button class="cart-quitar" data-accion="quitar" data-id="${p.id}" title="Quitar">✕</button>
        </div>`).join("");
    }

    $("#drawer-total").textContent = dinero(totalMonto);
    $("#btn-checkout").disabled = !items.length;
  }

  function abrirCarrito() {
    renderCarrito();
    $("#drawer").classList.add("abierto");
    $("#overlay").classList.add("visible");
  }
  function cerrarCarrito() {
    $("#drawer").classList.remove("abierto");
    if (!$("#modal").classList.contains("abierto")) $("#overlay").classList.remove("visible");
  }

  function checkoutWhatsApp() {
    const items = Object.keys(carrito)
      .map((id) => ({ p: PRODUCTOS.find((x) => x.id === id), qty: carrito[id] }))
      .filter((x) => x.p);
    if (!items.length) return;

    let msg = `Hola ${TIENDA.nombre}! Quiero hacer este pedido desde la web:\n\n`;
    let total = 0;
    items.forEach(({ p, qty }) => {
      total += qty * p.precio;
      msg += `• ${qty}x ${p.nombre}${p.talle ? " (" + p.talle + ")" : ""} — ${dinero(qty * p.precio)}\n`;
    });
    msg += `\nTotal: ${dinero(total)}`;

    window.open("https://wa.me/" + TIENDA.whatsapp + "?text=" + encodeURIComponent(msg), "_blank");
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(texto) {
    const t = $("#toast");
    t.textContent = texto;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("visible"), 2200);
  }

  // ---------- Eventos ----------
  function bindEventos() {
    // Dropdowns del menú
    $$(".nav-btn[data-dd]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dd = $("#" + btn.dataset.dd);
        const abierto = dd.classList.contains("abierto");
        cerrarDropdowns();
        if (!abierto) dd.classList.add("abierto");
      });
    });
    document.addEventListener("click", cerrarDropdowns);

    // Click en cards (delegado): ver detalle o agregar
    ["#grid-novedades", "#grid-tienda"].forEach((sel) => {
      $(sel).addEventListener("click", (e) => {
        const card = e.target.closest(".card");
        if (!card) return;
        const p = PRODUCTOS.find((x) => x.id === card.dataset.id);
        if (!p) return;
        const accion = e.target.closest("[data-accion]")?.dataset.accion;
        if (accion === "agregar") agregarAlCarrito(p.id);
        else if (accion === "ver") abrirModal(p);
      });
    });

    // Tiles de categorías
    $("#grid-cats").addEventListener("click", (e) => {
      const tile = e.target.closest("[data-cat]");
      if (!tile) return;
      filtroCategoria = filtroCategoria === tile.dataset.cat ? null : tile.dataset.cat;
      filtroMarca = null;
      renderTienda();
    });

    // Chips de marcas
    $("#marcas-strip").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-marca]");
      if (!chip) return;
      filtroMarca = filtroMarca === chip.dataset.marca ? null : chip.dataset.marca;
      filtroCategoria = null;
      renderTienda();
    });

    // Buscador
    $("#buscador-input").addEventListener("input", (e) => {
      busqueda = e.target.value.trim();
      renderTienda();
      if (busqueda) document.getElementById("tienda").scrollIntoView({ behavior: "smooth" });
    });

    // Carrito
    $("#btn-cart").addEventListener("click", abrirCarrito);
    $("#drawer-cerrar").addEventListener("click", cerrarCarrito);
    $("#btn-checkout").addEventListener("click", checkoutWhatsApp);
    $("#drawer-items").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-accion]");
      if (!btn) return;
      const { accion, id } = btn.dataset;
      if (accion === "mas") cambiarCantidad(id, 1);
      if (accion === "menos") cambiarCantidad(id, -1);
      if (accion === "quitar") { delete carrito[id]; guardarCarrito(); renderCarrito(); }
    });

    // Modal
    $("#modal-cerrar").addEventListener("click", cerrarModal);
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") cerrarModal(); });
    $("#modal-add").addEventListener("click", (e) => {
      agregarAlCarrito(e.target.dataset.id);
      cerrarModal();
      abrirCarrito();
    });

    // Overlay cierra todo
    $("#overlay").addEventListener("click", () => { cerrarCarrito(); cerrarModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { cerrarCarrito(); cerrarModal(); }
    });
  }

  // ---------- Init ----------
  aplicarConfig();
  renderMenus();
  renderNovedades();
  renderTienda();
  renderCarrito();
  bindEventos();
})();
