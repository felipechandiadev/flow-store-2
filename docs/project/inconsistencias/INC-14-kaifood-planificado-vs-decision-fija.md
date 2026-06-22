# INC-14 · KaiFood planificado vs decisión arquitectónica fija

| Campo | Valor |
|-------|-------|
| **Severidad** | Menor |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |

---

## Resumen

AR mezcla KaiFood como modalidad futura (§1) con decisión fija en §12 (`kaistore` | `kaifood`). El código aún no implementa el switch en PWAs.

---

## Documentación

| Sección | Contenido |
|---------|-----------|
| AR §1 | KaiFood “Planificado vía `NEXT_PUBLIC_KAI_PRODUCT_MODE=kaifood`” |
| AR §12 | “Un deploy = una modalidad” — decisión fija |
| Legacy roadmap | Detalle K0–KaiFood en `KAISTORE_ROADMAP.md` |

---

## Código (junio 2026)

- Sin referencias a `NEXT_PUBLIC_KAI_PRODUCT_MODE` en `pwa-admin`
- Backend: variable `KAI_PRODUCT_MODE` opcional, uso limitado
- Producto retail (KaiStore) es el camino activo

---

## Resolución

| Sección | Ajuste |
|---------|--------|
| §1 | Mantener “planificado / no implementado” |
| §12 | Etiquetar KaiFood como **objetivo de producto**, no capacidad actual |
| Roadmap | Fuente de verdad para timeline KaiFood |

[← Índice](./README.md)
