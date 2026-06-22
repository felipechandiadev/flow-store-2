# Deuda de código (derivada de la auditoría)

Ítems detectados al contrastar documentación con código. **No** son errores de doc; son candidatos a refactor.

| Item | Descripción | INC relacionado |
|------|-------------|-----------------|
| `remunerations` | Entidad/repositorio `Remuneration` sin uso en service productivo | [INC-02](./INC-02-nomina-remuneration-vs-payroll-transaction.md) |
| `permissions`, `budgets`, `accounting-period-snapshots`, `transaction-lines` | Controller existe; módulo no importado en `AppModule` | [INC-03](./INC-03-permissions-modulo-huerfano.md), [INC-06](./INC-06-accounting-period-snapshots-huerfano.md) |
| `GlobalProvidersModule` | Definido en `shared/providers/`; no registrado en `AppModule` | [INC-05](./INC-05-global-providers-no-registrado.md) |
| Contabilidad | Duplicidad `LedgerEntriesService` vs `AccountingEngine.buildLedger` | [INC-04](./INC-04-pipeline-contable-duplicado.md) |
| `AppModule` | `CacheModule` importado dos veces (líneas 83 y 152) | — |

[Volver al índice](./README.md)
