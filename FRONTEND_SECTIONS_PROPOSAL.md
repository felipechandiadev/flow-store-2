# 📋 Propuesta de Organización de Secciones - FlowStore Admin Frontend

## 🎯 Visión General

Este documento propone una estructura de secciones para el frontend **pwa-admin** basada en los módulos del backend y siguiendo la arquitectura Server Actions Only del documento `.instructions/webadmin.instruction`.

---

## 📦 Estructura de Secciones Propuesta

### 1. **Dashboard** 
- **Ruta**: `/dashboard`
- **Objetivo**: Panel principal con KPIs y resumen del negocio
- **Funcionalidades**:
  - Resumen de ventas del día
  - Inventario crítico
  - Últimas transacciones
  - Gráficos de desempeño
- **Módulos Backend Relacionados**: `analytics`, `transactions`, `inventory`

---

### 2. **Gestión de Productos** 
- **Ruta**: `/dashboard/productos`
- **Objetivo**: CRUD completo de productos y variantes
- **Subsecciones**:
  - **Listado de Productos**: `/dashboard/productos/listado`
  - **Crear Producto**: `/dashboard/productos/crear`
  - **Editar Producto**: `/dashboard/productos/[id]/editar`
  - **Variantes de Producto**: `/dashboard/productos/[id]/variantes`
  - **Atributos de Producto**: `/dashboard/productos/atributos`
- **Features a Crear**:
  ```
  src/features/products/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `products`, `product-variants`, `attributes`, `categories`

---

### 3. **Inventario y Stock**
- **Ruta**: `/dashboard/inventario`
- **Objetivo**: Gestión de niveles de stock, almacenes y receptions
- **Subsecciones**:
  - **Niveles de Stock**: `/dashboard/inventario/niveles`
  - **Almacenes**: `/dashboard/inventario/almacenes`
  - **Recepciones**: `/dashboard/inventario/recepciones`
  - **Bloqueos de Inventario**: `/dashboard/inventario/bloqueos`
- **Features a Crear**:
  ```
  src/features/inventory/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `inventory`, `stock-levels`, `storages`, `receptions`

---

### 4. **Transacciones y Ventas**
- **Ruta**: `/dashboard/ventas`
- **Objetivo**: Gestión de transacciones de venta
- **Subsecciones**:
  - **Listado de Ventas**: `/dashboard/ventas/listado`
  - **Nueva Venta**: `/dashboard/ventas/crear`
  - **Detalles de Venta**: `/dashboard/ventas/[id]`
  - **Líneas de Transacción**: `/dashboard/ventas/[id]/lineas`
- **Features a Crear**:
  ```
  src/features/sales/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `transactions`, `transaction-lines`, `payments`, `installments`

---

### 5. **Gestión de Clientes**
- **Ruta**: `/dashboard/clientes`
- **Objetivo**: CRUD de clientes
- **Subsecciones**:
  - **Listado de Clientes**: `/dashboard/clientes/listado`
  - **Crear Cliente**: `/dashboard/clientes/crear`
  - **Editar Cliente**: `/dashboard/clientes/[id]/editar`
  - **Historial de Compras**: `/dashboard/clientes/[id]/compras`
- **Features a Crear**:
  ```
  src/features/customers/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `customers`, `persons`

---

### 6. **Gestión de Proveedores**
- **Ruta**: `/dashboard/proveedores`
- **Objetivo**: CRUD de proveedores
- **Subsecciones**:
  - **Listado de Proveedores**: `/dashboard/proveedores/listado`
  - **Crear Proveedor**: `/dashboard/proveedores/crear`
  - **Editar Proveedor**: `/dashboard/proveedores/[id]/editar`
- **Features a Crear**:
  ```
  src/features/suppliers/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `suppliers`, `persons`

---

### 7. **Administración de Precios**
- **Ruta**: `/dashboard/precios`
- **Objetivo**: Gestión de listas de precios e items
- **Subsecciones**:
  - **Listas de Precios**: `/dashboard/precios/listas`
  - **Items de Precio**: `/dashboard/precios/items`
  - **Unidades de Medida**: `/dashboard/precios/unidades`
- **Features a Crear**:
  ```
  src/features/pricing/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `price-lists`, `price-list-items`, `units`

---

### 8. **Finanzas y Contabilidad**
- **Ruta**: `/dashboard/finanzas`
- **Objetivo**: Gestión contable y reportes financieros
- **Subsecciones**:
  - **Cuentas Contables**: `/dashboard/finanzas/cuentas`
  - **Períodos Contables**: `/dashboard/finanzas/periodos`
  - **Entradas de Mayor**: `/dashboard/finanzas/mayor`
  - **Saldos de Cuentas**: `/dashboard/finanzas/saldos`
  - **Reglas Contables**: `/dashboard/finanzas/reglas`
  - **Centros de Resultado**: `/dashboard/finanzas/centros`
- **Features a Crear**:
  ```
  src/features/accounting/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `accounting`, `accounting-accounts`, `accounting-periods`, `ledger-entries`, `account-balances`, `accounting-rules`, `result-centers`

---

### 9. **Gestión Bancaria**
- **Ruta**: `/dashboard/banca`
- **Objetivo**: Administración de cuentas bancarias y movimientos
- **Subsecciones**:
  - **Cuentas Bancarias**: `/dashboard/banca/cuentas`
  - **Depósitos**: `/dashboard/banca/depositos`
  - **Retiros**: `/dashboard/banca/retiros`
  - **Transferencias**: `/dashboard/banca/transferencias`
  - **Movimientos**: `/dashboard/banca/movimientos`
- **Features a Crear**:
  ```
  src/features/banking/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `bank-accounts`, `bank-deposits`, `bank-withdrawals`, `bank-transfers`, `bank-movements`

---

### 10. **Sesiones de Caja**
- **Ruta**: `/dashboard/caja`
- **Objetivo**: Gestión de sesiones y movimientos de caja
- **Subsecciones**:
  - **Sesiones Activas**: `/dashboard/caja/sesiones`
  - **Movimientos de Caja**: `/dashboard/caja/movimientos`
  - **Cierre de Sesión**: `/dashboard/caja/cierre`
- **Features a Crear**:
  ```
  src/features/cash/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `cash-sessions`, `cash-deposits`

---

### 11. **Presupuestos y Gastos**
- **Ruta**: `/dashboard/presupuesto`
- **Objetivo**: Planificación presupuestaria y control de gastos
- **Subsecciones**:
  - **Presupuestos**: `/dashboard/presupuesto/presupuestos`
  - **Categorías de Gasto**: `/dashboard/presupuesto/categorias`
  - **Gastos Operacionales**: `/dashboard/presupuesto/operacionales`
  - **Historial de Gastos**: `/dashboard/presupuesto/historial`
- **Features a Crear**:
  ```
  src/features/budgeting/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `budgets`, `expense-categories`, `operational-expenses`

---

### 12. **Configuración del Sistema**
- **Ruta**: `/dashboard/configuracion`
- **Objetivo**: Gestión de usuarios, permisos y parámetros del sistema
- **Subsecciones**:
  - **Usuarios**: `/dashboard/configuracion/usuarios`
  - **Permisos**: `/dashboard/configuracion/permisos`
  - **Puntos de Venta**: `/dashboard/configuracion/pos`
  - **Sucursales**: `/dashboard/configuracion/sucursales`
  - **Empresas**: `/dashboard/configuracion/empresas`
  - **Unidades Organizacionales**: `/dashboard/configuracion/unidades`
  - **Empleados**: `/dashboard/configuracion/empleados`
  - **Accionistas**: `/dashboard/configuracion/accionistas`
- **Features a Crear**:
  ```
  src/features/settings/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `users`, `permissions`, `points-of-sale`, `branches`, `companies`, `organizational-units`, `employees`, `shareholders`

---

### 13. **Reportes y Auditoría**
- **Ruta**: `/dashboard/reportes`
- **Objetivo**: Generación de reportes y auditoría de sistema
- **Subsecciones**:
  - **Reportes de Ventas**: `/dashboard/reportes/ventas`
  - **Reportes de Inventario**: `/dashboard/reportes/inventario`
  - **Reportes Contables**: `/dashboard/reportes/contables`
  - **Auditoría**: `/dashboard/reportes/auditoria`
  - **Precios de Oro**: `/dashboard/reportes/oro`
- **Features a Crear**:
  ```
  src/features/reports/
  ├── actions/
  ├── application/
  ├── domain/
  ├── infrastructure/
  ├── components/
  ├── hooks/
  └── types/
  ```
- **Módulos Backend**: `audits`, `analytics`, `metal-prices`

---

## 🗂️ Estructura de Carpetas del Frontend

```
pwa-admin/
├── app/
│   ├── page.tsx                          # Login
│   ├── layout.tsx                        # RootLayout
│   └── dashboard/
│       ├── layout.tsx                    # DashboardLayout (TopBar + SideBar)
│       ├── page.tsx                      # Dashboard home
│       ├── productos/
│       ├── inventario/
│       ├── ventas/
│       ├── clientes/
│       ├── proveedores/
│       ├── precios/
│       ├── finanzas/
│       ├── banca/
│       ├── caja/
│       ├── presupuesto/
│       ├── configuracion/
│       └── reportes/
├── src/
│   ├── features/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── customers/
│   │   ├── suppliers/
│   │   ├── pricing/
│   │   ├── accounting/
│   │   ├── banking/
│   │   ├── cash/
│   │   ├── budgeting/
│   │   ├── settings/
│   │   └── reports/
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── providers/
│   └── lib/
├── public/
│   ├── logo.png
│   └── favicon.ico
└── package.json
```

---

## 🔗 Integración con TopBar/SideBar

El menú de navegación en la SideBar del `dashboard/layout.tsx` debe reflejar esta estructura:

```typescript
const menuItems: SideBarMenuItem[] = [
  { label: 'Dashboard', url: '/dashboard' },
  {
    label: 'Gestión',
    children: [
      { label: 'Productos', url: '/dashboard/productos' },
      { label: 'Inventario', url: '/dashboard/inventario' },
      { label: 'Clientes', url: '/dashboard/clientes' },
      { label: 'Proveedores', url: '/dashboard/proveedores' },
    ],
  },
  {
    label: 'Operaciones',
    children: [
      { label: 'Ventas', url: '/dashboard/ventas' },
      { label: 'Precios', url: '/dashboard/precios' },
      { label: 'Caja', url: '/dashboard/caja' },
    ],
  },
  {
    label: 'Finanzas',
    children: [
      { label: 'Contabilidad', url: '/dashboard/finanzas' },
      { label: 'Banca', url: '/dashboard/banca' },
      { label: 'Presupuesto', url: '/dashboard/presupuesto' },
    ],
  },
  {
    label: 'Administración',
    children: [
      { label: 'Configuración', url: '/dashboard/configuracion' },
      { label: 'Reportes', url: '/dashboard/reportes' },
    ],
  },
];
```

---

## 🛠️ Arquitectura de Feature

Cada feature debe seguir la estructura Server Actions Only:

```typescript
// 1. Domain (domain/product.entity.ts)
export const ProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string(),
  // ...
});

// 2. Infrastructure (infrastructure/product.request.ts)
export class ProductRequest {
  static async fetchAll() { /* fetch */ }
  static async create(data) { /* fetch */ }
  static async update(id, data) { /* fetch */ }
  static async delete(id) { /* fetch */ }
}

// 3. Application (application/get-products.usecase.ts)
export class GetProductsUseCase {
  static async execute() {
    return ProductRequest.fetchAll();
  }
}

// 4. Server Action (actions/product.action.ts)
'use server';
export async function getProductsAction() {
  return GetProductsUseCase.execute();
}

// 5. Component (components/ProductList.tsx)
'use client';
export function ProductList() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    getProductsAction().then(setProducts);
  }, []);
  return <div>{/* render products */}</div>;
}
```

---

## 📊 Prioridades de Implementación

### **Fase 1** (MVP - Semana 1-2)
- ✅ Dashboard
- ✅ Gestión de Productos (listado, crear, editar)
- ✅ Gestión de Clientes (listado, crear)
- ✅ Ventas (listado básico)

### **Fase 2** (Semana 3-4)
- ⏳ Inventario y Stock
- ⏳ Gestión de Proveedores
- ⏳ Precios

### **Fase 3** (Semana 5-6)
- ⏳ Finanzas y Contabilidad
- ⏳ Configuración del Sistema

### **Fase 4** (Semana 7+)
- ⏳ Banca y Caja
- ⏳ Presupuestos y Gastos
- ⏳ Reportes avanzados

---

## ✅ Checklist de Implementación por Sección

### Para cada nueva sección:
- [ ] Crear estructura de carpetas en `src/features/{nombre}/`
- [ ] Implementar entities con Zod en `domain/`
- [ ] Crear requests en `infrastructure/`
- [ ] Implementar use cases en `application/`
- [ ] Crear server actions en `actions/`
- [ ] Desarrollar componentes en `components/`
- [ ] Crear hooks en `hooks/`
- [ ] Agregar tipos en `types/`
- [ ] Crear ruta en `app/dashboard/{nombre}/`
- [ ] Agregar al menú en SideBar
- [ ] Documentar en este archivo

---

## 📝 Notas Importantes

1. **Server Actions Only**: Cada sección DEBE usar exclusivamente Server Actions.
2. **Sin fetch en componentes**: Toda la lógica de API va en `infrastructure/`.
3. **Validaciones estrictas**: Usar Zod para validar datos antes de enviar.
4. **Reutilización**: Aprovechar componentes compartidos en `shared/`.
5. **Autenticación**: Siempre enviar token en headers de fetch.

---

## 📚 Referencias

- `.instructions/webadmin.instruction` - Guía de arquitectura frontend
- Backend modules - Basado en estructura de `/backend/src/modules/`
- NextAuth.js documentation - Para autenticación
- Zod documentation - Para validaciones

---

**Última actualización**: 2026-04-21
**Versión**: 1.0
