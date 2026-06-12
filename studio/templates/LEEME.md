# 🎨 Plantillas / modelos

Poné acá las imágenes de tus **modelos / escenas de fondo** (lo que ibas a subir).

## Cómo agregar una plantilla

1. Copiá la imagen en esta carpeta. Recomendado:
   - **cuadrada** (ej. 1600×1600 px),
   - en `.jpg` o `.png`,
   - nombre simple y sin espacios (ej. `verano.jpg`).
2. Registrala en `studio/js/templates.js` agregando un bloque:

   ```js
   {
     id: "verano",
     nombre: "Modelo verano",
     img: "templates/verano.jpg",
     caja: { x: 0.18, y: 0.10, w: 0.64, h: 0.78 }, // opcional: dónde va la prenda
   },
   ```

3. Listo: en la pantalla de **Recorte** aparece un chip “🎨 Modelo verano” y la
   app monta la prenda recortada sobre tu escena, en el teléfono, sin internet.

> ¿No querés tocar el archivo? Subime las imágenes y yo las registro.

## La “caja”

Son 4 números de 0 a 1 que dicen **dónde y de qué tamaño** va la prenda dentro
del cuadro: `x` e `y` = esquina sup. izq.; `w` y `h` = ancho y alto.
Si no la ponés, la prenda ocupa todo el cuadro centrada.
