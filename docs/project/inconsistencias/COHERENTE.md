# Verificado coherente (doc ↔ código)

Aspectos alineados entre documentación project y código. No requieren acción salvo mantenimiento rutinario.

- Puertos dev: backend **3030**, admin **3031**, POS **3032**, stock **3033**, eShop **3034**
- Venta POS atómica: `POST /api/cash-sessions/sales`
- Separación nómina ↔ gastos operativos (sin auto-creación cruzada)
- Lanes AP: `SUPPLIER_PAYMENT`, `PAYROLL_PAYMENT`, `EXPENSE_PAYMENT`
- Wrappers DTE (`supplier-invoices`, etc.) delegando en `transactions`
- **Recepciones:** módulo `receptions` orquesta `PURCHASE` + `SUPPLIER_*` + `SUPPLIER_PAYMENT` (ver [INC-01](./INC-01-reception-no-es-transaction-type.md))
- eShop: un deploy = un slug (`NEXT_PUBLIC_ESHOP_STORE_SLUG`)
- Prefijo REST global `/api` (ver [INC-15](./INC-15-prefijo-api.md))

[Volver al índice](./README.md)
