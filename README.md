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
│   ├── src/                    # Código fuente
│   ├── package.json            # Dependencias
│   └── WEBADMIN_FRONTEND_GUIDE.md  # Guía frontend (copia)
├── WEBADMIN_FRONTEND_GUIDE.md  # Guía completa frontend
├── BACKEND_INSTRUCTIONS.md     # Instrucciones para agentes Copilot (backend)
├── WEBADMIN_INSTRUCTIONS.md    # Instrucciones para agentes Copilot (frontend)
└── README.md                   # Este archivo
```

## 🚀 Inicio Rápido
1. **Backend**:
   ```bash
   cd backend
   npm install
   npm run start:dev  # Puerto 3020
   ```

2. **Frontend** (en otro terminal):
   ```bash
   # Crear directorio web-admin
   npx create-next-app web-admin --typescript --tailwind --app
   cd web-admin
   npm install next-pwa @tanstack/react-query next-auth zod zustand
   # Configurar .env.local según WEBADMIN_FRONTEND_GUIDE.md
   npm run dev  # Puerto 3021
   ```

## 📖 Instrucciones para Agentes de Copilot
- **Siempre** lee y sigue `BACKEND_INSTRUCTIONS.md` para desarrollo backend.
- **Siempre** lee y sigue `WEBADMIN_INSTRUCTIONS.md` para desarrollo frontend.
- Consulta `WEBADMIN_FRONTEND_GUIDE.md` para detalles completos.

## 🔧 Configuración
- Variables de entorno: Ver `WEBADMIN_FRONTEND_GUIDE.md` sección 🌍.
- Base de datos: Configurar PostgreSQL en backend.

## 🤝 Contribución
- Usa Git para control de versiones.
- Sigue las instrucciones de agentes para mantener consistencia.
- Commits descriptivos.

## 📄 Licencia
Proyecto interno - Sin licencia pública.</content>
<parameter name="filePath">/Users/felipe/dev/flow-store-2/README.md