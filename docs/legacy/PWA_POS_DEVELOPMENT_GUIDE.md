# PWA POS Development Guide (Flow Store 2)

Esta guía reemplaza `LEGACY_PWA_POS_DEVELOPMENT_GUIDE.md`. Mantiene lo que sigue siendo válido (arquitectura, reglas de UI y flujos POS) y lo reescribe para **Flow Store 2** (backend NestJS CQRS/DDD + frontend Next.js 16 con Server Actions).

## 1) Qué de la guía legacy sigue siendo coherente (y se mantiene)

Los siguientes puntos de `LEGACY_PWA_POS_DEVELOPMENT_GUIDE.md` son **compatibles con el proyecto actual** y deben conservarse:

- **Server Actions only (frontend)**: el patrón de `pwa-admin` exige que el frontend llame al backend solo vía Server Actions, y que el `fetch` viva únicamente en infraestructura. Ver `WEBADMIN_INSTRUCTIONS.md`.
- **Capas**: UI → Server Action → Application (use cases) → Domain (Zod) → Infrastructure (fetch con token) → Backend.
- **Reglas de UI compartidas**:
  - **Diálogos**: usar solo `Dialog` compartido (mismo estándar del admin).
  - **Loading**: usar `DotProgress` (mismo estándar del admin).
  - **Formularios**: placeholder = label (mismo estándar del admin).
- **Flujos POS base**: Login → selección/configuración de POS → apertura de sesión de caja → venta → pago → (opcional) pago de cuotas (crédito) → movimientos/cierre.
- **Layout POS**: pantalla principal en 2 columnas (búsqueda + carrito) en desktop/tablet, apilado en mobile.
- **Prohibiciones**: no “lógica de negocio” en UI/actions; no duplicar patrones de modal; no fetch en componentes/hooks.

## 2) Qué de la guía legacy NO es coherente (y se ajusta)

- **Suposiciones legacy del backend**: cualquier referencia a endpoints o payloads no alineados al backend actual debe reemplazarse por los endpoints reales de Flow Store 2 (sección 6).
- **“NextAuth / JWT”**: en `pwa-admin` la autenticación con credenciales usa `/api/auth/login` y hoy el “token” usado en headers es el `userId` (ver `pwa-admin/src/lib/auth/auth-options.ts`). No asumir JWT hasta que el backend lo entregue.
- **Nombres de rutas y features**: la guía nueva estandariza rutas y features pensando en un app separado `pwa-pos/` y reutilizando los patrones del admin (misma filosofía de capas).
- **Impresión / WebUSB**: sigue siendo una aspiración válida, pero se documenta como “fase posterior” y con fallback web (print del navegador) mientras no exista integración estable.

## 3) Objetivo de la PWA POS en Flow Store 2

Construir una PWA para cajas/tablets que permita operar ventas presenciales:

- Abrir/cerrar sesión de caja
- Buscar productos (optimizado para POS) y construir un carrito
- Cobrar (uno o múltiples métodos de pago)
- Asociar cliente (opcional según reglas)
- Registrar pagos de cuotas pendientes (cobranza de crédito)
- Ver movimientos/ventas de la sesión

## 4) Ubicación recomendada del nuevo frontend

Crear un nuevo proyecto Next.js en el repo como **sibling** de `pwa-admin`:

```
flow-store-2/
├── backend/
├── pwa-admin/
└── pwa-pos/          # NUEVO
```

Motivo: el POS tiene requerimientos UX (teclado, escáner, offline parcial, layouts) distintos al admin; mantener apps separadas evita acoplamientos.

### Convención de puerto
- Backend: `3020` (según `README.md`)
- Admin: `3021` (según `pwa-admin/package.json`)
- POS: **`3022`** (recomendación para evitar colisiones)

## 5) Arquitectura obligatoria (misma que pwa-admin)

### 5.1 Reglas críticas
- **NO fetch en components/hooks**.
- **NO lógica de negocio en UI**.
- **NO lógica de negocio en Server Actions**.
- **SIEMPRE** validaciones de input en Domain con Zod.
- **SIEMPRE** `Authorization: Bearer {token}` en infraestructura.

### 5.2 Estructura de carpetas (pwa-pos)

```
pwa-pos/
├── app/
│   ├── (pos)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── session-setup/page.tsx
│   │   ├── opening/page.tsx
│   │   ├── pos/page.tsx
│   │   ├── pos/payment/page.tsx
│   │   ├── pos/credit-payment/page.tsx
│   │   ├── cash/movements/page.tsx
│   │   └── cash/closing/page.tsx
│   └── api/auth/[...nextauth]/route.ts
├── src/
│   ├── features/
│   │   ├── auth/
│   │   ├── session/              # POS + cash session
│   │   ├── products/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── customers/
│   │   ├── payments/
│   │   └── cash/
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   ├── providers/
│   └── lib/
└── package.json
```

Dentro de cada `src/features/{feature}`:

```
actions/           # Server Actions (*.action.ts)
application/       # Use Cases (*.usecase.ts)
domain/            # Validaciones Zod (*.entity.ts)
infrastructure/    # Fetch al backend (*.request.ts)
components/        # UI tonta
hooks/             # Estado UI (sin fetch)
types/             # Tipos del feature
```

## 6) Backend actual: endpoints relevantes para POS (Flow Store 2)

Los siguientes endpoints existen en el backend actual (controladores reales):

### 6.1 Auth
- **POST** `POST {BACKEND_API_URL}/api/auth/login`
  - Usado por `NextAuth` (credenciales) en `pwa-admin`.

### 6.2 Puntos de venta (POS config)
- **GET** `{BACKEND_API_URL}/api/points-of-sale?includeInactive=0|1`
- **GET** `{BACKEND_API_URL}/api/points-of-sale/:id`
- **GET** `{BACKEND_API_URL}/api/points-of-sale/:id/price-lists`

### 6.3 Caja: Cash Hubs (centros/cajas)
- **GET** `{BACKEND_API_URL}/api/cash-hubs?companyId=...`
- **POST** `{BACKEND_API_URL}/api/cash-hubs`
- **PATCH** `{BACKEND_API_URL}/api/cash-hubs/:id?companyId=...`

> Nota: el POS debería operar normalmente con 1 cash hub “activo” por dispositivo/usuario, pero esa regla debe definirse en el frontend (y/o backend) según el negocio.

### 6.4 Sesiones de caja (cash sessions)
Controlador: `backend/src/modules/cash-sessions/presentation/cash-sessions.controller.ts`

- **GET** `{BACKEND_API_URL}/api/cash-sessions?...` (listado)
- **GET** `{BACKEND_API_URL}/api/cash-sessions/:id` (detalle)
- **POST** `{BACKEND_API_URL}/api/cash-sessions` (abrir sesión)
  - Payload (mínimo): `userId`, `pointOfSaleId`, `openingAmount`
- **POST** `{BACKEND_API_URL}/api/cash-sessions/close` (cierre)
  - Requiere `sessionId` (o `cashSessionId`) y `userId` o `userName`
  - Puede incluir `cashHubId`
- **GET** `{BACKEND_API_URL}/api/cash-sessions/:id/sales` (ventas de la sesión)
- **POST** `{BACKEND_API_URL}/api/cash-sessions/sales` (crear venta desde una sesión)
  - Payload (shape actual): ver `CreateSaleDto` en backend

### 6.5 Productos (búsqueda optimizada POS)
Controlador: `backend/src/modules/products/presentation/products.controller.ts`

- **GET** `{BACKEND_API_URL}/api/products/pos/search?priceListId=...&branchId=...&query=...&page=...&pageSize=...`
  - **`priceListId` es requerido** por el servicio POS.
  - Retorna un resultado ya mapeado a un “producto POS” con precio e impuestos y (opcional) stock por branch.

### 6.6 Clientes
Controlador: `backend/src/modules/customers/presentation/customers.controller.ts`

- **GET** `{BACKEND_API_URL}/api/customers?query=...&page=...&pageSize=...`
- **GET** `{BACKEND_API_URL}/api/customers/search?query=...`
- **POST** `{BACKEND_API_URL}/api/customers`
- **GET** `{BACKEND_API_URL}/api/customers/:id`
- **GET** `{BACKEND_API_URL}/api/customers/:id/pending-quotas` (cuotas pendientes)

### 6.7 Pagos
Controlador: `backend/src/modules/payments/presentation/payments.controller.ts`

- **POST** `{BACKEND_API_URL}/api/payments/multiple`
  - Registra múltiples pagos asociados a una venta (por `saleTransactionId`)
- **POST** `{BACKEND_API_URL}/api/payments/pay-quota`
  - Registra pago de una cuota específica

### 6.8 Transacciones (consulta / auditoría)
Controlador: `backend/src/modules/transactions/presentation/transactions.controller.ts`

- **GET** `{BACKEND_API_URL}/api/transactions?...` (búsqueda con filtros)
- **GET** `{BACKEND_API_URL}/api/transactions/:id` (detalle)

## 7) Flujos funcionales del POS (MVP)

### 7.1 Login
- UI simple, con credenciales.
- Recomendación: **replicar patrón de `pwa-admin`** para NextAuth Credentials.

### 7.2 Session Setup (selección de POS + contexto)
Objetivo: definir el “contexto operativo” para la caja actual:

- `pointOfSaleId` (y su `branchId` si aplica)
- `priceListId` (idealmente desde `defaultPriceListId` del POS o selección manual desde `/points-of-sale/:id/price-lists`)
- `cashHubId` (si el negocio lo exige para movimientos/cierre)

Salida: contexto persistido en estado del frontend (y/o storage) para usarlo en búsqueda POS y en venta.

### 7.3 Opening (apertura de sesión de caja)
- Crea sesión vía `POST /cash-sessions` con `openingAmount`.
- Guardar `cashSessionId` resultante como “sesión activa”.

### 7.4 POS (búsqueda + carrito)
- Búsqueda de productos: `GET /products/pos/search` con `priceListId` (+ `branchId` para stock).
- Carrito: estado local (hook) o store (según complejidad).
- Reglas mínimas:
  - no permitir cantidad \(<= 0\)
  - si `trackInventory` y hay `availableStock`, advertir cuando exceda stock

### 7.5 Payment (cierre de venta)

Objetivo: convertir el carrito en una venta registrada en backend asociada a la sesión de caja.

- El cierre de venta en backend hoy se realiza desde **`POST /cash-sessions/sales`** (ver `CreateSaleDto`).
- El frontend debe:
  - Validar montos en Domain (Zod)
  - Construir `lines[]` desde el carrito
  - Enviar `customerId` si corresponde
  - Enviar `paymentMethod` + (opcional) `payments[]` si se modela el detalle

**Shape mínimo (backend):**
- `userName` (string)
- `pointOfSaleId` (string)
- `cashSessionId` (string)
- `paymentMethod` (string)
- `lines`: cada línea requiere `productVariantId`, `quantity`, `unitPrice`

> Recomendación: modelar “múltiples métodos” en UI, pero mantener compatibilidad con el backend enviando:
> - `paymentMethod` como método principal (p.ej. `CASH`, `CARD`, `MIXED`)
> - `payments[]` como desglose cuando aplique, o usar `POST /payments/multiple` luego de crear la venta si el backend lo requiere.

### 7.6 Credit Payment (pago de cuotas pendientes)

Objetivo: cobrar obligaciones ya generadas (no “crear una venta a crédito”).

- Cargar cuotas: `GET /customers/:id/pending-quotas`
- Registrar pago: `POST /payments/pay-quota`
  - `saleTransactionId`, `paidQuotaId`, `amount`, `paymentMethod` (+ opcional `bankAccountId`)

### 7.7 Movimientos y cierre

- Ventas de sesión: `GET /cash-sessions/:id/sales`
- Cierre: `POST /cash-sessions/close`
  - enviar `sessionId` y `userId` o `userName`
  - incluir `cashHubId` si el negocio lo usa como consolidación

## 8) Autenticación y headers (estado actual del proyecto)

En `pwa-admin`, la autenticación usa NextAuth con Credentials contra `POST /api/auth/login`.

- El “token” usado actualmente en requests al backend se obtiene desde `getServerSession(authOptions)` y se envía como:
  - `Authorization: Bearer ${token}`
- Hoy el `accessToken` se setea como **`user.id`** (ver `pwa-admin/src/lib/auth/auth-options.ts`). No asumir JWT hasta que el backend provea uno.

## 9) Variables de entorno recomendadas (pwa-pos)

Definir `.env.local` en `pwa-pos/` (no commitear):

- `BACKEND_API_URL`: base URL del backend (incluye host/puerto)
  - Ejemplo dev: `http://localhost:3020`
- `NEXTAUTH_URL`: URL del POS
  - Ejemplo dev: `http://localhost:3022`
- `NEXTAUTH_SECRET`: secreto para cookies/sesión
- `NEXT_PUBLIC_APP_NAME`: nombre visible (opcional)

> En `pwa-admin` se usa `{BACKEND_API_URL}/api/...` como prefijo. En POS mantener el mismo patrón para consistencia.

## 10) Diseño UX mínimo (MVP)

### 10.1 Topbar POS (siempre visible)
- POS/branch/caja (contexto)
- Usuario actual
- Acceso rápido a:
  - Movimientos / cierre (caja)
  - Cliente (selección / detalle)
  - Salir

### 10.2 Pantalla `/pos`
- Panel izquierda: búsqueda, resultados, atajos (p.ej. categorías)
- Panel derecha: carrito + totales + CTA “Cobrar”
- Soportar teclado:
  - foco automático en búsqueda
  - Enter para agregar primer resultado (si aplica)
  - teclas rápidas (fase posterior)

### 10.3 Pantalla `/pos/payment`
- Columna izquierda: resumen y edición final de líneas
- Columna derecha: métodos de pago + total aplicado + CTA “Confirmar”
- `Dialog` compartido para:
  - “Agregar método de pago”
  - “Crear cliente”
  - “Confirmación / error”

## 11) Estrategia de implementación (orden recomendado)

1. **Auth + Layout base POS** (NextAuth, guards de rutas, Topbar)
2. **Contexto operativo**: seleccionar POS + price list + abrir sesión (cash session)
3. **Búsqueda POS**: integrar `GET /products/pos/search`
4. **Carrito**: add/update/remove, totales, validaciones UI
5. **Pago**: crear venta con `POST /cash-sessions/sales`
6. **Movimientos/cierre**: ventas de sesión + `POST /cash-sessions/close`
7. **Crédito**: pending-quotas + pay-quota

## 12) Checklist (calidad y consistencia)

- [ ] Todas las llamadas a backend pasan por Server Actions + Infrastructure (sin fetch en UI/hooks).
- [ ] Domain valida inputs con Zod (errores se muestran en `alertArea` con `Alert`).
- [ ] Diálogos usan `Dialog` compartido; cancelar izquierda, primario derecha; sin botón cerrar por defecto.
- [ ] Loading usa `DotProgress` en páginas y fallbacks relevantes.
- [ ] `Authorization: Bearer ...` presente en toda llamada al backend.
- [ ] El POS no permite operar sin `priceListId` (requerido por `/products/pos/search`).
- [ ] El POS no permite cerrar venta sin `cashSessionId` activo.

