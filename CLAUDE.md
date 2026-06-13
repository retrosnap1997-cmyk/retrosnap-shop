# RetroSnap — Memoria del proyecto (CLAUDE.md)

## ⚠️ Reglas de trabajo (aprendidas)
- **Analizar bien el contexto ANTES de entregar algo.** No asumir. En particular,
  **verificar visualmente las imágenes/logos** (abrirlas con Read) antes de usarlas
  en el sitio. Error pasado: usé `logo 2.png` del Drive sin mirarlo y era un logo
  viejo de ThriftyMarket, no el de RetroSnap.
- El **logo correcto de RetroSnap** es el óvalo rojo con borde negro, texto blanco
  estilo punk "RetroSnap" y "SURF GOODIES" debajo.
- **Paleta de marca: blanco + negro + rojo** (los colores del logo). El panel debe
  usar exactamente esos códigos de color, tomados del logo.

## Estructura del repo
- `/` (raíz) = **Panel** de entrada (hub) → `index.html` + `panel.css` + `assets/`
- `/studio/` = **RetroSnap Studio** (PWA de captura, recorte, stock, códigos)
- `/tienda/` = la tienda online (vitrina estática con carrito por WhatsApp)

## Publicación
- GitHub Pages publica **desde la rama `main`** (workflow `.github/workflows/deploy-pages.yml`).
- Flujo: desarrollar en la rama de trabajo → merge a `main` para publicar.
- URL: https://retrosnap1997-cmyk.github.io/retrosnap-shop/

## Pendiente
- Fase 2: plantillas/modelos en Canva. Fase 3: Shopify. Fase 4: Instagram.
