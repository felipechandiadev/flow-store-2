import type { SideBarMenuItem } from '@/shared/components/TopBar/SideBar';

const uiComponentItems: SideBarMenuItem[] = [
  { id: 'ui-alert', label: 'Alert', url: '/ui-components/alert' },
  { id: 'ui-autocomplete', label: 'Autocomplete', url: '/ui-components/autocomplete' },
  { id: 'ui-badge', label: 'Badge', url: '/ui-components/badge' },
  { id: 'ui-button', label: 'Button', url: '/ui-components/button' },
  { id: 'ui-cards', label: 'Cards', url: '/ui-components/cards' },
  { id: 'ui-datagrid', label: 'DataGrid', url: '/ui-components/datagrid' },
  { id: 'ui-dialog', label: 'Dialog', url: '/ui-components/dialog' },
  { id: 'ui-dot-progress', label: 'Dot progress', url: '/ui-components/dot-progress' },
  { id: 'ui-icon-button', label: 'Icon Button', url: '/ui-components/icon-button' },
  {
    id: 'ui-collection-page-layout',
    label: 'Collection page layout',
    url: '/ui-components/collection-page-layout',
  },
  { id: 'ui-number-stepper', label: 'Number stepper', url: '/ui-components/number-stepper' },
  { id: 'ui-range-slider', label: 'Range slider', url: '/ui-components/range-slider' },
  { id: 'ui-select', label: 'Select', url: '/ui-components/select' },
  { id: 'ui-switch', label: 'Switch', url: '/ui-components/switch' },
  { id: 'ui-tabs', label: 'Tabs', url: '/ui-components/tabs' },
  { id: 'ui-textfield', label: 'TextField', url: '/ui-components/textfield' },
];

/**
 * Menú principal ERP + showcase de UI. Origen único para el SideBar.
 */
export const mainMenuItems: SideBarMenuItem[] = [
  { id: 'nav-dashboard', label: 'Panel', url: '/dashboard' },
  {
    id: 'nav-sales',
    label: 'Ventas',
    children: [
      { id: 'sales-transactions', label: 'Transacciones', url: '/sales/transactions' },
      { id: 'sales-customers', label: 'Clientes', url: '/sales/customers' },
      { id: 'sales-pos', label: 'Puntos de venta', url: '/sales/points-of-sale' },
      { id: 'sales-payments', label: 'Pagos recibidos', url: '/sales/payments' },
      { id: 'sales-cash-sessions', label: 'Sesiones de caja', url: '/sales/cash-sessions' },
      { id: 'sales-price-lists', label: 'Listas de precios', url: '/sales/price-lists' },
    ],
  },
  {
    id: 'nav-purchasing',
    label: 'Compras',
    children: [
      { id: 'purchasing-receptions', label: 'Recepciones', url: '/purchasing/receptions' },
      { id: 'purchasing-suppliers', label: 'Proveedores', url: '/purchasing/suppliers' },
      { id: 'purchasing-orders', label: 'Órdenes de compra', url: '/purchasing/orders' },
    ],
  },
  {
    id: 'nav-inventory',
    label: 'Inventario y Catálogo',
    children: [
      { id: 'inventory-products', label: 'Productos', url: '/inventory/products' },
      { id: 'inventory-categories', label: 'Categorías', url: '/inventory/categories' },
      { id: 'inventory-stock', label: 'Existencias (Stock)', url: '/inventory/stock' },
      { id: 'inventory-units', label: 'Unidades de medida', url: '/inventory/units' },
      { id: 'inventory-attributes', label: 'Atributos', url: '/inventory/attributes' },
      { id: 'inventory-storages', label: 'Almacenes', url: '/inventory/storages' },
    ],
  },
  {
    id: 'nav-treasury',
    label: 'Tesorería',
    children: [
      { id: 'treasury-expenses', label: 'Gastos operativos', url: '/treasury/expenses' },
      { id: 'treasury-expense-categories', label: 'Categorías de gasto', url: '/treasury/expense-categories' },
      { id: 'treasury-accounts', label: 'Cuentas bancarias y cajas', url: '/treasury/accounts' },
      { id: 'treasury-reconciliations', label: 'Conciliaciones', url: '/treasury/reconciliations' },
      { id: 'treasury-cash-flow', label: 'Flujo de caja (Cash flow)', url: '/treasury/cash-flow' },
    ],
  },
  {
    id: 'nav-accounting',
    label: 'Contabilidad',
    children: [
      { id: 'acc-coa', label: 'Plan de cuentas', url: '/accounting/chart-of-accounts' },
      { id: 'acc-ar', label: 'Cuentas por cobrar', url: '/accounting/accounts-receivable' },
      { id: 'acc-ap', label: 'Cuentas por pagar', url: '/accounting/accounts-payable' },
      { id: 'acc-ledgers', label: 'Libros contables', url: '/accounting/ledgers' },
      { id: 'acc-journal-entries', label: 'Asientos manuales', url: '/accounting/journal-entries' },
      { id: 'acc-taxes', label: 'Impuestos', url: '/accounting/taxes' },
      { id: 'acc-reports', label: 'Estados financieros', url: '/accounting/reports' },
    ],
  },
  {
    id: 'nav-hr',
    label: 'RRHH',
    children: [
      { id: 'hr-employees', label: 'Empleados', url: '/hr/employees' },
      { id: 'hr-remunerations', label: 'Remuneraciones', url: '/hr/remunerations' },
      { id: 'hr-org-units', label: 'Unidades organizativas', url: '/hr/organizational-units' },
    ],
  },
  {
    id: 'nav-settings',
    label: 'Configuración',
    children: [
      { id: 'settings-company', label: 'Empresa', url: '/settings/company' },
      { id: 'settings-branches', label: 'Sucursales', url: '/settings/branches' },
      { id: 'settings-users', label: 'Usuarios', url: '/settings/users' },
      { id: 'settings-parameters', label: 'Parámetros del sistema', url: '/settings/parameters' },
    ],
  },
  { id: 'nav-ui', label: 'UI Components', children: uiComponentItems },
];
