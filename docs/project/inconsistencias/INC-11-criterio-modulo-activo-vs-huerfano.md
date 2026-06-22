# INC-11 · Criterio módulo activo vs huérfano entre docs project

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |
| **Agrupa** | INC-03, INC-06, INC-10 |

---

## Resumen

Los documentos project no aplican un criterio único para decir si un módulo está “activo”. AR implica operatividad; MODULOS distingue registrado / dinámico / transitivo / huérfano.

---

## Casos conflictivos

| Módulo | AR | MODULOS | AppModule |
|--------|-----|---------|-----------|
| `permissions` | Listado plataforma | Huérfano | No |
| `accounting-period-snapshots` | Snapshots §7 | Huérfano | No |
| `analytics` | No listado | Registrado (require) | Sí |
| `ledger-entries` | Listado contabilidad | Transitivo vía `transactions` | Sí (indirecto) |

---

## Criterio propuesto (unificar docs)

| Etiqueta | Definición |
|---------|------------|
| **Activo** | `*Module` importado en `AppModule` (directo o `require`) |
| **Transitivo** | Cargado vía otro módulo activo; API puede estar expuesta |
| **Huérfano** | Código + controller existen; **no** en grafo de arranque |
| **Solo entidad** | Entidad usada por otros módulos; sin REST propio activo |

AR debe usar solo **Activo** y **Transitivo** en mapas de producto; huérfanos solo en MODULOS + carpeta inconsistencias.

---

## Resolución

Actualizar AR §3.2 y leyenda MODULOS §1.3 con el criterio anterior; corregir listados ([INC-03](./INC-03-permissions-modulo-huerfano.md), [INC-06](./INC-06-accounting-period-snapshots-huerfano.md)).

[← Índice](./README.md)
