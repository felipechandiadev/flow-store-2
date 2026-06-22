# Flow Store 2 - Full Stack Project

## 📋 Descripción
Proyecto full-stack para Flow Store: Backend en NestJS con CQRS/DDD y Frontend web-admin en Next.js con Server Actions.

## 🏗️ Arquitectura
- **Backend**: NestJS, TypeScript, CQRS/DDD, TypeORM, PostgreSQL.
- **Frontend**: Next.js 16, React 19, Server Actions Only, NextAuth, PWA.

## 📁 Estructura del Proyecto
```
flow-store-2/
├── backend/                    # Backend NestJS
├── pwa-admin/                  # Admin web (Next.js)
├── pwa-pos/                    # POS
├── pwa-eshop/                  # Tienda pública
├── docs/                       # Documentación del proyecto
│   ├── project/                # Documentación viva (arquitectura, ecosistema)
│   └── legacy/                 # Guías históricas y especificaciones detalladas
└── README.md                   # Este archivo
```

## 🚀 Inicio Rápido
1. **Backend**:
   ```bash
   cd backend
   npm install
   npm run start:dev  # Puerto 3030
   ```

2. **Frontend** (en otro terminal):
   ```bash
   # Crear directorio web-admin
   npx create-next-app web-admin --typescript --tailwind --app
   cd web-admin
   npm install next-pwa @tanstack/react-query next-auth zod zustand
   # Configurar .env.local según docs/legacy/WEBADMIN_FRONTEND_GUIDE.md
   npm run dev  # Puerto 3031
   ```

3. **KaiStore eShop** (tienda pública):
   ```bash
   cd pwa-eshop
   npm install
   npm run dev  # Puerto 3034
   ```

4. **Seed base de datos** (desde `backend/`):
   ```bash
   cd backend
   npm run seed   # Mi Empresa — desarrollo
   # npm run seed:legacy   # Parabrisas / vidrios (opcional)
   ```

## 📖 Documentación
- **Arquitectura y ecosistema:** `docs/project/ARQUITECTURA_Y_ECOSISTEMA.md`
- **Módulos y servicios backend:** `docs/project/MODULOS_Y_SERVICIOS_BACKEND.md`
- **Índice completo:** `docs/README.md`

## 📖 Instrucciones para Agentes de Copilot
- **Siempre** lee y sigue `.instructions/backend.instruction` para desarrollo backend.
- **Siempre** lee y sigue `.instructions/webadmin.instruction` para desarrollo frontend.
- Consulta `docs/legacy/WEBADMIN_FRONTEND_GUIDE.md` para detalles completos de frontend.

## 🔧 Configuración
- Variables de entorno: Ver `docs/legacy/WEBADMIN_FRONTEND_GUIDE.md` sección 🌍.
- Base de datos: Configurar PostgreSQL en backend.

## 🤝 Contribución
- Usa Git para control de versiones.
- Sigue las instrucciones de agentes para mantener consistencia.
- Commits descriptivos.

## 📄 Licencia
Proyecto interno - Sin licencia pública.