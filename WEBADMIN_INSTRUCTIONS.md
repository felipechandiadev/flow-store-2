# Instrucciones para Agentes de Copilot - Web-Admin Frontend (Server Actions Only)

## 🎯 Propósito
Estas instrucciones guían a los agentes de Copilot para desarrollar y mantener el frontend web-admin usando exclusivamente Server Actions y arquitectura estricta. **Siempre sigue estas reglas sin excepción** para asegurar consistencia con el backend CQRS/DDD y evitar anti-patrones.

## 🧱 Arquitectura Obligatoria
- **Server Actions Only**: Único mecanismo para backend.
- **Capas**: Domain, Application, Infrastructure, Server Actions, UI, Hooks.
- **Flujo**: UI → Server Action → Use Case → Domain → Infrastructure → Backend.

## 📁 Estructura de Carpetas Obligatoria
```
src/
├── app/                          # Rutas Next.js
├── features/{feature}/
│   ├── actions/                  # Server Actions (*.action.ts)
│   ├── application/              # Use Cases (*.usecase.ts)
│   ├── domain/                   # Validaciones (*.entity.ts)
│   ├── infrastructure/           # Fetches (*.request.ts)
│   ├── components/               # UI tonta
│   ├── hooks/                    # Estado UI (*.hook.ts)
│   └── types/                    # Tipos
├── shared/                       # UI/components (incl. Dialog, TopBar, etc.)
├── providers/                    # AuthProvider, etc.
└── lib/                          # Auth, utils
```

### Modales (pwa-admin)
- **Solo** el **Dialog** compartido: `pwa-admin/src/shared/components/Dialog/Dialog.tsx`.
- **Prohibido** implementar o usar otro patrón de diálogo (overlays a mano, otra librería de modal, duplicar el componente) salvo excepción acordada y documentada.
- **Acciones del pie del diálogo:** el `Dialog` usa por defecto **`actionsJustify="between"`** (equivalente a `space-between`). Colocar **Cancelar** (o secundaria) **primero** a la **izquierda** y la acción **primaria** (p. ej. guardar) **después** a la **derecha**. No forzar `end` u otro alineado salvo caso excepcional.
- **Sin botón “Cerrar” en el título:** el `Dialog` no debe usar **`showCloseButton`** por defecto (cierre con backdrop, `Esc` y acciones del pie, p. ej. Cancelar). No activar el botón de cierre de cabecera salvo excepción justificada.
- **Área de alertas (`alertArea`):** el `Dialog` ofrece la prop **`alertArea`** en un **bloque independiente** (hermano del cuerpo y de la fila de botones, no dentro de `actions`), sin scroll con `paper`. **Errores, avisos y mensajes informativos** de envío a backend deben ir ahí con **`Alert`** (`error`, `warning`, `info`, `success`); no usar párrafos con `text-error` ni `Alert` suelta en el formulario para ese feedback. Detalle: `.instructions/webadmin.instruction`.
- **Títulos de diálogos de creación:** usar **«Crear [entidad]»** en el título (y en `aria-label` de apertura); no **«Nueva/Nuevo …»**. Detalle: `pwa-admin/AGENTS.md` y `.instructions/webadmin.instruction`.
- **Diálogos de actualización:** **«Actualizar [entidad]»** en título, apertura y CTA; no **«Editar …»** en títulos; componentes **`Update*Dialog`**. Detalle: mismos archivos.

### Loading (pwa-admin)
- Indicadores de carga reutilizables —`loading.tsx`, `Suspense` fallback, `dynamic({ loading })`, bloques de espera— deben usar **`DotProgress`** (`pwa-admin/src/shared/components/DotProgress/`). No spinners a mano ni solo texto «Cargando…» sin ese componente (excepción: `Button` con prop `loading`). Detalle: `pwa-admin/AGENTS.md` y `.instructions/webadmin.instruction`.

## 🔴 REGLAS CRÍTICAS (NO NEGOCIABLES)
- **NO** fetch en componentes o hooks.
- **NO** lógica negocio en UI/Actions.
- **SIEMPRE** Server Actions como entrypoint.
- **SIEMPRE** enviar `Authorization: Bearer {token}` en fetches.
- **Validaciones** en Domain (Zod).
- **Componentes tontos**: Solo render y eventos.

## 🧠 Capas Detalladas
1. **Domain**: Validaciones, reglas (NO fetch).
2. **Application**: Orquestar use cases (NO fetch).
3. **Infrastructure**: Fetch con token (ÚNICO lugar).
4. **Server Actions**: Recibir input, delegar (NO lógica).
5. **UI**: Renderizar, invocar actions.
6. **Hooks**: Estado UI local.

## 📏 Convenciones
- `*.action.ts`, `*.usecase.ts`, `*.entity.ts`, `*.request.ts`
- Imports: `import { z } from 'zod'`
- Fetches: Siempre con `getServerSession` y token.

### DataGrid: columna de acciones (norma)
- Encabezado: `headerName: ''` (sin texto en el header de acciones).
- `IconButton` en celdas de acciones: `variant="basicSecondary"`, `size="sm"`. Ver `pwa-admin/src/shared/components/DataGrid/components/RowActions.tsx`.

### Cards: IconButton
- En **tarjetas** (`Card` y acciones con icono), `IconButton` **solo** `variant="basicSecondary"` (y `size="sm"`). El `Card` compartido fija el variant en acciones con `icon`/`ariaLabel`.

### Formularios: `TextField` y `placeholder` (norma fija)
- En formularios con **`TextField`** (o equivalente con label flotante), el **`placeholder` debe ser el mismo texto que el `label`** (misma cadena).
- **No** usar placeholders de ejemplo (*“Ej. …”*, *“Opcional, …”*, etc.). Opcionalidad o ayuda: en el `label` o en texto debajo del campo, no en el placeholder.

## 🚫 Anti-Patrones Prohibidos
- Fetch en components/hooks.
- Lógica en actions.
- Mezclar patrones.
- UI con negocio.
- Diálogos distintos del **Dialog** compartido.

## 🧾 Checklist por Feature
- [ ] Server Actions only.
- [ ] No fetch fuera de infrastructure.
- [ ] Token enviado en todas las fetches.
- [ ] Componentes tontos.
- [ ] Validaciones en domain.
- [ ] Modales: solo el **Dialog** compartido; acciones con `space-between` por defecto (cancelar izquierda, primario derecha); sin botón cerrar en el título por defecto. Creación: título **«Crear …»**, no **«Nueva/Nuevo …»**. Actualización: **«Actualizar …»**, componentes **`Update*Dialog`**, no títulos **«Editar …»**.
- [ ] Formularios: `placeholder` igual al `label` en cada campo.

## 📋 Ejemplo de Implementación
Para una feature `products`:

1. **Domain** (`domain/product.entity.ts`):
   ```ts
   import { z } from 'zod';
   export const ProductSchema = z.object({ name: z.string().min(1) });
   export class ProductEntity {
     static validate(data: any) { return ProductSchema.parse(data); }
   }
   ```

2. **Infrastructure** (`infrastructure/product.request.ts`):
   ```ts
   import { getServerSession } from 'next-auth/next';
   import { authOptions } from '@/lib/auth/auth-options';

   export class ProductRequest {
     static async create(data: any) {
       const session = await getServerSession(authOptions);
       const token = session?.user?.accessToken;
       return fetch(`${process.env.BACKEND_API_URL}/products`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify(data),
       });
     }
   }
   ```

3. **Application** (`application/create-product.usecase.ts`):
   ```ts
   import { ProductEntity } from '../domain/product.entity';
   import { ProductRequest } from '../infrastructure/product.request';

   export class CreateProductUseCase {
     static async execute(data: any) {
       const validated = ProductEntity.validate(data);
       return ProductRequest.create(validated);
     }
   }
   ```

4. **Server Action** (`actions/product.action.ts`):
   ```ts
   'use server';
   import { CreateProductUseCase } from '../application/create-product.usecase';

   export async function createProductAction(formData: FormData) {
     const data = Object.fromEntries(formData);
     return CreateProductUseCase.execute(data);
   }
   ```

5. **Componente** (`components/ProductForm.tsx`):
   ```tsx
   'use client';
   export function ProductForm() {
     return <form action={createProductAction}>{/* inputs */}</form>;
   }
   ```

## 🔐 Autenticación
- Usar NextAuth con backend `/auth/login`.
- Siempre obtener token en Server Actions/Infrastructure.
- Proteger rutas con middleware.

## 🧾 Conclusión
Sigue estas instrucciones estrictamente. Arquitectura Server Actions only asegura compatibilidad con backend. Si rompes reglas, rompes la app.
