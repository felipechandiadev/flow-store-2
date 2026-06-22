# Inconsistencias — documentación vs código

Índice de discrepancias entre `docs/project/`, el código (`backend/`, PWAs) y documentación legacy.

**Última revisión:** junio 2026

---

## Leyenda

| Severidad | Significado |
|-----------|-------------|
| **Crítica** | Puede inducir diseño o integración incorrectos |
| **Media** | Doc desactualizada o incompleta |
| **Menor** | Imprecisión de redacción u operativa |

| Estado | Significado |
|--------|-------------|
| **Abierta** | Pendiente en doc o código |
| **Abierta (solo doc)** | Código OK; falta corregir documentación |
| **Doc OK / código legacy** | Doc correcta; deuda en código |
| **Legacy obsoleto** | Afecta `docs/legacy/` |
| **Resuelta** | Criterio cerrado |

---

## Registro por ID

### Críticas

| ID | Título | Estado | Detalle |
|----|--------|--------|---------|
| [INC-01](./INC-01-reception-no-es-transaction-type.md) | `RECEPTION` no es `TransactionType` | Abierta (solo doc) | [→](./INC-01-reception-no-es-transaction-type.md) |
| [INC-02](./INC-02-nomina-remuneration-vs-payroll-transaction.md) | Nómina: `Remuneration` vs `PAYROLL` | Doc OK / código legacy | [→](./INC-02-nomina-remuneration-vs-payroll-transaction.md) |
| [INC-03](./INC-03-permissions-modulo-huerfano.md) | `permissions` huérfano vs AR activo | Abierta | [→](./INC-03-permissions-modulo-huerfano.md) |
| [INC-04](./INC-04-pipeline-contable-duplicado.md) | Pipeline contable — nombres mezclados | Abierta | [→](./INC-04-pipeline-contable-duplicado.md) |
| [INC-05](./INC-05-global-providers-no-registrado.md) | `GlobalProvidersModule` no registrado | Abierta | [→](./INC-05-global-providers-no-registrado.md) |
| [INC-06](./INC-06-accounting-period-snapshots-huerfano.md) | Snapshots contables huérfanos | Abierta | [→](./INC-06-accounting-period-snapshots-huerfano.md) |
| [INC-07](./INC-07-transaction-type-catalogo-incompleto.md) | Catálogo `TransactionType` incompleto | Abierta | [→](./INC-07-transaction-type-catalogo-incompleto.md) |

### Medias

| ID | Título | Estado | Detalle |
|----|--------|--------|---------|
| [INC-08](./INC-08-cuentas-por-cobrar-legacy-vs-codigo.md) | CxC legacy vs project/código | Legacy obsoleto | [→](./INC-08-cuentas-por-cobrar-legacy-vs-codigo.md) |
| [INC-09](./INC-09-gastos-operativos-modelo-pagos.md) | OE — modelo materialización pagos | Legacy obsoleto | [→](./INC-09-gastos-operativos-modelo-pagos.md) |
| [INC-10](./INC-10-mapa-funcional-ar-incompleto.md) | Mapa funcional AR §3.2 incompleto | Abierta | [→](./INC-10-mapa-funcional-ar-incompleto.md) |
| [INC-11](./INC-11-criterio-modulo-activo-vs-huerfano.md) | Criterio activo/huérfano entre docs | Abierta | [→](./INC-11-criterio-modulo-activo-vs-huerfano.md) |

### Menores

| ID | Título | Estado | Detalle |
|----|--------|--------|---------|
| [INC-12](./INC-12-server-actions-eshop-alcance.md) | Server Actions — alcance eShop | Abierta | [→](./INC-12-server-actions-eshop-alcance.md) |
| [INC-13](./INC-13-variables-entorno-eshop.md) | Variables env eShop | Abierta | [→](./INC-13-variables-entorno-eshop.md) |
| [INC-14](./INC-14-kaifood-planificado-vs-decision-fija.md) | KaiFood planificado vs decisión fija | Abierta | [→](./INC-14-kaifood-planificado-vs-decision-fija.md) |
| [INC-15](./INC-15-prefijo-api.md) | Prefijo API | Resuelta | [→](./INC-15-prefijo-api.md) |
| [INC-16](./INC-16-migracion-oe-pendiente.md) | Migración OE no aplicada en entornos | Abierta | [→](./INC-16-migracion-oe-pendiente.md) |
| [INC-17](./INC-17-referencia-sale-transaction-flow.md) | Referencia `SALE_TRANSACTION_FLOW` | Abierta | [→](./INC-17-referencia-sale-transaction-flow.md) |

---

## Backlog de corrección

| Prioridad | IDs | Acción |
|-----------|-----|--------|
| P1 | INC-01, INC-03, INC-04, INC-11 | INC-01: solo AR §3.1. Resto: unificar docs project |
| P2 | INC-02, INC-06, INC-07 | Nómina, snapshots, enum transacciones |
| P3 | INC-08, INC-09 | Actualizar `docs/legacy/CUENTAS_POR_PAGAR_MODELO.md` |
| P4 | INC-10, INC-12–17 | Mapa AR, eShop, enlaces, migraciones |

Ver también: [COHERENTE.md](./COHERENTE.md) · [DEUDA_CODIGO.md](./DEUDA_CODIGO.md)

---

*Al cerrar una inconsistencia: actualizar el doc INC-XX, el estado en esta tabla y el doc afectado en `docs/project/` o `docs/legacy/`.*
