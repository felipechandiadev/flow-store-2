export type TransactionTypeOption = {
  id: string;
  label: string;
  category: string;
  description: string;
  deprecated?: boolean;
};

export const TRANSACTION_TYPE_OPTIONS: TransactionTypeOption[] = [
  // Ventas y devoluciones
  {
    id: "SALE",
    label: "Venta",
    category: "Ventas",
    description:
      "Registra una venta a cliente (contado o crédito). Puede incluir líneas de ítems, impuestos/descuentos y referencia documental.",
  },
  {
    id: "SALE_RETURN",
    label: "Devolución de venta",
    category: "Ventas",
    description:
      "Revierte o ajusta una venta previa (devolución). Normalmente referencia una SALE original y genera el efecto inverso en montos/stock según el flujo.",
  },

  // Compras y devoluciones
  {
    id: "PURCHASE",
    label: "Compra",
    category: "Compras",
    description:
      "Registra una compra a proveedor. Puede incluir líneas y condiciones (impuestos, descuentos) y suele originar cuentas por pagar y recepciones.",
  },
  {
    id: "PURCHASE_ORDER",
    label: "Orden de compra",
    category: "Compras",
    description:
      "Documento de compromiso con proveedor (pre-compra). Se usa para planificar y luego derivar a recepción/compra; no necesariamente impacta inventario.",
  },
  {
    id: "PURCHASE_RETURN",
    label: "Devolución a proveedor",
    category: "Compras",
    description:
      "Registra devolución/nota de crédito a proveedor asociada a una compra o recepción previa, ajustando montos y eventualmente stock.",
  },
  {
    id: "SUPPLIER_CREDIT_NOTE",
    label: "Nota de crédito proveedor",
    category: "Compras",
    description:
      "Documento fiscal del proveedor que reduce CxP; debe vincularse a una PURCHASE_RETURN existente (metadata.links.purchaseReturnId). No mueve stock por sí sola.",
  },
  {
    id: "SUPPLIER_INVOICE",
    label: "Factura de proveedor",
    category: "Compras",
    description:
      "Documento fiscal de compra (DTE factura). Registra obligación y líneas; suele enlazarse a recepción/compra según el flujo.",
  },
  {
    id: "SUPPLIER_RECEIPT",
    label: "Boleta de proveedor",
    category: "Compras",
    description: "Documento fiscal de compra tipo boleta (DTE). Similar a factura en impacto contable/operativo según configuración.",
  },
  {
    id: "SUPPLIER_HONORARIUM_RECEIPT",
    label: "Boleta de honorarios proveedor",
    category: "Compras",
    description:
      "Documento fiscal por honorarios de proveedor. Impacta retenciones/obligaciones según reglas del documento y del catálogo.",
  },
  {
    id: "SUPPLIER_GUIDE",
    label: "Guía de despacho proveedor",
    category: "Compras",
    description:
      "Guía de despacho recibida de proveedor. Puede asociarse a recepción física y a documentos tributarios posteriores.",
  },

  // Pedidos / ejecución (no mueven stock por sí solos)
  {
    id: "CUSTOMER_ORDER",
    label: "Pedido de cliente",
    category: "Pedidos",
    description:
      "Pedido/reserva comercial. Por sí solo no mueve inventario; prepara ejecución (venta, picking, etc.) según el flujo.",
  },
  {
    id: "SERVICE_ORDER",
    label: "Orden de servicio",
    category: "Pedidos",
    description: "Orden de trabajo/servicio. Trazabilidad operativa; el impacto contable/inventario depende del flujo de cumplimiento.",
  },
  {
    id: "PRODUCTION_BATCH",
    label: "Lote de producción",
    category: "Producción",
    description:
      "Lote u orden de producción. Agrupa consumos/salidas y productos terminados según el proceso productivo definido.",
  },

  // Movimientos de inventario
  {
    id: "TRANSFER_OUT",
    label: "Transferencia (salida)",
    category: "Inventario",
    description:
      "Salida de stock desde una bodega origen como parte de una transferencia. Usualmente tiene su contraparte TRANSFER_IN para la bodega destino.",
  },
  {
    id: "TRANSFER_IN",
    label: "Transferencia (entrada)",
    category: "Inventario",
    description:
      "Entrada de stock a una bodega destino como parte de una transferencia. Normalmente corresponde a un TRANSFER_OUT previo.",
  },
  {
    id: "ADJUSTMENT_IN",
    label: "Ajuste inventario (+)",
    category: "Inventario",
    description:
      "Ajuste positivo de stock (regularización, conteo, correcciones operativas). Debe usarse con trazabilidad y motivo.",
  },
  {
    id: "ADJUSTMENT_OUT",
    label: "Ajuste inventario (-)",
    category: "Inventario",
    description:
      "Ajuste negativo de stock (mermas, corrección por diferencias, regularización). Debe estar respaldado por control/causal.",
  },
  {
    id: "INVENTORY_COUNT",
    label: "Conteo de inventario",
    category: "Inventario",
    description:
      "Conteo físico para reconciliar existencias. Puede producir diferencias que se materializan como ajustes de inventario.",
  },
  {
    id: "INVENTORY_RESERVATION",
    label: "Reserva de inventario",
    category: "Inventario",
    description:
      "Reserva stock para evitar su uso en otras operaciones (p. ej. pedidos). No es salida definitiva; bloquea disponibilidad.",
  },
  {
    id: "INVENTORY_BLOCK",
    label: "Bloqueo de inventario",
    category: "Inventario",
    description:
      "Bloquea stock por motivos de calidad, calibración u otros controles. Se libera con INVENTORY_UNBLOCK.",
  },
  {
    id: "INVENTORY_UNBLOCK",
    label: "Desbloqueo de inventario",
    category: "Inventario",
    description:
      "Libera stock previamente bloqueado, devolviéndolo a disponibilidad operativa según el flujo de control.",
  },

  // Pagos y cobros
  {
    id: "PAYMENT_IN",
    label: "Cobro a cliente",
    category: "Pagos y cobros",
    description:
      "Registra un cobro (ingreso) asociado a una venta o cuenta por cobrar. Usualmente referencia la transacción origen vía relatedTransactionId.",
  },
  {
    id: "PAYMENT_OUT",
    label: "Pago (deprecated)",
    category: "Pagos y cobros",
    description:
      "Tipo de pago genérico en desuso. Se recomienda usar SUPPLIER_PAYMENT o EXPENSE_PAYMENT según el caso.",
    deprecated: true,
  },
  {
    id: "SUPPLIER_PAYMENT",
    label: "Pago a proveedor",
    category: "Pagos y cobros",
    description:
      "Pago de una compra a proveedor. Requiere supplierId y normalmente relatedTransactionId apuntando a la PURCHASE.",
  },
  {
    id: "EXPENSE_PAYMENT",
    label: "Pago de gasto operativo",
    category: "Pagos y cobros",
    description:
      "Pago de un gasto operativo. Requiere expenseCategoryId y paymentMethod; se usa para salidas de dinero relacionadas a gastos.",
  },

  // Nómina
  {
    id: "PAYROLL",
    label: "Nómina",
    category: "Nómina",
    description:
      "Registro de liquidación de remuneraciones. Suele generar obligaciones (CxP) y luego pagos asociados (PAYMENT_EXECUTION).",
  },
  {
    id: "PAYMENT_EXECUTION",
    label: "Ejecución de pago (nómina)",
    category: "Nómina",
    description:
      "Ejecución/confirmación de pago de nómina. Requiere relatedTransactionId apuntando a PAYROLL o a la orden de pago definida por el flujo.",
  },

  // Anulaciones y ajustes
  {
    id: "VOID_ADJUSTMENT",
    label: "Anulación / ajuste",
    category: "Ajustes",
    description:
      "Transacción de anulación trazable que referencia a una transacción original para revertir sus efectos sin modificar el registro original.",
  },

  // Caja
  {
    id: "CASH_DEPOSIT",
    label: "Depósito de efectivo",
    category: "Caja",
    description:
      "Depósito de efectivo (generalmente desde caja a banco). Puede requerir bankAccountKey según configuración.",
  },
  {
    id: "OPERATING_EXPENSE",
    label: "Gasto operativo",
    category: "Gastos",
    description:
      "Registro de un gasto operativo (consumo/servicio). Puede ser el hecho económico base antes de su pago (EXPENSE_PAYMENT) según el flujo.",
  },
  {
    id: "CASH_SESSION_OPENING",
    label: "Apertura de caja",
    category: "Caja",
    description:
      "Apertura de una sesión de caja para un punto de venta. Marca inicio de operación y habilita movimientos asociados.",
  },
  {
    id: "CASH_SESSION_CLOSING",
    label: "Cierre de caja",
    category: "Caja",
    description:
      "Cierre de sesión de caja: consolida movimientos, arqueo y deja evidencia del cierre operativo/contable.",
  },
  {
    id: "CASH_SESSION_WITHDRAWAL",
    label: "Retiro de caja",
    category: "Caja",
    description:
      "Retiro de efectivo desde una sesión de caja (p. ej. para depósito o resguardo). Debe quedar trazabilidad y motivo.",
  },
  {
    id: "CASH_SESSION_DEPOSIT",
    label: "Ingreso a caja",
    category: "Caja",
    description:
      "Ingreso de efectivo a una sesión de caja (p. ej. fondo de caja, regularización). Se usa para cuadrar operación.",
  },
  {
    id: "CASH_SESSION_TO_HUB_TRANSFER",
    label: "Traslado caja → centro de acopio",
    category: "Caja",
    description:
      "Movimiento de efectivo desde cierre/sesión de caja hacia centro de acopio (tesorería). Deja trazabilidad contable entre cuentas de efectivo.",
  },

  // Capital
  {
    id: "CAPITAL_CONTRIBUTION",
    label: "Aporte de capital",
    category: "Capital",
    description:
      "Ingreso de capital (socio → empresa), típicamente a banco o cuentas de capital. Requiere trazabilidad de socio y documento soporte.",
  },
  {
    id: "BANK_WITHDRAWAL_TO_SHAREHOLDER",
    label: "Retiro a accionista",
    category: "Capital",
    description:
      "Salida de fondos desde banco hacia un accionista/socio. Se usa como retiro de capital/dividendos según política y trazabilidad.",
  },
  {
    id: "CASH_WITHDRAWAL_TO_PETTY_CASH",
    label: "Giro banco → caja chica",
    category: "Capital",
    description:
      "Traslado desde banco hacia caja chica / fondo fijo (sencillado). Complementa flujos de tesorería y operación diaria.",
  },
];

