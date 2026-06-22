# INC-06 · `accounting-period-snapshots` — feature implícita, módulo huérfano

| Campo | Valor |
|-------|-------|
| **Severidad** | Crítica |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |
| **Relacionado** | [INC-11](./INC-11-criterio-modulo-activo-vs-huerfano.md) |

---

## Resumen

[ARQUITECTURA §7](../ARQUITECTURA_Y_ECOSISTEMA.md) menciona “snapshots” junto a períodos y balances. El módulo `accounting-period-snapshots` tiene controller y entidad pero **no está en `AppModule`**.

---

## Evidencia

| Componente | Ruta |
|------------|------|
| Controller | `@Controller('accounting-period-snapshots')` |
| Entidad | `AccountingPeriodSnapshot` |
| Módulo | `accounting-period-snapshots.module.ts` |
| AppModule | No importado |

MODULOS §9 y §15 documentan correctamente el estado huérfano; AR no.

---

## Impacto

- Expectativa de API `/api/accounting-period-snapshots` que no responde en dev/prod
- AR §7 sugiere capacidad disponible

---

## Resolución propuesta

| Ámbito | Acción |
|--------|--------|
| **AR §7** | “Snapshots: planificado / módulo no expuesto” o enlace a MODULOS huérfanos |
| **Código (opcional)** | Importar módulo en `AppModule` si producto requiere la feature |

---

## Archivos clave

- `backend/src/modules/accounting-period-snapshots/`
- `backend/src/modules/accounting-periods/` (módulo activo relacionado)

[← Índice](./README.md)
