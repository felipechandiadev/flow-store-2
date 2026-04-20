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
├── shared/                       # UI/components
├── providers/                    # AuthProvider, etc.
└── lib/                          # Auth, utils
```

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

## 🚫 Anti-Patrones Prohibidos
- Fetch en components/hooks.
- Lógica en actions.
- Mezclar patrones.
- UI con negocio.

## 🧾 Checklist por Feature
- [ ] Server Actions only.
- [ ] No fetch fuera de infrastructure.
- [ ] Token enviado en todas las fetches.
- [ ] Componentes tontos.
- [ ] Validaciones en domain.

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
Sigue estas instrucciones estrictamente. Arquitectura Server Actions only asegura compatibilidad con backend. Si rompes reglas, rompes la app.</content>
<parameter name="filePath">/Users/felipe/dev/flow-store-2/WEBADMIN_INSTRUCTIONS.md