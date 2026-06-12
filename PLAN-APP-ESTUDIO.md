# 📸 RetroSnap Studio — Plan técnico de la app de captura y publicación

> Documento de arquitectura para revisar **antes** de construir.
> No es código todavía: es el mapa de lo que vamos a hacer y cómo.
> Última actualización: 2026-06-12

---

## 1. Qué estamos construyendo

Hoy ya existe **RetroSnap Shop** (la vitrina pública, estática, con carrito por
WhatsApp). Eso es lo que ve el cliente.

Ahora vamos por la otra mitad: **RetroSnap Studio**, tu "trastienda".
Es la herramienta con la que vos, desde el teléfono, convertís una prenda
recién comprada en un producto publicado y a la venta, en minutos.

**No reemplaza la tienda. La alimenta.**

```
   ┌─────────────────────┐         ┌──────────────────────┐
   │  RetroSnap STUDIO    │  crea   │   Canales de venta    │
   │  (app de captura)    │ ──────▶ │  Shopify · Instagram  │
   │  — uso interno tuyo  │  stock  │  · vitrina RetroSnap  │
   └─────────────────────┘         └──────────────────────┘
```

---

## 2. Tu flujo de trabajo (el que describiste)

```
 1. COMPRAR ropa
 2. SACARLE FOTOS   ──┐
 3. CREAR PLANTILLAS  ├─ esto lo hace RetroSnap Studio, casi sin que toques nada
 4. SUBIR AL ECOMMERCE│
 5. SUBIR A INSTAGRAM ┘
 6. VENDER
```

El objetivo de diseño es que los pasos **2 a 5 sean un solo barrido**:
sacás la foto y la app se encarga del recorte, el fondo con tu modelo,
el código de la prenda, la ficha y el envío a los canales.

---

## 3. Decisiones ya tomadas

| Tema | Decisión | Por qué |
|---|---|---|
| **Plataforma** | PWA web (se instala en el celu) | Cero fricción: sin tiendas de apps, usa la cámara, iPhone y Android, iteramos rápido, vive en este repo. |
| **Cambio de fondo** | **Canva** (plantillas/modelos tuyos) | Ya trabajás con Canva y tus modelos están ahí. En este workspace tengo la conexión a Canva activa, así que la app puede rellenar una plantilla y exportarla sola. |
| **Ecommerce** | Shopify, pero **más adelante** | Todavía no creaste la tienda. Dejo la integración lista pero apagada (modo "borrador") hasta que tengas las claves. |
| **Código de prenda** | Automático, secuencial + categoría | Para que cada prenda tenga su identificador único sin que lo pienses. |
| **Primer entregable** | Este plan | Lo revisamos y recién después construyo. |

---

## 4. Arquitectura general

La app tiene **tres capas**. Importante entender quién hace qué, porque define
qué necesita internet y qué necesita claves secretas.

```
┌──────────────────────────────────────────────────────────────┐
│ 1) PWA (corre en tu teléfono)                                 │
│    • Cámara + modos de captura (colgadas / lisas / piso)      │
│    • Ficha de producto (formulario)                           │
│    • Genera el código de prenda                               │
│    • Guarda el stock localmente (funciona sin internet)       │
│    • Cola de publicación ("pendiente de subir")               │
└───────────────┬──────────────────────────────────────────────┘
                │ (cuando hay internet)
                ▼
┌──────────────────────────────────────────────────────────────┐
│ 2) Servicio de publicación (un backend pequeño, con claves)   │
│    • Habla con Canva (plantilla → imagen final)               │
│    • Habla con Shopify (crea el producto)                     │
│    • Habla con Instagram (publica el post)                    │
│    • Guarda las claves secretas (NUNCA viven en el teléfono)  │
└───────────────┬──────────────────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────────────────┐
│ 3) Canales externos: Canva · Shopify · Instagram              │
└──────────────────────────────────────────────────────────────┘
```

### ¿Por qué hace falta un backend chico y no solo la PWA?

Porque **Shopify, Canva e Instagram exigen claves secretas** para publicar.
Si esas claves vivieran dentro de la PWA (que corre en el teléfono y es código
abierto al navegador), cualquiera podría robarlas y publicar/borrar en tus
cuentas. El backend es la "caja fuerte" que guarda las claves y es el único que
toca esas APIs. Es pequeño y barato (puede correr gratis en algo tipo
Vercel/Cloudflare/Render).

> En la **Fase 1** la PWA funciona 100% sola (captura, ficha, código, stock
> local, export). El backend recién aparece cuando enchufamos Canva/Shopify/IG.

---

## 5. La PWA por dentro (pantallas)

1. **Inicio / Stock** — lista de prendas con su estado:
   `📷 fotografiada` · `🎨 plantilla lista` · `🛍️ en Shopify` · `📲 en Instagram`.
2. **Capturar** — la cámara con guías. Elegís el modo:
   - *Colgada en par* (dos perchas/ganchos),
   - *Lisa* (acostada, vista cenital),
   - *En el piso*.
   La app sugiere encuadre y saca 1 o varias fotos.
3. **Editar / Fondo** — elegís la plantilla (modelo) y la app manda a Canva,
   trae la imagen final con fondo cambiado y la previsualizás.
4. **Ficha** — formulario con: nombre, marca, categoría, talle, condición,
   precio, descripción. **El código se genera solo.** Varios campos vienen
   pre-cargados según el tipo de prenda (las "plantillas de ficha" que pediste).
5. **Publicar** — botón único: "Subir a tienda + Instagram". Muestra el progreso.
6. **Ajustes** — marcas, categorías, plantillas de ficha, conexiones (Canva,
   Shopify, IG), prefijos de código.

Como es PWA: se instala con "Agregar a pantalla de inicio", abre a pantalla
completa y guarda todo aunque no haya señal (se sincroniza después).

---

## 6. Modelo de datos de una prenda

Cada prenda es un registro así (se guarda local y se sincroniza al publicar):

```js
{
  codigo:     "RS-TEE-0042",     // generado automáticamente (ver §7)
  estado:     "lista_publicar",  // capturada | fondo_listo | lista_publicar | publicada
  // --- ficha ---
  nombre:     "Remera surf trip fade",
  marca:      "Rip Curl",
  categoria:  "tees",
  talle:      "M",
  condicion:  "Como nuevo",
  precio:     25,
  descripcion:"...",
  // --- imágenes ---
  fotoOriginal:   "blob://...",      // lo que saca la cámara
  fotoRecortada:  "https://canva...",// prenda sin fondo (si aplica)
  fotoFinal:      "https://canva...",// imagen con tu modelo/fondo
  plantillaUsada: "modelo-verano-01",
  // --- publicación ---
  shopifyId:    null,   // se llena al subir
  instagramId:  null,
  creada:       "2026-06-12T10:00:00Z",
}
```

---

## 7. Código automático de prenda

Cada prenda recibe un código único **en el momento de crearla**, sin que lo pienses.

**Formato propuesto:** `RS-<CAT>-<NNNN>`

- `RS` = RetroSnap (prefijo configurable).
- `<CAT>` = abreviatura de categoría: `TEE`, `HOOD`, `SHORT`, `JACK`, `HAT`,
  `ACC`, `TABLA`, `RACK`.
- `<NNNN>` = correlativo que nunca se repite (0001, 0002, …).

Ejemplos: `RS-TEE-0042`, `RS-TABLA-0007`.

El código se usa como **SKU en Shopify**, aparece en el hashtag/caption de
Instagram (`#RSTEE0042`) y te sirve para encontrar la prenda física rápido
(podés escribirlo en la etiqueta). Opcional: generar un **QR** con el código
para pegar en la percha.

> Configurable: si preferís otro formato (por marca, por fecha, etc.) se cambia
> en Ajustes sin tocar código.

---

## 8. Cambio de fondo con Canva (el corazón visual)

Esta es la parte que hoy hacés a mano y que vamos a automatizar.

### Cómo funciona

Canva tiene **"Brand Templates" (plantillas de marca)** con *campos rellenables*
(un hueco para imagen, huecos para texto como precio o marca). La idea:

1. Vos creás **una vez** en Canva tus modelos/escenas favoritas y las marcás
   como plantilla con un hueco de imagen (ej. "modelo-verano", "fondo-arena",
   "flat-lay-madera").
2. La app sube la foto recortada de la prenda como *asset* a Canva.
3. La app **rellena la plantilla** con esa foto (y opcionalmente el precio,
   marca, código como texto).
4. Canva **exporta** la imagen final (PNG/JPG) y la app la trae de vuelta.

```
   foto prenda ──▶ [Canva: plantilla "modelo-verano" + autofill] ──▶ imagen final
```

Todo esto lo puedo orquestar desde este workspace porque **tengo la conexión a
Canva disponible** (subir asset, listar plantillas, rellenar, exportar). En
producción, ese mismo flujo lo hace el backend con tu cuenta de Canva.

### Lo que necesito de vos (cuando construyamos esto)

- Que subas tus **modelos/escenas** a Canva y me digas cuáles querés como
  plantillas (los que ibas a subir 👍).
- Idealmente, dejar en cada plantilla **un hueco de imagen** donde entra la
  prenda. Si tus modelos hoy son imágenes planas, te ayudo a convertirlas en
  plantillas rellenables.

### Plan B (por si una prenda no necesita modelo)

Para prendas que van mejor con fondo liso (flat-lay), dejamos también un
recorte simple con fondo blanco/color, sin pasar por modelo. Se elige por
categoría: ej. *tablas* → fondo liso; *remeras* → modelo.

---

## 9. Captura de fotos (los 3 modos que pediste)

La cámara de la PWA va a tener **modos con guía visual**:

| Modo | Para qué | Guía en pantalla |
|---|---|---|
| **Colgada en par** | Prendas en percha/gancho | Líneas verticales + caja central |
| **Lisa (flat-lay)** | Acostada, vista de arriba | Caja cuadrada centrada + nivel |
| **En el piso** | Prenda extendida en el suelo | Caja + aviso de sombra/luz |

Por cada modo guardamos qué "encuadre" usar para que el recorte salga parejo.
La app puede sacar **varias fotos** (frente, etiqueta, detalle) y vos elegís la
principal. El "punto de foto" (ángulo/encuadre por categoría) queda **definido y
guardado**, que es justo lo que pediste: que ya esté predefinido por tipo.

---

## 10. Plantillas de ficha (autocompletado por tipo)

Para no escribir lo mismo siempre, cada **categoría** tiene una *plantilla de
ficha* con valores por defecto:

```
tees  → condición sugerida "Muy buen estado", talles [S,M,L,XL],
        descripción base "Remera vintage rescatada...", rango precio 18–30
tablas→ pide largo y litraje, descripción base de tablas, etc.
```

Al elegir la categoría, la ficha viene medio llena y vos solo ajustás.

---

## 11. Publicación a Shopify (cuando tengas la tienda)

Shopify tiene una **Admin API** para crear productos por programa. El backend:

1. Crea el producto con: título (nombre), descripción, precio, SKU (= tu código),
   tipo/categoría, tags (marca), imagen final de Canva.
2. Lo deja como **borrador** o **activo** (vos elegís).
3. Guarda el `shopifyId` en la prenda para futuras ediciones.

**Qué vas a necesitar** (te guío paso a paso cuando llegue el momento):

- Una tienda Shopify (plan Basic alcanza).
- Una *custom app* en tu Shopify con permiso de "write_products" → te da un token.
- Ese token va al backend (la caja fuerte), nunca a la PWA.

> Mientras tanto, la app marca las prendas como "listas para subir" y, en cuanto
> conectes Shopify, las sube en lote con un botón.

---

## 12. Publicación a Instagram

Instagram permite publicar por API, **pero con condiciones** (importante saberlo
para no llevarse sorpresas):

- Necesita una cuenta de **Instagram Profesional/Business** vinculada a una
  **página de Facebook**.
- Se usa la *Instagram Graph API* (content publishing).
- Permite fotos y carruseles automáticos. Las **stories** y algunos formatos
  tienen límites; lo confirmamos al construir.

Por eso propongo **dos modos**:

1. **Automático** (cuando tengas la cuenta Business lista): el post sale solo
   con la imagen final + caption armado (nombre, precio, talle, código, hashtags).
2. **Asistido** (desde el día uno): la app arma la imagen + el caption y te deja
   un botón "Compartir" para publicar a mano en 2 toques. Cero fricción y sin
   depender de la aprobación de la API.

Arrancamos con **asistido** y, si querés el 100% automático, hacemos el trámite
de cuenta Business + app de Meta.

---

## 13. Dónde se guarda el stock

- **En el teléfono** (IndexedDB): siempre, funciona offline, es la fuente
  inmediata.
- **Respaldo/sincronización** (Fase 2): una base en la nube (ej. Supabase o un
  Google Sheet, lo más simple que sirva) para que no dependa de un solo celu y
  puedas verlo desde la compu.
- **Export** (desde Fase 1): botón para bajar todo el stock como CSV/JSON
  (sirve de respaldo y para importar a Shopify manualmente si hiciera falta).

---

## 14. Roadmap por fases

### ✅ Fase 0 — Plan (este documento)

### 🔨 Fase 1 — Studio offline (sin claves, ya útil)
- PWA instalable con cámara y los 3 modos de captura.
- Ficha de producto + plantillas de ficha por categoría.
- **Código automático** de prenda (+ QR opcional).
- Stock local (IndexedDB) con estados.
- Export CSV/JSON.
- Recorte simple de fondo (local) para previsualizar.
> Resultado: ya podés catalogar todo tu stock con el celu, aunque no esté lo demás.

### 🎨 Fase 2 — Canva (fondos con tus modelos)
- Conectar tu Canva.
- Convertir tus modelos en plantillas rellenables.
- Botón "Generar imagen con modelo" → imagen final automática.

### 🛍️ Fase 3 — Shopify
- Backend "caja fuerte" + conexión a tu tienda.
- Publicar producto (borrador/activo) con un botón, en lote.

### 📲 Fase 4 — Instagram
- Modo asistido (ya) → automático (con cuenta Business).
- Caption + hashtags automáticos desde la ficha.

### 🔄 Fase 5 — Pulido
- Sincronización en la nube, multi-dispositivo.
- Métricas (qué se vende), reimpresión de etiquetas, etc.

---

## 15. Qué necesito de vos (resumen)

| Cuándo | Qué |
|---|---|
| Para Fase 2 | Subir tus **modelos/escenas a Canva** y decirme cuáles usar |
| Para Fase 3 | Crear la **tienda Shopify** y generar el token (te guío) |
| Para Fase 4 (auto) | Pasar Instagram a **cuenta Business** + página de Facebook |
| Siempre | Decirme marcas, categorías y rangos de precio que uses |

---

## 16. Riesgos y cosas a tener en cuenta (honesto)

- **Recorte de bordes finos** (flecos, transparencias): el recorte automático no
  es perfecto. Por eso Canva (con tus modelos) ayuda a disimular y dejamos
  retoque manual opcional.
- **Instagram automático** depende de aprobación de Meta y de tener cuenta
  Business; por eso el modo asistido existe desde el día uno.
- **Costos**: Shopify tiene mensualidad; Canva según tu plan; el backend puede
  ser gratis al inicio. La PWA y el recorte local son gratis.
- **Una sola unidad por prenda**: como es ropa única (segunda vuelta), el stock
  es 1 por código. Lo tenemos en cuenta para que al venderse se marque agotado.

---

## 17. Próximo paso

Si este plan te cierra, **arranco con la Fase 1** (la app de captura + ficha +
código + stock, funcionando en tu celu). Cuando subas los modelos a Canva,
seguimos con la Fase 2.

Decime:
1. ¿El formato de código `RS-TEE-0042` te gusta o lo cambiamos?
2. ¿Querés QR en la etiqueta de cada prenda?
3. ¿Empiezo a construir la Fase 1?
