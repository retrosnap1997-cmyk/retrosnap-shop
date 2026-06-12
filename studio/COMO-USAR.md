# 📸 RetroSnap Studio — Cómo usar (Fase 1)

App interna para **fotografiar, recortar y catalogar** tu stock desde el celular.
Es una PWA: se instala como app y funciona sin internet (salvo la primera vez
que usa el recorte con IA, que baja el modelo).

## Probarla

- **En la compu:** tenés que servirla con un servidor local (la cámara y los
  módulos no funcionan abriendo el archivo directo). Por ejemplo, dentro de la
  carpeta del proyecto:
  ```
  npx serve .
  ```
  y entrá a `http://localhost:3000/studio/`.
- **Cuando esté online (GitHub Pages):** entrás a `…/studio/` desde el teléfono.

## Instalarla en el teléfono

Abrí la página en el celu → menú del navegador → **"Agregar a pantalla de inicio"**.
Queda como una app a pantalla completa.

## El flujo

1. **Capturar** (tab 📷): elegí el modo (colgada / lisa / piso), encuadrá la
   prenda dentro de la guía y tocá el botón.
2. **Recorte:** la app quita el fondo automáticamente. Elegí el color de fondo
   (blanco, arena, océano o PNG transparente).
3. **Ficha:** elegí la categoría (se autocompletan condición, precio y
   descripción base) y poné el nombre. **El código se genera solo** al guardar.
4. **Stock** (tab 📦): ahí queda la prenda con su foto, código y precio.

## Para que el recorte salga limpio 🧼

- **Buena luz** pareja, sin sombras marcadas.
- **Fondo liso** y de color distinto a la prenda (una pared o una sábana
  funcionan genial).
- Prenda **centrada** y dentro de la guía.
- La primera vez que recortás con internet, se baja el modelo de IA (unos
  segundos). Después queda guardado y es más rápido.

## Códigos

Formato `RS-TEE-0042` (prefijo + categoría + número correlativo único).
El prefijo se cambia en **Ajustes**. Por ahora los escribís a mano en la
etiqueta de la prenda.

## Exportar

En **Stock** o **Ajustes** → "Exportar": baja el stock en CSV y JSON (respaldo
y, más adelante, para importar a Shopify).

## Qué falta (próximas fases)

- 🎨 **Canva**: cambiar el fondo por tus modelos reales (Fase 2).
- 🛍️ **Shopify**: publicar el producto automáticamente (Fase 3).
- 📲 **Instagram**: postear con caption + hashtags (Fase 4).
