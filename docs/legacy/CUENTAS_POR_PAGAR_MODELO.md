# Cuentas por pagar — modelo basado en transacciones de pago

## Principio

Cada obligación pendiente es una transacción de pago en estado **borrador**:

| Tipo | Origen (padre) | Uso |
|------|----------------|-----|
| `SUPPLIER_PAYMENT` | `SUPPLIER_INVOICE` / `SUPPLIER_RECEIPT` | Compras / recepción con DTE |
| `PAYROLL_PAYMENT` | `PAYROLL` | Liquidación de sueldos |
| `EXPENSE_PAYMENT` | `OPERATING_EXPENSE` | Gastos operativos con plan de pago |

## Estados del pago (hijo)

| Negocio | `status` | `paymentStatus` |
|---------|----------|-----------------|
| Pendiente (lista en AP) | `DRAFT` | `PENDING` |
| Pagado | `CONFIRMED` | `PAID` |

Al confirmar el pago se actualiza el mismo hijo y se crea `PAYMENT_EXECUTION` (tesorería/contabilidad).

## Estado del documento padre

`amountPaid` = suma de hijos confirmados. `paymentStatus` del padre:

- `PENDING` — ningún hijo pagado
- `PARTIAL` — algunos hijos pagados
- `PAID` — todos los hijos cubren el total

## Plan en cuotas

**N líneas del plan → N transacciones `*_PAYMENT` DRAFT** (una fila en Cuentas por pagar por cuota).

## API

- `GET /api/accounts-payable` — lista pagos pendientes
- `GET /api/accounts-payable/:id/payment-context` — contexto para modal de pago
- `POST /api/accounts-payable/:id/complete` — confirmar pago

Legacy: `GET /api/installments/accounts-payable` delega al mismo servicio.

## Admin

- Pantalla: `/accounting/accounts-payable`
- Recepciones (admin/POS): sin cambio de payload (`supplierDocumentPayment`)
- Remuneraciones: `plannedPayments` al crear liquidación
- Gastos operativos: `linkedTributaryDocument.plannedPayments` materializa hijos al crear

## Fuera de alcance v1

- Cuentas por cobrar (`SALE` / `installments` para cobranza)
- AP en POS
