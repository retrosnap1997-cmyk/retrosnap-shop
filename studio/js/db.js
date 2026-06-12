// ============================================================
//  BASE DE DATOS LOCAL (IndexedDB)
//  Guarda el stock y la configuración en el teléfono.
//  Funciona sin internet y sobrevive a recargas.
// ============================================================

const DB_NOMBRE = "retrosnap-studio";
const DB_VERSION = 1;

let _db = null;

function abrir() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("prendas")) {
        const s = db.createObjectStore("prendas", { keyPath: "codigo" });
        s.createIndex("creada", "creada");
        s.createIndex("estado", "estado");
      }
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", { keyPath: "k" });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, modo) {
  return abrir().then((db) => db.transaction(store, modo).objectStore(store));
}

function comoPromesa(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Prendas ----------
export async function guardarPrenda(prenda) {
  const store = await tx("prendas", "readwrite");
  return comoPromesa(store.put(prenda));
}

export async function obtenerPrenda(codigo) {
  const store = await tx("prendas", "readonly");
  return comoPromesa(store.get(codigo));
}

export async function listarPrendas() {
  const store = await tx("prendas", "readonly");
  const todas = await comoPromesa(store.getAll());
  // Más nuevas primero
  return todas.sort((a, b) => (b.creada || "").localeCompare(a.creada || ""));
}

export async function borrarPrenda(codigo) {
  const store = await tx("prendas", "readwrite");
  return comoPromesa(store.delete(codigo));
}

// ---------- Configuración / contadores ----------
export async function getConfig(k, porDefecto = null) {
  const store = await tx("config", "readonly");
  const fila = await comoPromesa(store.get(k));
  return fila ? fila.v : porDefecto;
}

export async function setConfig(k, v) {
  const store = await tx("config", "readwrite");
  return comoPromesa(store.put({ k, v }));
}

// Contador correlativo por abreviatura de categoría (para los códigos).
// Devuelve el próximo número y lo incrementa de forma atómica.
export async function proximoCorrelativo(abrev) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const t = db.transaction("config", "readwrite");
    const store = t.objectStore("config");
    const clave = "seq_" + abrev;
    const getReq = store.get(clave);
    getReq.onsuccess = () => {
      const actual = getReq.result ? getReq.result.v : 0;
      const siguiente = actual + 1;
      store.put({ k: clave, v: siguiente });
      t.oncomplete = () => resolve(siguiente);
    };
    getReq.onerror = () => reject(getReq.error);
    t.onerror = () => reject(t.error);
  });
}
