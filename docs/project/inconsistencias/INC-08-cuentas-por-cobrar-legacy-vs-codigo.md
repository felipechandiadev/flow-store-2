# INC-08 · Cuentas por cobrar — legacy vs project vs código

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Estado** | Legacy obsoleto |
| **Detectado** | junio 2026 |

---

## Resumen

El documento legacy de cuentas por pagar declara cuentas por cobrar “fuera de alcance v1”. El código y la documentación project **sí** exponen CxC.

---

## Qué dice legacy (obsoleto)

[CUENTAS_POR_PAGAR_MODELO.md](../../legacy/CUENTAS_POR_PAGAR_MODELO.md) § “Fuera de alcance v1”:

> Cuentas por cobrar (`SALE` / `installments` para cobranza)

---

## Qué dice project + código (actual)

| Capa | Evidencia |
|------|-----------|
| Backend | `GET /api/accounts-receivable` — `AccountsReceivableController` en módulo `installments` |
| Admin UI | Menú `/accounting/accounts-receivable` en `mainMenu.ts` |
| Frontend | `pwa-admin/app/(app)/accounting/accounts-receivable/page.tsx` |
| AR project §7 | Lista CxC entre pantallas contables |

Servicio: `InstallmentService.getAccountsReceivable()`.

---

## Impacto

- Legacy contradice producto actual
- Riesgo de descartar feature ya implementada

---

## Resolución

| Ámbito | Acción |
|--------|--------|
| **Legacy** | Actualizar o archivar sección “fuera de alcance” para CxC |
| **Project** | Coherente; sin cambio |

---

## Archivos clave

- `backend/src/modules/installments/presentation/accounts-receivable.controller.ts`
- `docs/legacy/CUENTAS_POR_PAGAR_MODELO.md`
- `pwa-admin/src/navigation/mainMenu.ts`

[← Índice](./README.md)
