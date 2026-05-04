import { TransactionType } from '@modules/transactions/domain/transaction.entity';

/**
 * PREFIJOS DE DOCUMENTOS EN ESPAÑOL
 * Utilizados para generar números de documento únicos por tipo de transacción
 */
export const DOCUMENT_PREFIXES: Record<TransactionType, string> = {
  [TransactionType.SALE]: 'VENTA-',
  [TransactionType.PURCHASE]: 'COMPRA-',
  [TransactionType.PURCHASE_ORDER]: 'ORDEN-COMPRA-',
  [TransactionType.SALE_RETURN]: 'DEVOLUCION-VENTA-',
  [TransactionType.PURCHASE_RETURN]: 'DEVOLUCION-COMPRA-',
  [TransactionType.SUPPLIER_INVOICE]: 'FACTURA-PROVEEDOR-',
  [TransactionType.SUPPLIER_CREDIT_NOTE]: 'NOTA-CREDITO-PROVEEDOR-',
  [TransactionType.CUSTOMER_ORDER]: 'PEDIDO-CLIENTE-',
  [TransactionType.SERVICE_ORDER]: 'OT-SERVICIO-',
  [TransactionType.PRODUCTION_BATCH]: 'LOTE-PRODUCCION-',
  [TransactionType.TRANSFER_OUT]: 'TRANSFERENCIA-SALIDA-',
  [TransactionType.TRANSFER_IN]: 'TRANSFERENCIA-ENTRADA-',
  [TransactionType.ADJUSTMENT_IN]: 'AJUSTE-ENTRADA-',
  [TransactionType.ADJUSTMENT_OUT]: 'AJUSTE-SALIDA-',
  [TransactionType.PAYMENT_IN]: 'PAGO-RECIBIDO-',
  [TransactionType.PAYMENT_OUT]: 'PAGO-EMITIDO-',
  [TransactionType.SUPPLIER_PAYMENT]: 'PAGO-PROVEEDOR-',
  [TransactionType.EXPENSE_PAYMENT]: 'PAGO-GASTO-',
  [TransactionType.PAYMENT_EXECUTION]: 'EJECUCION-PAGO-',
  [TransactionType.VOID_ADJUSTMENT]: 'ANULACION-AJUSTE-',
  [TransactionType.CASH_DEPOSIT]: 'DEPOSITO-EFECTIVO-',
  [TransactionType.OPERATING_EXPENSE]: 'GASTO-OPERATIVO-',
  [TransactionType.CASH_SESSION_OPENING]: 'APERTURA-CAJA-',
  [TransactionType.CASH_SESSION_CLOSING]: 'CIERRE-CAJA-',
  [TransactionType.CASH_SESSION_WITHDRAWAL]: 'RETIRO-CAJA-',
  [TransactionType.CASH_SESSION_DEPOSIT]: 'DEPOSITO-CAJA-',
  [TransactionType.PAYROLL]: 'NOMINA-',
  [TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER]: 'EGRESO-BANCARIO-SOCIO-',
  [TransactionType.INVENTORY_COUNT]: 'CONTEO-INVENTARIO-',
  [TransactionType.INVENTORY_RESERVATION]: 'RESERVA-INVENTARIO-',
  [TransactionType.INVENTORY_BLOCK]: 'BLOQUEO-INVENTARIO-',
  [TransactionType.INVENTORY_UNBLOCK]: 'DESBLOQUEO-INVENTARIO-',
};
