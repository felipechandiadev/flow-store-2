# Seed Joyarte

Demo de joyería **Joyarte** para desarrollo local. Catálogo MVP inspirado en [Joyas Barón](https://tiendaonline.joyasbaron.cl/).

## Comandos

```bash
cd backend

# Regenerar catálogo + imágenes desde Baron (requiere red y Playwright)
npm run seed:import-joyarte

# Cargar demo Joyarte en la base de datos
npm run seed:joyarte

# Volver al demo genérico Mi Empresa
npm run seed:demo
```

## Contenido

- Empresa **Joyarte SpA**, slug eShop `joyarte`
- Tema eShop `jewelry`
- Topbar/footer configurados para joyería
- ~20 productos MVP en `data/catalog.json` (ampliable con import)
- Hero slides, testimonios y atributos (Talla, Material, Tono, Piedra)

## Variables opcionales (import)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `JOYARTE_IMPORT_LIMIT_PER_CATEGORY` | 8 | Productos por colección |
| `JOYARTE_IMPORT_DELAY_MS` | 400 | Pausa entre fichas |

## Nota legal

Datos e imágenes de referencia provienen de la tienda pública Joyas Barón para demo interna. Las imágenes se almacenan localmente en `assets/`; no usar hotlink en producción.
