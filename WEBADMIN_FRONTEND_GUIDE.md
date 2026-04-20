# Guía de Desarrollo Frontend - Web Admin (Server Actions Only)

## 🎯 Objetivo

Esta guía define reglas estrictas y obligatorias para desarrollar el frontend de `web-admin` usando exclusivamente **Server Actions** como mecanismo de interacción con el backend. Se basa en la arquitectura DDD/CQRS del backend NestJS, asegurando escalabilidad, mantenibilidad y consistencia. Incorpora patrones reales del proyecto actual, pero impone restricciones para evitar anti-patrones.

**Principio Rector**: El frontend NO contiene lógica de negocio ni acceso directo a datos. Todo flujo sigue capas estrictas y Server Actions como único entrypoint.

---

## 🌍 Variables de Entorno

El proyecto frontend requiere las siguientes variables de entorno para funcionar correctamente. Configúralas en `.env.local` (desarrollo) o en el servidor de producción.

### Variables Obligatorias
```env
# Autenticación NextAuth
NEXTAUTH_SECRET=tu-secreto-muy-seguro-aqui-generado-con-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3021  # En desarrollo; en prod: https://tu-dominio.com

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3020  # URL del backend NestJS (accesible desde cliente)
BACKEND_API_URL=http://localhost:3020     # URL del backend para server-side (igual que arriba en dev)

# Opcionales para PWA/Producción
NODE_ENV=development  # O 'production'
```

### Explicación de Variables
- **NEXTAUTH_SECRET**: Clave secreta para firmar y verificar tokens JWT generados por NextAuth. **Crucial para seguridad**: Protege contra manipulación de sesiones. Genera una única vez con `openssl rand -base64 32` y nunca la expongas. En la app, NextAuth la usa internamente para encriptar cookies de sesión.
- **NEXTAUTH_URL**: URL base completa del frontend (incluyendo protocolo). NextAuth la usa para construir URLs de callbacks y redirecciones (e.g., después de login). En desarrollo: `http://localhost:3021`; en prod: `https://tu-dominio.com`. Importante para evitar errores de CORS y asegurar que los redirects funcionen correctamente en la app.
- **NEXT_PUBLIC_API_URL**: URL del backend API accesible desde el navegador. El prefijo `NEXT_PUBLIC_` la expone al código cliente. Se usa en Infrastructure para fetches (e.g., `fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`)`). Esencial para que el frontend sepa dónde está el backend; en dev coincide con `BACKEND_API_URL`.
- **BACKEND_API_URL**: URL del backend para uso server-side (Server Actions). Igual que `NEXT_PUBLIC_API_URL` en dev, pero puede diferir en prod (e.g., si backend está en un dominio interno). Se usa en Server Actions para fetches seguros (e.g., `fetch(`${process.env.BACKEND_API_URL}/auth/login`)`). Importante para evitar exponer URLs internas al cliente.
- **NODE_ENV**: Controla el modo de la app. En 'development', deshabilita PWA y habilita hot-reload; en 'production', habilita optimizaciones y PWA. Afecta logging, caching y builds.

### Importancia en la App
- Sin `NEXTAUTH_SECRET`, la autenticación falla (sesiones no se firman).
- Sin URLs correctas, las llamadas API fallan (404 o CORS).
- En Server Actions, siempre usa `BACKEND_API_URL` para fetches, y envía el token de sesión para autorización backend.
- Configura `.env.local` en desarrollo; en prod, usa variables de entorno del servidor (e.g., Vercel, Docker).

### Configuración por Entorno
- **Desarrollo**: Usa `http://localhost:3020` para backend si corre localmente.
- **Producción**: Cambia a URLs reales (e.g., `https://api.flowstore.com`). Asegura HTTPS para PWA.
- **Docker/Contenedores**: Si backend está en contenedor, usa `http://backend:3020` internamente.

### Validación
- El frontend fallará al iniciar si faltan `NEXTAUTH_SECRET` o URLs.
- Prueba autenticación y llamadas API en dev para validar configuración.

---

## 🔐 Autenticación (NextAuth + Backend)

La autenticación del frontend web-admin usa **NextAuth** integrado completamente con el backend NestJS, asegurando compatibilidad total con el sistema de auth del backend (módulo `auth`). No hay autenticación duplicada; el frontend delega validación al backend.

### Flujo de Autenticación Obligatorio
```
Usuario ingresa credenciales en login (/ o /admin)
  → NextAuth.authorize() envía POST a backend /auth/login
    → Backend valida user/pass, retorna user + access_token
      → NextAuth guarda access_token en JWT de sesión
        → Sesión expuesta al frontend via useSession()
          → Server Actions obtienen token y lo envían en fetches
```

### Configuración NextAuth (Obligatoria)
Crea `src/lib/auth/auth-options.ts`:
```ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        userName: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const res = await fetch(`${process.env.BACKEND_API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: credentials?.userName,
            password: credentials?.password,
          }),
        });

        const data = await res.json();
        if (res.ok && data.user) {
          return {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            accessToken: data.access_token,  // Token del backend
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.accessToken = user.accessToken;
      return token;
    },
    session: async ({ session, token }) => {
      session.user.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/',  // Página de login personalizada
  },
};
```

### Route Handler de NextAuth
Crea `src/app/api/auth/[...nextauth]/route.ts`:
```ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Uso en Componentes
```tsx
'use client';
import { useSession, signIn, signOut } from 'next-auth/react';

export function LoginButton() {
  const { data: session } = useSession();
  if (session) {
    return <button onClick={() => signOut()}>Logout</button>;
  }
  return <button onClick={() => signIn()}>Login</button>;
}
```

### Integración con Backend
- **Compatibilidad Total**: El backend espera `userName` y `pass` en `/auth/login`; retorna `access_token` (JWT). NextAuth lo almacena y lo propaga.
- **Protección de Rutas**: Usa `middleware.ts` para proteger `/admin/*`:
  ```ts
  // src/middleware.ts
  import { withAuth } from 'next-auth/middleware';
  export default withAuth({
    pages: { signIn: '/' },
  });
  export const config = { matcher: ['/admin/:path*'] };
  ```
- **Server Actions con Token**: Siempre obtén el token de sesión y envíalo en headers. Ejemplo en Infrastructure:
  ```ts
  // infrastructure/product.request.ts
  import { authOptions } from '@/lib/auth/auth-options';
  import { getServerSession } from 'next-auth/next';

  export class ProductRequest {
    static async create(data: any) {
      const session = await getServerSession(authOptions);
      const token = session?.user?.accessToken;

      return fetch(`${process.env.BACKEND_API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,  // Siempre enviar token
        },
        body: JSON.stringify(data),
      });
    }
  }
  ```
- **Importante**: **Todas las fetches al backend desde Server Actions o Infrastructure DEBEN incluir el header `Authorization: Bearer {token}`**. El backend autoriza basado en este token. Sin él, las requests fallan (401 Unauthorized).

### Requisitos de Seguridad
- HTTPS en producción para proteger tokens.
- Tokens expiran según backend; NextAuth maneja refresh si aplica.
- Logout borra sesión y redirige a login.

### Testing Auth
- Prueba login/logout.
- Verifica que Server Actions fallen sin token.
- Usa Postman para simular backend auth.

---

## 🧱 Arquitectura Base

Flujo obligatorio para TODAS las interacciones:

```
UI (Component Tonto)
  → Server Action (Controller/Entrypoint)
    → Use Case (Orquestador)
      → Domain (Reglas de Negocio)
        → Infrastructure (HTTP/Fetch)
          → Backend API
```

### Capas Definidas

1. **DOMAIN**: Validaciones y reglas del negocio. NO fetch, NO Next, NO React.
2. **APPLICATION**: Orquestar lógica y ejecutar dominio. NO fetch.
3. **INFRASTRUCTURE**: Comunicación con backend (fetch). Único lugar con HTTP.
4. **SERVER ACTIONS**: Recibir input, obtener sesión, delegar a use cases. NO lógica de negocio.
5. **UI**: Renderizar y invocar actions. NO fetch, NO lógica.
6. **HOOKS**: Estado UI local. NO backend.

---

## 📁 Estructura de Carpetas OBLIGATORIA

```
src/
├── app/                          # Rutas Next.js (App Router) - Server Components
│   ├── api/                      # Route handlers solo para proxies autenticados (excepcional)
│   ├── admin/                    # Layouts y páginas admin
│   │   ├── layout.tsx            # Layout con TopBar/SideBar
│   │   └── {section}/            # Páginas por módulo (e.g., sales/, inventory/)
│   └── layout.tsx                # Layout raíz con providers
├── features/                     # Módulos de negocio con capas estrictas
│   └── {feature}/                # e.g., sales/, inventory/
│       ├── actions/              # Server Actions (*.action.ts)
│       ├── application/          # Use Cases (*.usecase.ts)
│       ├── domain/               # Entidades y validaciones (*.entity.ts)
│       ├── infrastructure/       # Requests HTTP (*.request.ts)
│       ├── components/           # UI tonta (Server/Client Components)
│       ├── hooks/                # Estado UI local (*.hook.ts)
│       └── types/                # Tipos TypeScript (*.types.ts)
├── shared/                       # Recursos compartidos
│   ├── components/               # UI reusable (e.g., ui/)
│   ├── utils/                    # Helpers generales
│   └── types/                    # Tipos globales
├── providers/                    # Providers React globales
│   ├── AuthProvider.tsx          # NextAuth + React Query
│   └── ErrorHandlerProvider.tsx  # Manejo transversal de errores
├── lib/                          # Integraciones técnicas (sin lógica negocio)
│   ├── auth/                     # Config NextAuth
│   └── utils/                    # Helpers técnicos
└── global.d.ts                   # Tipos globales
```

---

## 🔴 REGLAS CRÍTICAS (NO NEGOCIABLES)

### ❌ PROHIBIDO
- `fetch` en componentes (Client o Server).
- `fetch` en hooks.
- Lógica de negocio en UI (componentes).
- Lógica de negocio en Server Actions.
- Uso de `apiClient` o servicios cliente-style.
- Mezclar patrones dentro de una feature (solo Server Actions).
- Acceso directo a backend desde UI.
- Estado global para datos backend (usar React Query solo para cache UI).

### ✅ OBLIGATORIO
- Server Actions como ÚNICO entrypoint para backend.
- Separación estricta: Domain → Application → Infrastructure.
- Componentes tontos (solo render y eventos).
- TODO acceso HTTP encapsulado en Infrastructure.
- Validaciones y reglas en Domain (usar Zod o esquemas).
- Hooks solo para estado UI local (no queries backend).
- Convenciones de nombres: `*.action.ts`, `*.usecase.ts`, `*.entity.ts`, `*.request.ts`.

---

## 🧠 Stack Tecnológico

- **Next.js 16** con App Router.
- **React 19** (Server/Client Components).
- **TypeScript** obligatorio.
- **Tailwind CSS** para estilos.
- **NextAuth** para autenticación.
- **@tanstack/react-query** para cache de lecturas (Server Components preferidas).
- **Zod** para validaciones Domain.
- **Zustand** solo si es estrictamente necesario para estado UI compartido (evitar).

Scripts principales:
```json
{
  "dev": "next dev -p 3021",
  "build": "next build",
  "start": "next start -p 3021",
  "lint": "eslint"
}
```

---

## 🏠 PWA (Progressive Web App)

El frontend debe ser una **Progressive Web App** para permitir instalación como app nativa, funcionamiento offline básico y mejor UX móvil. Se configura usando `next-pwa` o setup manual, respetando la arquitectura Server Actions.

### Requisitos PWA
- **Instalabilidad**: Manifest y service worker.
- **Offline**: Cache de recursos estáticos y datos críticos via service worker.
- **Seguridad**: HTTPS (en producción; local usa HTTP pero simula).
- **Responsive**: Diseño móvil-first con Tailwind.

### Configuración Obligatoria

1. **Instalar Dependencias**:
   ```bash
   npm install next-pwa workbox-webpack-plugin
   ```

2. **next.config.js** (Agregar configuración PWA):
   ```js
   const withPWA = require('next-pwa')({
     dest: 'public',
     register: true,
     skipWaiting: true,
     disable: process.env.NODE_ENV === 'development',
   });

   module.exports = withPWA({
     // Config existente
     experimental: { appDir: true },
   });
   ```

3. **Manifest** (`public/manifest.json`):
   ```json
   {
     "name": "Flow Store Web Admin",
     "short_name": "FlowAdmin",
     "description": "Administrador de tienda Flow Store",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#000000",
     "icons": [
       {
         "src": "/icon-192x192.png",
         "sizes": "192x192",
         "type": "image/png"
       },
       {
         "src": "/icon-512x512.png",
         "sizes": "512x512",
         "type": "image/png"
       }
     ]
   }
   ```

4. **Service Worker Personalizado** (Opcional, para cache avanzado):
   Crear `public/sw.js` (generado por next-pwa, pero extensible):
   ```js
   // Cache de páginas críticas
   self.addEventListener('install', (event) => {
     event.waitUntil(
       caches.open('flow-admin-v1').then((cache) => {
         return cache.addAll([
           '/',
           '/admin',
           '/offline.html',  // Página offline
         ]);
       })
     );
   });

   // Estrategia de cache: Network First para datos dinámicos
   self.addEventListener('fetch', (event) => {
     if (event.request.url.includes('/api/')) {
       event.respondWith(
         fetch(event.request).catch(() => caches.match('/offline.html'))
       );
     }
   });
   ```

5. **Layout Raíz** (Agregar meta tags PWA):
   ```tsx
   // app/layout.tsx
   export const metadata = {
     manifest: '/manifest.json',
     title: 'Flow Store Web Admin',
     description: 'Administrador de tienda',
     viewport: 'width=device-width, initial-scale=1',
     themeColor: '#000000',
   };

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="es-CL">
         <head>
           <link rel="icon" href="/favicon.ico" />
           <meta name="apple-mobile-web-app-capable" content="yes" />
           <meta name="apple-mobile-web-app-status-bar-style" content="default" />
           <meta name="apple-mobile-web-app-title" content="FlowAdmin" />
         </head>
         <body>
           {/* Providers */}
           {children}
         </body>
       </html>
     );
   }
   ```

6. **Página Offline** (`public/offline.html`):
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Offline - Flow Store</title>
   </head>
   <body>
     <h1>Sin conexión</h1>
     <p>La app está offline. Revisa tu conexión.</p>
   </body>
   </html>
   ```

### Integración con Arquitectura
- **Server Actions**: Cache offline no afecta; actions fallan gracefully si no hay red.
- **React Query**: Configurar para offline (usar `networkMode: 'offlineFirst'` si aplica).
- **Domain/Infrastructure**: No modificar; PWA es capa de presentación.

### Testing PWA
- Usar Lighthouse en DevTools de Chrome para validar.
- Probar instalación: En móvil, prompt de "Agregar a pantalla de inicio".
- Offline: Desconectar red y recargar.

### Notas
- En desarrollo, PWA se deshabilita para evitar cache issues.
- Iconos: Generar con herramientas como PWA Asset Generator.
- Actualizar service worker: Incrementar versión en `next-pwa` config.

---

## 🔄 Flujos Permitidos

### Mutaciones (Escritura)
```
UI → Server Action → Use Case → Domain (validar) → Infrastructure (fetch) → Backend
```

### Lecturas (Lectura)
- Preferir Server Components con datos fetch en actions/use cases.
- Si Client Component: usar React Query con Server Actions como `queryFn`.

Ejemplo de lectura en Server Component:
```tsx
// app/admin/products/page.tsx
import { getProductsAction } from '@/features/products/actions/product.action';

export default async function ProductsPage() {
  const products = await getProductsAction();
  return <ProductList products={products} />;
}
```

---

## 🚫 Anti-Patrones Prohibidos
- Fetch en hooks: `useQuery(() => fetch(...))` ❌
- Lógica en componentes: Validaciones o cálculos en JSX ❌
- Lógica en actions: Reglas negocio en `*.action.ts` ❌
- Mezcla de patrones: Services + Actions en misma feature ❌

---

## 📏 Convenciones y Checklist

### Nombres de Archivos
- `create-product.action.ts`
- `create-product.usecase.ts`
- `product.entity.ts`
- `product.request.ts`
- `use-product-form.hook.ts`

### Checklist por Feature
- [ ] No hay `fetch` fuera de `infrastructure/`
- [ ] No hay lógica negocio en `components/` o `actions/`
- [ ] Separación clara: Domain (reglas), Application (orquestar), Infrastructure (HTTP)
- [ ] Server Actions como único puente a backend
- [ ] Componentes invocan actions via `action` prop o forms

---

## 🧾 Recetas Prácticas

### Receta 1: Crear una Feature Completa (Ejemplo: Products)

1. **Domain** (`domain/product.entity.ts`):
   ```ts
   import { z } from 'zod';

   export const CreateProductSchema = z.object({
     name: z.string().min(1, 'Nombre requerido'),
     price: z.number().positive('Precio positivo'),
   });

   export class ProductEntity {
     static validateCreate(data: any) {
       return CreateProductSchema.parse(data);
     }
   }
   ```

2. **Infrastructure** (`infrastructure/product.request.ts`):
   ```ts
   import { authOptions } from '@/lib/auth/auth-options';
   import { getServerSession } from 'next-auth/next';

   export class ProductRequest {
     private static baseURL = process.env.BACKEND_API_URL!;

     static async create(data: any) {
       const session = await getServerSession(authOptions);
       const token = session?.user?.accessToken;

       return fetch(`${this.baseURL}/products`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`,  // Siempre enviar token para autorización backend
         },
         body: JSON.stringify(data),
       });
     }

     static async getAll() {
       const session = await getServerSession(authOptions);
       const token = session?.user?.accessToken;

       return fetch(`${this.baseURL}/products`, {
         headers: {
           'Authorization': `Bearer ${token}`,  // Siempre enviar token
         },
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
       const validatedData = ProductEntity.validateCreate(data);
       return ProductRequest.create(validatedData);
     }
   }
   ```

4. **Server Action** (`actions/product.action.ts`):
   ```ts
   'use server';

   import { CreateProductUseCase } from '../application/create-product.usecase';

   export async function createProductAction(formData: FormData) {
     const data = Object.fromEntries(formData);
     try {
       return await CreateProductUseCase.execute(data);
     } catch (error) {
       throw new Error('Fallo en creación: ' + error.message);
     }
   }

   export async function getProductsAction() {
     // Para lecturas, orquestar via use case si hay lógica
     return ProductRequest.getAll();  // O use case si aplica
   }
   ```

5. **Hook** (`hooks/use-product-form.hook.ts`):
   ```ts
   'use client';

   import { useState } from 'react';

   export function useProductForm() {
     const [formData, setFormData] = useState({ name: '', price: 0 });
     const [errors, setErrors] = useState({});

     return { formData, setFormData, errors, setErrors };
   }
   ```

6. **Componente** (`components/ProductForm.tsx`):
   ```tsx
   'use client';

   import { createProductAction } from '../actions/product.action';
   import { useProductForm } from '../hooks/use-product-form.hook';

   export function ProductForm() {
     const { formData, setFormData, errors } = useProductForm();

     return (
       <form action={createProductAction}>
         <input
           name="name"
           value={formData.name}
           onChange={(e) => setFormData({ ...formData, name: e.target.value })}
         />
         {errors.name && <span>{errors.name}</span>}
         <input
           name="price"
           type="number"
           value={formData.price}
           onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
         />
         <button type="submit">Crear Producto</button>
       </form>
     );
   }
   ```

7. **Página** (`app/admin/inventory/products/page.tsx`):
   ```tsx
   import { getProductsAction } from '@/features/products/actions/product.action';
   import ProductList from '@/features/products/components/ProductList';
   import ProductForm from '@/features/products/components/ProductForm';

   export default async function ProductsPage() {
     const products = await getProductsAction();

     return (
       <div>
         <ProductForm />
         <ProductList products={products} />
       </div>
     );
   }
   ```

### Receta 2: Lectura con React Query (Excepcional)
Si se requiere Client Component para lecturas:
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { getProductsAction } from '../actions/product.action';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: getProductsAction,  // Action como queryFn
  });
}
```

### Receta 3: Route Handler como Proxy (Excepcional)
Solo para casos donde Server Actions no apliquen (e.g., streaming):
```ts
// app/api/products/[id]/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${params.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return NextResponse.json(await res.json());
}
```

---

## 🧠 Providers y Configuración Global

### AuthProvider
```tsx
// providers/AuthProvider.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

### Layout Raíz
```tsx
// app/layout.tsx
import AuthProvider from '@/providers/AuthProvider';
import ErrorHandlerProvider from '@/providers/ErrorHandlerProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body>
        <AuthProvider>
          <ErrorHandlerProvider>
            {children}
          </ErrorHandlerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Layout Admin
```tsx
// app/admin/layout.tsx
import TopBar from '@/shared/components/ui/TopBar';
import SideBar from '@/shared/components/ui/SideBar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <SideBar />
      <div className="flex-1">
        <TopBar />
        <main>{children}</main>
      </div>
    </div>
  );
}
```

---

## 📋 Módulos y Rutas Principales

Basado en la estructura del backend, las features principales son:

- **Ventas**: `sales/transactions`, `sales/customers`, `sales/payments`
- **Compras**: `purchasing/suppliers`, `purchasing/orders`, `purchasing/receptions`
- **Inventario**: `inventory/products`, `inventory/categories`, `inventory/stock`
- **Contabilidad**: `accounting/books`, `accounting/accounts`, `accounting/reports`
- **Operaciones**: `operations/expenses`, `operations/employees`
- **Configuración**: `settings/company`, `settings/users`, `settings/taxes`

Cada feature debe seguir la estructura de capas obligatoria.

---

## 🧾 Conclusión

Esta guía asegura que el frontend sea escalable, mantenible y coherente con el backend DDD/CQRS. Respeta todas las reglas estrictas: Server Actions only, capas separadas, componentes tontos. Si se rompe una regla, se rompe la arquitectura.

**Próximos Pasos**:
- Migrar features existentes a esta arquitectura.
- Implementar validaciones Zod en Domain.
- Usar Server Components para lecturas siempre que sea posible.

“La consistencia es la clave de la escalabilidad.”</content>
<parameter name="filePath">/Users/felipe/dev/flow-store-2/FRONTEND_DEVELOPMENT_GUIDE.md