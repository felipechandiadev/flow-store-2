# INC-02 · Nómina: entidad `Remuneration` vs transacción `PAYROLL`

| Campo | Valor |
|-------|-------|
| **Severidad** | Crítica |
| **Estado** | Doc OK / código legacy |
| **Detectado** | junio 2026 |

---

## Resumen

La documentación de módulos presenta `Remuneration` como entidad principal del módulo `remunerations`. En runtime, **`RemunerationsService` solo usa transacciones** `PAYROLL` y `PAYROLL_PAYMENT`. La tabla `remunerations` y su repositorio existen pero no participan del flujo productivo.

---

## Qué dice la documentación

- [MODULOS_Y_SERVICIOS_BACKEND.md §10](../MODULOS_Y_SERVICIOS_BACKEND.md): entidad `Remuneration`, servicio `RemunerationsService`
- [ARQUITECTURA_Y_ECOSISTEMA.md §6.4](../ARQUITECTURA_Y_ECOSISTEMA.md): flujo vía `RemunerationsService.createRemuneration()` → `PAYROLL`

La AR es correcta en el flujo transaccional; MODULOS sobreestima la entidad `Remuneration`.

---

## Qué hace el código

### Flujo productivo

1. `RemunerationsService.createRemuneration()` construye `CreateTransactionDto` con `transactionType = PAYROLL`
2. Crea hijos `PAYROLL_PAYMENT` según plan de liquidación
3. Listado/ detalle: consulta `Transaction` where `transactionType = PAYROLL`
4. `deleteRemuneration`: cancela transacción `PAYROLL`, no fila en `remunerations`

Archivo: `backend/src/modules/remunerations/application/remunerations.service.ts`

### Código legacy / no usado

- Entidad: `backend/src/modules/remunerations/domain/remuneration.entity.ts`
- Repositorio: `TypeOrmRemunerationRepository` registrado en módulo pero **no inyectado** en `RemunerationsService`
- Tests unitarios del repositorio existen; no reflejan el path productivo

---

## Impacto

- Modelo mental erróneo al extender RRHH
- Deuda: tabla `remunerations` posiblemente vacía o desincronizada respecto a `transactions`
- Doc MODULOS indica entidad incorrecta como fuente de verdad

---

## Resolución propuesta

| Ámbito | Acción |
|--------|--------|
| **Documentación** | Fuente de verdad = `Transaction` (`PAYROLL` / `PAYROLL_PAYMENT`); marcar entidad `Remuneration` como legacy |
| **Código (opcional)** | Eliminar entidad/repositorio no usados **o** reactivarlos como índice denormalizado (decisión producto) |

---

## Archivos clave

- `backend/src/modules/remunerations/application/remunerations.service.ts`
- `backend/src/modules/remunerations/domain/remuneration.entity.ts`
- `backend/src/modules/remunerations/infrastructure/repositories/typeorm-remuneration.repository.ts`

[← Índice](./README.md) · [Deuda código](./DEUDA_CODIGO.md)
