# INC-03 · Módulo `permissions` huérfano vs documentación activa

| Campo | Valor |
|-------|-------|
| **Severidad** | Crítica |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |
| **Relacionado** | [INC-11](./INC-11-criterio-modulo-activo-vs-huerfano.md) |

---

## Resumen

[ARQUITECTURA_Y_ECOSISTEMA.md §3.2](../ARQUITECTURA_Y_ECOSISTEMA.md) lista `permissions` bajo Plataforma como módulo representativo. [MODULOS §4.5](../MODULOS_Y_SERVICIOS_BACKEND.md) lo marca huérfano. El código confirma: **no está importado en `AppModule`**.

---

## Evidencia

| Artefacto | Existe | Activo en runtime |
|-----------|--------|-------------------|
| `permissions.controller.ts` | Sí (`@Controller('permissions')`) | No |
| `permissions.module.ts` | Sí | No importado en `app.module.ts` |
| Entidad `Permission` | Sí (`permissions` table) | ORM sí; API REST no |

Tests e2e pueden referenciar el módulo; producción no expone `/api/permissions`.

---

## Impacto

- Documentación AR sugiere RBAC vía API de permisos operativa
- Integraciones frontend que asuman endpoint fallarán con 404
- Inconsistencia interna entre docs project

---

## Resolución propuesta

| Opción | Acción |
|--------|--------|
| **A — Documentar** | AR y MODULOS: badge **huérfano** hasta activar |
| **B — Activar** | Importar `PermissionsModule` en `app.module.ts` y validar migraciones |

Recomendación doc inmediata: **opción A** (reflejar realidad).

---

## Archivos clave

- `backend/src/app.module.ts`
- `backend/src/modules/permissions/permissions.module.ts`
- `backend/src/modules/permissions/presentation/controllers/permissions.controller.ts`

[← Índice](./README.md)
