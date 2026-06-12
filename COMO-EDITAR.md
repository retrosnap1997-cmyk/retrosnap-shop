# 🏄 RetroSnap Shop — Guía rápida para editar el sitio

El sitio es 100% archivos planos: no hay que instalar nada ni "compilar".
Editás un archivo, guardás, recargás el navegador y listo.

## Abrir el sitio

Doble click en `index.html` y se abre en el navegador.

## ¿Qué archivo toco para cada cosa?

| Quiero cambiar... | Archivo |
|---|---|
| Número de WhatsApp, textos del hero, moneda, redes, dirección | `config.js` |
| Productos (agregar, borrar, precios, fotos) | `products.js` |
| Colores y tipografías | `styles.css` (bloque `:root` de arriba) |
| Texto "Nosotros", barra de anuncio, secciones | `index.html` |

## Lo PRIMERO que tenés que hacer

1. En `config.js` poné tu número real de WhatsApp en `whatsapp: "50600000000"`
   (código de país + número, sin `+` ni espacios). Ahí llegan los pedidos del carrito.
2. Poné el link real de tu Instagram en `instagram`.

## Agregar un producto

En `products.js`, copiá un bloque `{ ... },` completo, pegalo abajo y cambiá los datos:

```js
{
  id: "tee-099",              // único, no repetir
  nombre: "Remera nueva",
  marca: "Billabong",         // tiene que existir en MARCAS (config.js)
  categoria: "tees",          // tees, hoodies, shorts, jackets, hats, acc, tablas, racks
  talle: "M",
  condicion: "Muy buen estado",
  precio: 25,                 // solo el número
  descripcion: "Texto que se ve al hacer click en el producto.",
  img: "img/mi-foto.jpg",     // o null para placeholder automático
  destacado: true,            // true = aparece en "Lo nuevo"
},
```

## Ponerle fotos reales a los productos

1. Creá una carpeta `img` al lado de `index.html`.
2. Guardá ahí tus fotos (ideal: cuadradas, ej. 800x800).
3. En el producto poné `img: "img/nombre-de-la-foto.jpg"`.

## Cambiar los colores

En `styles.css`, arriba de todo está el bloque `:root` con la paleta:

- `--arena` → fondo general
- `--tinta` → texto y bordes
- `--coral` → botones y acentos
- `--oceano` → banner de sostenibilidad
- `--sol` → banner de la moto

Cambiá un valor (ej. `--coral: #ff0066;`) y cambia en todo el sitio.

## ¿Cómo funciona el carrito?

El cliente agrega productos, abre el carrito (🛒) y al tocar
**"Pedir por WhatsApp"** se abre un chat a tu número con el pedido armado
(productos, cantidades y total). Ahí lo puede seguir tu bot o vos a mano.
No se cobra nada en el sitio (por ahora).

## Subirlo a internet gratis (cuando quieras)

Igual que la app del market: se sube a GitHub y se activa GitHub Pages.
Pedímelo y lo hago.
