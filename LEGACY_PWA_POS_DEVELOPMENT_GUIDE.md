# PWA POS Development Guide

Este documento define el diseño y la implementación de la versión PWA del POS, basada en la experiencia actual de `mobilePOS` y ajustada a la arquitectura de Server Actions requerida.

## 1. Propósito

Construir una versión PWA del punto de venta que mantenga los flujos de negocio del POS móvil pero eliminando dependencias nativas y adoptando una arquitectura de frontend basada en:

- Server Actions como único entrypoint al backend
- Capas claras de Domain, Application, Infrastructure, Server Actions, UI y Hooks
- Componentes tontos para UI
- Validaciones en Domain (Zod)
- Fetch exclusivo en Infrastructure

Esta guía es para el equipo de desarrollo que construye el POS en Next.js / PWA.

## 2. Concepto general

### Qué es PWA POS
- Aplicación web progresiva para cajas y tablets en el browser
- Sin módulos nativos de Android o iOS
- Basada en rutas de Next.js y páginas responsivas
- Autenticación con NextAuth / Server Actions
- Impresión basada en navegador o integración WebUSB/web-print

### Qué no será parte de esta versión
- Módulos Android nativos (`expo`, `adb`, `AndroidManifest`, `react-native-usb-printer`, `CustomerDisplay` nativo)
- Pantallas secundarias nativas HDMI / iMin
- Permisos específicos de Android fuera del navegador
- Componentes nativos React Native

## 3. Navegación y layout de POS

La experiencia de POS web debe tomar como base la `PosScreen` del mobile POS. El flujo principal es:

- `Login` → `Session Setup` → `Opening` → `Pos`
- desde `Pos` se navega a `Payment` o a `Credit Payment`
- también se accede a información de cliente y a movimientos de caja desde el header

El layout base debe ser un panel de venta de dos columnas, con la misma intención del mobile POS:

- izquierda: búsqueda de productos + resultados
- derecha: carrito de compra + totales + controles de cantidad + botón de pago

SELECION DE LISTA DE PRESIONS DISPOBIBLES PARA EL PUNTO DE VENTA 

Las búsquedas se hacen por nombre, SKU o código escaneado. El carrito permite:

- aumentar/disminuir cantidad
- eliminar líneas
- ver subtotal, impuestos y total
- enviar al checkout con un solo clic

El header de la POS debe incluir una topbar fija y visible que facilite la navegación contextual.

La topbar sugerida contiene:

- logo o marca del POS en el extremo izquierdo (`Store` o `ShoppingBag`)
- nombre del punto de venta junto al logo
- subtítulo con el usuario activo o la sucursal actual
- botón de movimientos de caja (`DollarSign` o `Cash`) para acceder a caja, ingresos, egresos y cierre
- botón de información del cliente (`User` o `UserCheck`) para ver detalle del cliente seleccionado desde cualquier momento
- botón de cerrar sesión (`LogOut`) en el extremo derecho

Además, la topbar puede incluir un tercer botón de acciones rápidas de caja en un menú desplegable si el espacio es limitado, por ejemplo:


En pantallas pequeñas se puede apilar el panel de búsqueda y el panel de carrito, pero siempre debe conservarse el flujo de venta en curso.

La navegación propuesta de la PWA POS es:

- `/login`
- `/session-setup`
- `/opening`
- `/pos`
- `/pos/payment`
- `/pos/credit-payment`
- `/customers`
- `/customers/[id]`
- `/settings`

## 4. Reglas de arquitectura obligatorias

### 4.1 Server Actions only
- Todas las operaciones backend deben pasar por Server Actions.
- No se permiten `fetch` ni llamadas HTTP directas desde componentes o hooks.

### 4.2 Capas
- UI: render de componentes y delegar a actions.
- Server Actions: recibir formulario/evento, delegar a use case.
- Application: orquestar lógica de negocio, delegar a Domain e Infrastructure.
- Domain: validaciones y reglas de negocio con Zod.
- Infrastructure: llamadas al backend con `Authorization: Bearer {token}`.
- Hooks: estado local de UI, sin fetch.

### 4.3 Diálogos
- Usar **solo** el `Dialog` compartido: `pwa-admin/src/shared/components/Dialog/Dialog.tsx`.
- No implementar otros modal patterns.
- Acciones del pie: `actionsJustify="between"`.
- Cancelar (o secundaria) a la izquierda, CTA primaria a la derecha.
- No botón de cerrar en el título por defecto.
- Usar `alertArea` para mensajes e `Alert`.
- Título de creación: `Crear [entidad]`.
- Título de actualización: `Actualizar [entidad]`.

### 4.4 Loading
- Usar `DotProgress` en lugar de spinners a mano.
- Indicadores con `loading.tsx`, `Suspense` fallback o `dynamic({ loading })`.

### 4.5 Formularios
- `placeholder` debe ser el mismo texto que el `label`.
- No usar ejemplos dentro de placeholder.
- Opcionalidad o ayuda en texto debajo del campo.

### 4.6 Prohibiciones críticas
- NO fetch en component/hook.
- NO lógica de negocio en UI.
- NO lógica en Server Actions.
- NO duplicar patrones de diálogo.
- NO usar alertas de texto con estilo en lugar de `Alert` en `alertArea`.

## 5. Estructura de carpetas recomendada

```
src/
├── app/
│   ├── login/page.tsx
│   ├── session-setup/page.tsx
│   ├── opening/page.tsx
│   ├── pos/page.tsx
│   ├── pos/payment/page.tsx
│   ├── pos/credit-payment/page.tsx
│   ├── customers/page.tsx
│   ├── customers/[id]/page.tsx
│   ├── settings/page.tsx          # blank por ahora
│   └── settings/printer/page.tsx  # blank por ahora
├── features/
│   ├── auth/
│   │   ├── actions/
│   │   ├── application/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── cart/
│   ├── checkout/
│   ├── customer/
│   ├── display/
│   ├── printing/
│   ├── settings/
│   └── session/
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── providers/
├── lib/
└── styles/
```

## 6. Pages principales del PWA POS

Cada una de estas páginas debe ser implementada como una ruta de Next.js y debe respetar el patrón UI / Server Action.

### 6.1 `/login`
- Page para autenticación.
- Debe usar un Server Action para login.
- Validaciones de entrada en Domain.
- Componente UI tonto con form action.

```
+---------------------+
|       Login         |
+---------------------+
| Email: [_________]  |
|                     |
| Password: [______]  |
|                     |
| [Login Button]      |
+---------------------+
```

### 6.2 `/session-setup`
- Selección de punto de venta.
- Creación / carga de sesión de caja.
- Use Case para obtener puntos de venta y abrir sesión.
- Usa Server Action para crear o continuar sesión.

```
+---------------------+
|   Session Setup     |
+---------------------+
| Select POS:         |
| [Dropdown]          |
|                     |
| [Create Session]    |
+---------------------+
```

### 6.3 `/opening`
- Registro del monto de apertura.
- Formulario simple con validación y envío por action.

```
+---------------------+
|      Opening        |
+---------------------+
| Opening Amount:     |
| [_______]           |
|                     |
| [Open Session]      |
+---------------------+
```

### 6.4 `/pos`
- Página principal de ventas.
- Búsqueda de productos.
- Agregar/remover artículos del carrito.
- Navegación a pago normal o crédito desde la misma área de ventas.
- El carrito se puede gestionar en estado local o en contexto global.
- No se deben hacer fetch directos: la búsqueda puede invocar una action o un hook que usa acción.
- Layout sugerido: dos columnas con búsqueda/productos a la izquierda y carrito/resumen a la derecha.
- El header debe exponer acceso rápido a movimientos de caja, cliente e información del punto de venta.

```
+-----------------------------------+

| Topbar: Logo | POS | Cash | User |

+-----------------------------------+

+---------------------+---------------------+

|   Search Products   |   Cart Summary      |

| [Search Bar]        | Item 1: Qty Price  |

| Product 1           | Item 2: Qty Price  |

| Product 2           | Total: $XX.XX      |

| ...                 | [Pay Button]       |

+---------------------+---------------------+
```

### 6.5 `/pos/payment`
- Página de pago estándar para finalizar una venta activa.
- Debe ser independiente de `/pos/credit-payment` y enfocarse en cobrar la venta actual.
- `Page` en Next.js con UI tonta y un Server Action de cierre de venta.

```
+-----------------------------------+
| Topbar: Venta en curso | Cliente: John Doe | Total: $150.00 | [Volver a POS]
+-----------------------------------+

+-----------------------------+-----------------------------+
|        Resumen Carrito      |      Métodos de Pago       |
|                             |                             |
| Item 1: Producto A          | [Agregar Método de Pago]   |
|   Qty: 2  Price: $20.00     |                             |
|   Subtotal: $40.00          | Método 1: Efectivo         |
|                             |   Monto: $100.00           |
| Item 2: Producto B          |                             |
|   Qty: 1  Price: $110.00    | Método 2: Tarjeta          |
|   Subtotal: $110.00         |   Monto: $50.00            |
|                             |   Ref: 123456              |
| --------------------------- |                             |
| Subtotal: $150.00           | Saldo Restante: $0.00      |
| Impuestos: $0.00            | Estado: Pago Completo      |
| Descuentos: $0.00           |                             |
| Total: $150.00              | [Confirmar Pago]           |
|                             |                             |
| --------------------------- |                             |
| Información del Cliente     |                             |
| Nombre: John Doe            |                             |
| Documento: 123456789        |                             |
| Teléfono: 555-1234          |                             |
| [Cambiar Cliente]           |                             |
+-----------------------------+-----------------------------+
```

#### Layout recomendado
- Desktop: división clara en dos columnas con separación visual y paneles bien definidos.
  - Columna izquierda (60% ancho aprox.):
    - Bloque superior: `Resumen de carrito` con título y estado de la venta.
    - Bloque de lista: cada línea de carrito debe mostrar producto, cantidad, precio unitario, descuentos, impuestos, subtotal y acciones de editar/eliminar.
    - Bloque inferior: totales desglosados (`subtotal`, `impuestos`, `descuentos`, `total neto`).
    - Debajo de los totales: `Información del cliente` con tarjeta compacta y CTA para cambiar/crear cliente.
  - Columna derecha (40% ancho aprox.):
    - Panel fijo o sticky en scroll: `Métodos de pago` y `Validación de montos`.
    - Sección de `Métodos de pago` con lista de métodos agregados y botón `Agregar método de pago`.
    - Sección de `Pago rápido` con campos de `Monto recibido`, `Cambio calculado` y `Referencias`.
    - Sección de `Resumen de estado` que muestra `Saldo restante`, `Pago completo` o `Falta monto`.
- Tablet / móvil: diseño vertical por secciones.
  - Primera sección: `Resumen de carrito` ocupando todo el ancho.
  - Segunda sección: `Información de cliente` inmediatamente debajo.
  - Tercera sección: `Métodos de pago` y `Validaciones` al final.
  - El botón `Confirmar pago` debe estar siempre visible en un área fija inferior o sticky para no perderlo con scroll.
- Zonas funcionales:
  - Header/topbar fijo con información de contexto de la venta.
  - Panel izquierdo para revisión y edición de línea de venta.
  - Panel derecho para completar el cobro.
- El layout debe indicar claramente cuándo la venta todavía está abierta y qué elementos quedan pendientes.
- El header/topbar puede mostrar:
  - `Venta en curso` como título de sección.
  - cliente activo o `Cliente no seleccionado` con acceso directo a cambiarlo.
  - total actual de la venta en un chip o etiqueta visible.
  - `Volver a POS` como botón secundario para regresar sin perder el carrito.
- Opciones extra de UX:
  - En desktop, usar un panel sticky para el sidebar derecho y el CTA de confirmación.
  - En mobile, usar accordions o secciones colapsables para evitar un scroll demasiado largo.
  - Mantener el `Estado de pago` visible en todo momento (`Pendiente`, `Completo`, `Cambio disponible`).

#### Secciones de la página
1. Resumen de carrito
   - Lista de productos con cantidad, precio unitario, descuentos e impuestos.
   - Subtotal, total de impuestos y total neto.
   - Posibilidad de editar cantidad o eliminar líneas desde el resumen.
2. Información del cliente
   - Cliente seleccionado o botón para seleccionarlo/crear uno nuevo.
   - Datos clave: nombre, documento, teléfono.
   - Si no hay cliente, mostrar CTA para buscar/crear cliente.
3. Métodos de pago
   - Lista de métodos de pago agregados.
   - Botón `Agregar método de pago` que abre un `Dialog` compartido.
   - Cada método debe incluir `tipo`, `monto aplicado` y `referencia` opcional.
4. Validaciones y formulario principal
   - Formulario que agrupa:
     - método de pago seleccionado
     - monto recibido
     - tipo de pago
     - referencia o nota opcional
   - El botón principal es `Confirmar pago`.
5. Confirmación y resultado
   - Al confirmar, abrir modal de confirmación o redirigir a pantalla de éxito.
   - Mostrar mensaje claro de `Venta registrada con éxito` y datos de comprobante.

#### Validaciones de formulario y reglas de negocio
- Validaciones en Domain con Zod.
- Reglas obligatorias:
  - `monto total` debe ser mayor que cero.
  - Debe existir al menos un `método de pago`.
  - La suma de montos aplicados debe ser >= total de la venta.
  - El `monto recibido` no puede ser menor que el total a pagar cuando se usa efectivo.
  - Si el método es `tarjeta`, el `referencia` o `autorización` debe ser válido.
  - Si el cliente es requerido por el tipo de venta, debe existir cliente seleccionado.
  - No se debe permitir cerrar la venta si hay saldo pendiente no cubierto.
  - No se debe permitir un `monto aplicado` negativo ni mayor al total.
- Validaciones de UI/acciones:
  - Mostrar alerta de `Cambio faltante` si el efectivo supera el total.
  - Bloquear `Confirmar pago` hasta que el total aplicado cubra el total de la venta.
  - Mostrar `monto restante` dinámico.
  - Indicar cada método de pago con su estado (`válido` / `pendiente` / `error`).

#### Formularios y campos específicos
- Formulario principal de pago:
  - `Cliente` (selector / búsqueda / creación)
  - `Total de la venta` (leer solo)
  - `Método de pago` (selector o lista de métodos agregados)
  - `Monto aplicado` por método
  - `Monto recibido` para efectivo
  - `Referencia de pago` para tarjeta o transferencias
  - `Notas` opcional
- `Dialog` de agregar método de pago:
  - `Tipo de pago` (efectivo, tarjeta, transferencia, vale)
  - `Monto` (requerido, positivo, <= saldo restante)
  - `Referencia` (requerido para tarjeta/transferencia)
  - `Descripción` opcional
- `Dialog` de crear cliente:
  - `Nombre completo`
  - `Documento`
  - `Teléfono`
  - `Email` opcional
  - Validación básica de formato en Domain

#### Comportamiento de Server Actions
- El Server Action recibe el payload del formulario de pago.
- Debe delegar a un use case de Application:
  - verificar sessionId / caja abierta
  - validar cliente
  - validar métodos de pago
  - asignar montos
  - generar la venta en backend
- El Server Action no debe contener lógica de negocio.
- El resultado debe devolver:
  - `success` / `failure`
  - mensajes de error para `alertArea`
  - datos de la venta creada para pantalla de éxito.

#### Errores y flujo de corrección
- Errores de validación deben mostrarse en `alertArea` del `Dialog` o de la página.
- No usar toasts estilo alerta para errores de pago críticos.
- Si el pago falla en backend, mantener el carrito y mostrar la causa.
- Permitir reintentar sin perder el estado de la venta.

#### Consideraciones UX
- El botón de `Confirmar pago` debe ser el CTA principal.
- `Cancelar` o `Volver a POS` en la izquierda del diálogo/modal.
- Usar `DotProgress` mientras se procesa la venta.
- No cerrar la página automáticamente hasta confirmar el resultado.

### 6.6 `/pos/credit-payment`
- Página independiente para pagar cuotas pendientes de crédito del cliente.
- Su objetivo es cargar las cuotas abiertas, seleccionar una cuota y registrar el pago de ese saldo pendiente.
- Incluye validaciones propias de pago de cuota:
  - cliente seleccionado
  - cuota pendiente activa
  - monto exacto o inferior al valor de la cuota
  - método de pago válido
- No es el flujo de una nueva venta a crédito; es el flujo para cobrar obligaciones ya generadas.
- Esta ruta se recomienda cuando el pago de cuota es parte del flujo de caja actual.
- Alternativa customer-centric: `/customers/[id]/credit-payments` si se quiere mover el pago de cuotas a la gestión de cuenta del cliente.

```
+-----------------------------+

|       Credit Payment        |

+-----------------------------+

| Información del Cliente     |

| Nombre: John Doe            |

| Documento: 123456789        |

| [Cambiar Cliente]           |

|                             |

| --------------------------- |

| Cuotas Pendientes           |

|                             |

| Quota 1: $50.00             |

|   Fecha Vencimiento: 01/01/2023 |

|   Estado: Activa            |

|                             |

| Quota 2: $75.00             |

|   Fecha Vencimiento: 15/02/2023 |

|   Estado: Activa            |

|                             |

| [Seleccionar Quota]         |

|                             |

| --------------------------- |

| Detalles del Pago           |

| Cuota Seleccionada: Quota 1 |

| Monto a Pagar: [_____]      |

|                             |

| Método de Pago:             |

| [Efectivo/Tarjeta/...]      |

|                             |

| Referencia: [_____]         |

|                             |

| [Pagar Cuota]               |

+-----------------------------+
```

### 6.7 `/customers`
- Página de búsqueda / selección de cliente.
- Resultado de selección que se almacena para uso en pago.
- Integración con customer search Server Action.

```
+-----------------------------+

|      Search Customers       |

+-----------------------------+

| Search by Name/Document:    |

| [_________________] [Search]|

|                             |

| Results:                    |

|                             |

| 1. John Doe                 |

|    Document: 123456789      |

|    Phone: 555-1234          |

|    [Select]                 |

|                             |

| 2. Jane Smith               |

|    Document: 987654321      |

|    Phone: 555-5678          |

|    [Select]                 |

|                             |

| [Create New Customer]       |

+-----------------------------+
```

### 6.8 `/customers/[id]`
- Página de detalles del cliente seleccionado.
- Lectura de datos del cliente desde backend o store.

```
+-----------------------------+

|     Customer Details        |

+-----------------------------+

|        👤                   |

|   John Doe                  |

|                             |

| Documento: CC 123456789     |

| Teléfono: 555-1234          |

| Email: john@example.com     |

|                             |

| Crédito                     |

| Límite: $1000.00            |

| Ocupado: $200.00            |

| Disponible: $800.00         |

|                             |

| Historial de Compras        |

| 01/05/2023 - $150.00        |

| 15/04/2023 - $50.00         |

|                             |

| [Editar] [Ver Pagos]        |

+-----------------------------+
```

### 6.9 `/settings`
- Panel principal de configuración.
- Acceso a subrutas de configuración de ambiente, impresión y visualización.

```
+---------------------+

|     Settings        |

+---------------------+

| (Página en blanco)   |

| Próximamente:       |

| - Printer Settings   |

| - Display Settings   |

| - Environment Config |

+---------------------+
```



### 7.2 Secciones que se conservan como negocio

Mantener el siguiente contenido como flujos de negocio, pero reescribirlos para PWA:

- Login
- Session Setup
- Opening
- Pos
- Payment
- Credit Payment
- Customer
- Customer Info
- Cash Income
- Cash Outcome
- Cash Closing
- Settings

### 7.3 Reemplazo de modales nativos

Todos los modales deben usar el `Dialog` compartido y seguir reglas de diseño:

- Cancelar a la izquierda, primaria a la derecha.
- No `showCloseButton` por defecto.
- `alertArea` para errores y mensajes.
- Crear: `Crear [entidad]`.
- Actualizar: `Actualizar [entidad]`.

## 8. Mapeo de funciones clave a capas

### 8.1 Domain
- Validar formularios de login.
- Validar apertura de caja.
- Validar creación de cliente.
- Reglas de pago: monto, cambio, crédito.
- Validar métodos de pago.

### 8.2 Application
- Orquestar login.
- Orquestar apertura de sesión.
- Orquestar búsqueda de productos.
- Orquestar procesamiento de venta.
- Orquestar creación de cliente.

### 8.3 Infrastructure
- Fetches a backend con token.
- Ejemplo:
  - `ProductRequest.searchProducts()`
  - `SaleRequest.createSale()`
  - `CustomerRequest.searchCustomers()`

### 8.4 Server Actions
- Form submission handlers en `src/features/*/actions/*.action.ts`.
- No lógica, solo delegar a use cases.

### 8.5 UI
- Presentational components.
- Forma, lista, resumen y tablas.
- No fetch ni lógica de reglas.

### 8.6 Hooks
- Estado local de UI.
- Open/close de dialogs.
- Control de inputs y filtrado local.
- No fetch.

## 9. Lista de Server Actions requeridas

Esta sección lista todas las Server Actions necesarias para el PWA POS, organizadas por feature. Cada Action debe estar en `src/features/*/actions/*.action.ts` y delegar a use cases de Application sin contener lógica de negocio.

### 9.1 Auth Actions
- `loginAction`: Autentica al usuario con email/password, valida credenciales y establece sesión.
- `logoutAction`: Cierra la sesión actual y limpia tokens.

### 9.2 Session Actions
- `getPosListAction`: Obtiene la lista de puntos de venta disponibles para el usuario.
- `createSessionAction`: Crea una nueva sesión de caja para un punto de venta seleccionado.
- `openSessionAction`: Registra el monto de apertura y abre la sesión de caja.
- `closeSessionAction`: Cierra la sesión de caja con totales finales.

### 9.3 Cart Actions
- `searchProductsAction`: Busca productos por nombre, SKU o código de barras.
- `addToCartAction`: Agrega un producto al carrito con cantidad especificada.
- `updateCartItemAction`: Modifica cantidad o descuentos de un ítem en el carrito.
- `removeFromCartAction`: Elimina un ítem del carrito.
- `clearCartAction`: Vacía completamente el carrito.

### 9.4 Customer Actions
- `searchCustomersAction`: Busca clientes por nombre, documento o teléfono.
- `createCustomerAction`: Crea un nuevo cliente con datos básicos.
- `getCustomerDetailsAction`: Obtiene detalles completos de un cliente por ID.
- `updateCustomerAction`: Actualiza información de un cliente existente.

### 9.5 Payment Actions
- `addPaymentMethodAction`: Agrega un método de pago a la venta actual (efectivo, tarjeta, etc.).
- `removePaymentMethodAction`: Elimina un método de pago de la venta.
- `processPaymentAction`: Procesa el pago completo de la venta, valida montos y registra la transacción.
- `processCreditPaymentAction`: Procesa el pago de una cuota de crédito específica.

### 9.6 Cash Management Actions
- `cashIncomeAction`: Registra un ingreso de efectivo a la caja.
- `cashOutcomeAction`: Registra un egreso de efectivo de la caja.
- `getCashMovementsAction`: Obtiene el historial de movimientos de caja para la sesión actual.

### 9.7 Settings Actions
- `getSettingsAction`: Obtiene configuraciones actuales del POS.
- `updateSettingsAction`: Actualiza configuraciones como impresión o display.

## 10. Desarrollo de `Payment` y `CreditPayment`

### 9.1 `Payment`
- Página independiente con layout de dos columnas.
- Debe permitir:
  - ver carrito
  - buscar/seleccionar cliente
  - agregar métodos de pago
  - validar montos
  - finalizar la venta
- El cierre de venta debe ejecutarse en un use case.
- El `Dialog` compartido se usa para:
  - agregar método de pago
  - crear cliente
  - mostrar confirmación o éxito

### 9.2 `CreditPayment`
- Página separada.
- Su lógica debe centrarse en crédito interno y condiciones de cliente.
- Debe tener su propio use case y validaciones.


## 12. Checklist de desarrollo PWA POS

- [ ] Todas las páginas usan Server Actions para backend.
- [ ] No hay fetch en components/hooks.
- [ ] Todas las validaciones se definen en Domain con Zod.
- [ ] Lógica de negocio vive en use cases.
- [ ] Infrastructure envía `Authorization: Bearer {token}`.
- [ ] Dialog usa el componente compartido.
- [ ] `Cancel` a la izquierda, CTA primaria a la derecha.
- [ ] `placeholder` igual al `label` en formularios.
- [ ] Loading usa `DotProgress`.
- [ ] No hay dependencias nativas de Android/React Native.
- [ ] `Payment` y `CreditPayment` son screens independientes.
- [ ] No hay `showCloseButton` por defecto en diálogos.
- [ ] Mensajes de error y advertencia usan `alertArea` y `Alert`.


