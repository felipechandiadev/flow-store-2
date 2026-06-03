# Arquitectura del Backend — KaiStore / Flow Store

Guía para que cualquier desarrollador extienda el backend **con los mismos patrones** que el proyecto usa hoy. Complementa `BACKEND_INSTRUCTIONS.md` (reglas para agentes) y los documentos en `backend/docs/`.

---

## 1. Stack y principios

| Tecnología | Uso |
|------------|-----|
| **NestJS** | Framework HTTP, módulos, DI, pipes, guards |
| **TypeORM** | Persistencia PostgreSQL |
| **@nestjs/cqrs** | Commands / Queries / Handlers (donde el módulo ya migró) |
| **class-validator** | DTOs de entrada en `presentation` y `application/dto` |
| **EventEmitter** | Eventos de aplicación (`@nestjs/event-emitter`) |
| **Redis** (opcional) | Caché (`shared/cache`) |

**Principios (no negociables):**

1. **Separación por capas** dentro de cada módulo: `domain` → `application` → `infrastructure` → `presentation`.
2. **Controllers delgados**: validar HTTP, delegar a use case / handler / service; sin reglas de negocio.
3. **Multi-tenant por empresa**: casi todo dato pertenece a una `companyId` activa.
4. **CQRS donde aporta**: escrituras con commands/use cases; lecturas con queries o services de lectura.
5. El proyecto es **híbrido**: módulos maduros (p. ej. `transactions`, `users`) usan CQRS completo; otros usan `*.service.ts` + repositorio. **Los módulos nuevos deben seguir el patrón del módulo de referencia más cercano**, no inventar una tercera forma.

---

## 2. Estructura global de `backend/src`

```
backend/src/
├── main.ts                 # Bootstrap Nest, CORS, ValidationPipe, Swagger
├── app.module.ts           # Registro de todos los módulos de negocio
├── app.controller.ts
│
├── config/                 # Configuración (Joi, TypeORM, env)
│   ├── config.module.ts
│   ├── config.service.ts
│   ├── data-source.ts      # CLI migraciones TypeORM
│   └── typeorm.config.ts
│
├── common/                 # Cross-cutting HTTP (no es un módulo de negocio)
│   ├── tenant/             # Auth + multi-empresa (guard global)
│   └── filters/
│
├── modules/                # Un folder por bounded context / feature
│   └── {nombre}/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       ├── presentation/
│       ├── tests/          # opcional: unit / integration del módulo
│       └── {nombre}.module.ts
│
├── shared/                 # Código compartido entre módulos
│   ├── application/        # AccountingEngine, AuditService, etc.
│   ├── domain/
│   ├── enums/
│   ├── events/
│   ├── cache/
│   ├── cqrs/               # BaseCommand, BaseQuery, BaseDomainEvent
│   └── ...
│
├── migrations/             # Migraciones TypeORM (timestamp-nombre.ts)
└── seed/                   # Datos de desarrollo
```

### Alias de imports (TypeScript)

```ts
import { X } from '@modules/transactions/...';
import { Y } from '@shared/...';
import { SkipTenant } from '@common/tenant';
```

Definidos en `backend/tsconfig.json`: `@modules/*`, `@shared/*`, `@common/*`.

---

## 3. Estructura obligatoria de un módulo

Cada feature vive en `src/modules/{nombre}/`:

```
modules/{nombre}/
├── domain/
│   ├── {entidad}.entity.ts       # Entidad TypeORM + reglas de dominio
│   ├── events/                   # Eventos de dominio (opcional)
│   └── *.types.ts                # Tipos/value objects sin ORM
│
├── application/
│   ├── commands/                 # Commands + use cases de escritura
│   ├── queries/                  # Queries de lectura
│   ├── handlers/
│   │   ├── commands/             # @CommandHandler
│   │   └── queries/              # @QueryHandler
│   ├── dto/                      # DTOs internos de aplicación
│   ├── services/                 # Orquestación cuando no hay handler dedicado
│   ├── ports/                    # Interfaces (repositorios abstractos)
│   └── {nombre}.service.ts       # Legacy/adaptador (si existe)
│
├── infrastructure/
│   ├── repositories/             # Implementación TypeORM
│   ├── orm-mappers/              # Entidades ORM separadas (módulos grandes)
│   └── ...
│
├── presentation/
│   ├── {nombre}.controller.ts
│   └── guards/                   # Solo guards específicos del módulo (ej. e-shop público)
│
├── tests/
└── {nombre}.module.ts
```

### Responsabilidad de cada capa

| Capa | Qué va aquí | Qué NO va aquí |
|------|-------------|----------------|
| **domain** | Entidades, enums de negocio, validaciones de invariantes, tipos de metadata | HTTP, `Repository` inyectado en entity, llamadas a otros módulos vía HTTP |
| **application** | Casos de uso, CQRS, orquestación, transacciones de aplicación | Decoradores `@Controller`, detalles SQL crudos en controllers |
| **infrastructure** | TypeORM repositories, mappers ORM, adapters externos | Reglas de negocio que no sean persistencia |
| **presentation** | Controllers REST, DTOs de API (`@Body`, `@Query`) | Lógica de negocio extensa |

---

## 4. Patrones CQRS (cómo usarlos en este repo)

### 4.1 Escritura (Command)

Flujo típico en módulos migrados (ej. `transactions`):

```
Controller
  → CommandBus.execute(new CompletePaymentCommand(...))
    → @CommandHandler o UseCase
      → Domain / Repository / otros services
```

Convenciones de archivos:

| Archivo | Ejemplo |
|---------|---------|
| Command | `application/commands/create-transaction.usecase.ts` (clase `CreateTransactionCommand`) |
| Handler | `application/handlers/commands/create-transaction.handler.ts` |
| DTO validado | `application/dto/create-transaction.dto.ts` |

Registrar en `{modulo}.module.ts`:

```ts
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([...])],
  providers: [
    CreateTransactionCommandHandler,
    CreateTransactionUseCase,
    // ...
  ],
})
export class TransactionsModule {}
```

### 4.2 Lectura (Query)

```
Controller
  → QueryBus.execute(new GetTransactionByIdQuery(id))
    → @QueryHandler
      → Repository / read model
```

O, patrón pragmático usado en features recientes:

```
Controller → AccountsPayableService.list(filters)
```

**Cuándo usar cada uno:**

- **Query + Handler**: listados complejos, joins, proyecciones reutilizadas.
- **Application Service** (`*.service.ts` en `application/services/`): lecturas acotadas a un feature (ej. `accounts-payable.service.ts`) si no justifica un handler CQRS aparte.

### 4.3 Regla práctica para código nuevo

1. Si el módulo **ya tiene** `handlers/commands` y `handlers/queries`, **extiende ese patrón**.
2. Si el módulo solo tiene `application/{modulo}.service.ts`, puedes añadir lógica al service **o** migrar el caso de uso a CQRS en el mismo PR (preferible si el cambio es grande).
3. **Nunca** mezclar escritura con efectos secundarios dentro de un `@QueryHandler`.

---

## 5. Módulo NestJS (`{nombre}.module.ts`)

Checklist al crear o extender un módulo:

```ts
@Module({
  imports: [
    TypeOrmModule.forFeature([EntidadDominio, ...]),
    CqrsModule,                    // si hay handlers
    OtroModulo,                    // dependencias explícitas
  ],
  controllers: [MiController],
  providers: [
    MiService,
    MiRepository,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [MiService, MiRepository], // solo lo que otros módulos necesitan
})
export class MiModule {}
```

- Registrar el módulo en `app.module.ts`.
- Exportar **solo** providers que otros módulos consumen (evitar exportar todo el módulo).

---

## 6. Controllers (`presentation`)

### Convenciones

- Ruta base: `@Controller('recurso-en-kebab')` → expuesta como `/api/recurso-en-kebab` (prefijo global `api`).
- Usar `ValidationPipe` global (whitelist + forbidNonWhitelisted); DTOs con `class-validator`.
- Inyectar `@CurrentUser()` / `@CurrentCompany()` cuando el caso de uso necesite contexto explícito.
- Respuestas de error: dejar que Nest propague `HttpException`; el filtro global está en `common/filters`.

### Ejemplo mínimo

```ts
@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(
    private readonly accountsPayableService: AccountsPayableService,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  list(@Query() q: ListAccountsPayableDto) {
    return this.accountsPayableService.list(q);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() body: CompletePaymentDto) {
    return this.commandBus.execute(new CompletePaymentCommand(id, body));
  }
}
```

---

## 7. Persistencia (TypeORM)

### Entidades

- Ubicación principal: `domain/{entidad}.entity.ts`.
- Módulos grandes pueden tener `infrastructure/orm-mappers/*.orm-entity.ts` + mapper a dominio.
- **Siempre filtrar por empresa** en queries cuando la tabla tenga `companyId` (o usar `TenantContext` / subscriber).

### Migraciones

- Carpeta: `backend/src/migrations/`.
- Nombre: `{timestamp}-{DescripcionEnPascalCase}.ts`.
- `DB_SYNCHRONIZE=false` en producción; cambios de esquema **solo** vía migración.
- Data source CLI: `backend/src/config/data-source.ts`.

### Repositorios

- Interface opcional en `application/ports/`.
- Implementación en `infrastructure/repositories/`.
- Inyectar en handlers/services, no en controllers directamente (salvo casos muy simples).

---

## 8. Autenticación y multi-tenant (lectura obligatoria)

> **Importante:** el esquema actual **no usa JWT en el `Authorization` header** para la API interna admin/POS. El front (NextAuth) envía el **UUID del usuario** como Bearer token. El backend valida que exista un `User` con ese id.

### 8.1 Flujo de login

```
POST /api/auth/login   (@SkipTenant)
  → AuthService / LoginHandler
  → Valida userName + password (bcrypt; upgrade desde SHA256 legacy)
  → Devuelve { success, user: { id, rol, companyId, ... } }
```

El **frontend guarda `user.id`** y lo reenvía en cada request:

```
Authorization: Bearer <userId-uuid>
X-Active-Company-Id: <companyId-uuid>   // según rol (ver abajo)
```

Variables JWT en `config.schema.ts` existen para evolución futura; **no son el mecanismo principal** de las PWAs actuales.

### 8.2 TenantGuard (global)

Registrado en `common/tenant/tenant.module.ts` como `APP_GUARD`.

**Por cada request HTTP:**

1. Lee `Authorization: Bearer <uuid>`.
2. Si no es UUID válido → `401 Unauthorized`.
3. Carga `User` desde BD.
4. Resuelve **empresa activa** (`req.activeCompanyId`):

| Rol | Empresa activa |
|-----|----------------|
| **ADMIN / OPERATOR** | `user.companyId` (fijo, obligatorio) |
| **SUPER_ADMIN** | Header `X-Active-Company-Id` (validado en `companies`), o primera empresa activa como fallback |

5. Expone en el request:
   - `req.currentUser` → tipo `CurrentUserPayload`
   - `req.activeCompanyId` → string \| null

### 8.3 TenantInterceptor + TenantContext

Después del guard, `TenantInterceptor` ejecuta el handler dentro de **AsyncLocalStorage**:

```ts
TenantContext.getCompanyId()  // disponible en services/subscribers sin pasar parámetro
TenantContext.getUserId()
```

Usar esto en subscribers TypeORM y servicios profundos que deban acotar por empresa.

### 8.4 Decoradores de tenant (`@common/tenant`)

| Decorador | Uso |
|-----------|-----|
| `@SkipTenant()` | Rutas públicas: `login`, `health`, catálogo e-shop público con su propio guard |
| `@SuperAdminOnly()` | Solo rol `SUPER_ADMIN` |
| `@AdminOnly()` | `ADMIN` o `SUPER_ADMIN` |
| `@AllowAdminWithoutCompany()` | SUPER_ADMIN sin empresa activa (listar companies, etc.) |
| `@CurrentUser()` | Parámetro: usuario autenticado |
| `@CurrentCompany()` | Parámetro: `activeCompanyId` (lanza si falta) |
| `@OptionalCurrentCompany()` | Empresa activa o `null` |

### 8.5 Integración frontend (pwa-admin / pwa-pos)

En server actions / route handlers del admin:

```ts
const session = await getServerSession(authOptions);
headers.Authorization = `Bearer ${session.user.accessToken}`; // en la práctica: userId
headers['X-Active-Company-Id'] = session.user.activeCompanyId;
```

Patrón centralizado: `pwa-admin/src/shared/auth/backend-fetch.ts` → `getBackendHeaders()`.

**Regla:** no llamar `getServerSession()` desde Client Components en `useEffect`; usar Route Handlers (`app/api/...`) o Server Components.

### 8.6 Excepciones: API pública e-shop

Rutas bajo `e-shop-public` usan `@SkipTenant()` + **`EShopStoreGuard`**:

- Identifica tienda por `X-EShop-Store-Slug` o `?slug=`.
- No requiere usuario logueado.
- Inyecta contexto de tienda en el request.

WebSockets (`stock-realtime`, `notifications`) replican la misma lógica de Bearer UUID + empresa en el handshake (ver `WsStockTenantService`).

---

## 9. Roles de usuario

Definidos en `UserRole` (`users/domain/user.entity.ts`):

| Rol | Alcance |
|-----|---------|
| `SUPER_ADMIN` | Multi-empresa; elige empresa con header |
| `ADMIN` | Una empresa (`user.companyId`); configuración y reportes |
| `OPERATOR` | Una empresa; operación (POS, caja, etc.) |

Los controllers sensibles deben usar `@AdminOnly()` o validación explícita de rol en el caso de uso.

---

## 10. Código compartido (`shared/`)

| Área | Contenido |
|------|-----------|
| `shared/application/AccountingEngine.ts` | Asientos contables automáticos tras transacciones |
| `shared/enums/` | Códigos de documento, prefijos folio |
| `shared/events/` | Eventos cross-module (`transaction-created`, etc.) |
| `shared/cache/` | Redis / invalidación |
| `shared/cqrs/` | Bases para commands/queries/events |

**Regla:** si dos módulos necesitan la misma regla de negocio, evaluar subir a `shared/application` o un módulo dominio dedicado; no duplicar en controllers.

---

## 11. Eventos y contabilidad

Muchas escrituras emiten eventos o invocan `AccountingEngine` vía listeners (`shared/listeners/accounting-engine.listener.ts`).

Al crear un nuevo `TransactionType` o flujo de pago:

1. Definir tipo en `transaction.entity.ts` / enums.
2. Registrar prefijo en `document-prefixes.ts` si genera folio.
3. Hook de agregación padre-hijo si aplica (ej. `ParentPaymentAggregateService`).
4. Documentar el modelo de negocio en `docs/` si es un concepto nuevo (ej. `docs/CUENTAS_POR_PAGAR_MODELO.md`).

---

## 12. Tests

| Tipo | Ubicación |
|------|-----------|
| Unit del módulo | `modules/{nombre}/tests/unit/*.spec.ts` |
| Integración API | `backend/test/{feature}/*.spec.ts` |

Ejecutar según scripts del `package.json` del backend. Preferir tests de **comportamiento de caso de uso**, no de controllers aislados.

---

## 13. Checklist: nueva funcionalidad en el backend

- [ ] ¿Existe módulo o hay que crear `modules/{nombre}/` con las 4 capas?
- [ ] ¿Controller delgado + DTO con validación?
- [ ] ¿Escritura vía Command/UseCase y lectura vía Query o Service?
- [ ] ¿Filtro por `companyId` / `TenantContext` en todas las queries?
- [ ] ¿Migración TypeORM si cambia el esquema?
- [ ] ¿Registrado en `{modulo}.module.ts` y `app.module.ts`?
- [ ] ¿Ruta pública marcada con `@SkipTenant()` solo si corresponde?
- [ ] ¿Documentación de dominio en `docs/` si el concepto es nuevo para el equipo?

---

## 14. Anti-patrones (evitar)

| Anti-patrón | Por qué |
|-------------|---------|
| Lógica de negocio en el controller | Imposible de testear y reutilizar |
| Query que inserta/actualiza datos | Rompe CQRS |
| Olvidar `companyId` en listados | Fuga de datos entre empresas |
| `getServerSession` desde cliente vía server action en `useEffect` | Error `headers called outside request scope` en Next.js |
| Nuevos endpoints sin pasar por TenantGuard (sin `@SkipTenant` explícito) | Datos sin contexto de empresa |
| Commitear `.next/` o artefactos de build | Ruido en el repositorio |

---

## 15. Referencias en el repositorio

| Documento | Contenido |
|-----------|-----------|
| `BACKEND_INSTRUCTIONS.md` | Reglas resumidas para agentes / Copilot |
| `backend/docs/architecture-migration-tasks.md` | Estado de migración CQRS por módulo |
| `backend/docs/SALE_TRANSACTION_FLOW.md` | Flujo de venta |
| `docs/CUENTAS_POR_PAGAR_MODELO.md` | Modelo de obligaciones de pago |
| `backend/src/common/tenant/tenant.guard.ts` | Implementación auth + tenant |
| `backend/src/modules/transactions/` | Módulo de referencia CQRS + event store |

---

## 16. Resumen visual del request autenticado

```
Cliente (Admin/POS)
  │  Authorization: Bearer <userId>
  │  X-Active-Company-Id: <companyId>   (SUPER_ADMIN)
  ▼
TenantGuard → carga User, resuelve activeCompanyId
  ▼
TenantInterceptor → TenantContext (ALS)
  ▼
Controller → Application (Command/Query/Service)
  ▼
Infrastructure (TypeORM) → PostgreSQL
```

---

*Última actualización: alineado con NestJS 16, multi-tenant por `TenantGuard`, y patrón híbrido CQRS + application services.*
