# ☁️ Configurar la nube (control de stock con Supabase)

Esto hace que tu stock viva en la nube: lo cargás desde el teléfono y lo
**ves y controlás desde cualquier dispositivo o la computadora**. Es gratis.

Lleva ~5 minutos, una sola vez.

## 1. Crear el proyecto

1. Entrá a **https://supabase.com** y creá una cuenta (gratis).
2. **New project** → ponele un nombre (ej. `retrosnap`), una contraseña de base
   de datos y la región más cercana. Esperá ~1 minuto a que se cree.

## 2. Crear la tabla del stock

1. En el menú izquierdo: **SQL Editor** → **New query**.
2. Pegá esto y tocá **Run**:

```sql
-- Tabla del stock
create table if not exists prendas (
  codigo      text primary key,
  estado      text,
  nombre      text,
  marca       text,
  categoria   text,
  talle       text,
  condicion   text,
  precio      numeric,
  descripcion text,
  plantilla   text,
  foto_url    text,
  creada      timestamptz default now()
);

-- Permitir que la app (clave pública) lea y escriba.
-- Es una herramienta interna de un solo usuario; se puede endurecer luego.
alter table prendas enable row level security;
create policy "acceso_app" on prendas
  for all using (true) with check (true);
```

## 3. Crear el lugar para las fotos (Storage)

1. Menú izquierdo: **Storage** → **New bucket**.
2. Nombre: **`prendas`** (exactamente así). Marcá **Public bucket** ✅ → **Create**.
3. Para permitir subir/borrar fotos con la clave pública, andá de nuevo a
   **SQL Editor** y corré esto:

```sql
create policy "fotos_lectura" on storage.objects
  for select using ( bucket_id = 'prendas' );
create policy "fotos_escritura" on storage.objects
  for insert with check ( bucket_id = 'prendas' );
create policy "fotos_borrado" on storage.objects
  for delete using ( bucket_id = 'prendas' );
```

## 4. Copiar tus 2 datos

En **Project Settings** (la rueda ⚙️) → **API**:

- **Project URL** → algo como `https://abcd1234.supabase.co`
- **anon public** (en "Project API keys") → un texto largo que empieza con `eyJ...`

## 5. Pegarlos en la app

En RetroSnap Studio → pestaña **⚙️ Ajustes** → bloque **☁️ Nube**:

1. Pegá la **URL** y la **clave anon**.
2. Tocá **🔌 Probar conexión** → tiene que decir “Conexión OK ✅”.
3. Tocá **🔄 Sincronizar ahora**.

Listo: desde ese momento cada prenda que cargás se sube sola a la nube, y si
abrís la app en otro teléfono o en la compu (con los mismos 2 datos) ves el
mismo stock.

> **Importante:** la clave que pegás se guarda **en el teléfono**, no en el
> repositorio. Si más adelante querés que solo vos puedas escribir, le agregamos
> una clave de acceso simple o login. Avisame.

## ¿Sin señal?

Si cargás una prenda sin internet, queda con un ⏳ ("pendiente"). Cuando vuelva
la señal, tocá **Sincronizar ahora** (o se sincroniza al abrir el stock) y sube
sola.
