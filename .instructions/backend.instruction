# Instrucciones para Agentes de Copilot - Backend (NestJS CQRS/DDD)

## 🎯 Propósito
Estas instrucciones guían a los agentes de Copilot para desarrollar y mantener el backend de Flow Store usando arquitectura CQRS/DDD estricta. **Siempre sigue estas reglas sin excepción** para asegurar consistencia, escalabilidad y compatibilidad con el frontend.

## 🧱 Arquitectura Obligatoria
- **CQRS**: Separar Commands (escritura) de Queries (lectura).
- **DDD**: Capas Domain, Application, Infrastructure.
- **Flujo**: Controller → Application (Use Case) → Domain (Entity/Validation) → Infrastructure (Repository/HTTP).

## 📁 Estructura de Carpetas Obligatoria
```
src/
├── modules/{module}/
│   ├── application/          # Use cases, commands, queries
│   ├── domain/               # Entities, value objects, interfaces
│   ├── infrastructure/       # Repositories, mappers, external services
│   ├── presentation/         # Controllers, DTOs
│   └── {module}.module.ts    # Módulo NestJS
├── shared/                   # Utilidades compartidas
├── config/                   # Configuración (TypeORM, etc.)
└── main.ts                   # Entry point
```

## 🔴 REGLAS CRÍTICAS (NO NEGOCIABLES)
- **NO** lógica de negocio en controllers.
- **NO** acceso directo a DB en domain.
- **SIEMPRE** usar repositories en infrastructure.
- **Commands** para escritura, **Queries** para lectura.
- **Validaciones** en domain entities.
- **DTOs** en presentation para requests/responses.

## 🧠 Capas Detalladas
1. **Domain**: Reglas negocio, validaciones (usar class-validator).
2. **Application**: Orquestar use cases, ejecutar domain.
3. **Infrastructure**: Implementar interfaces domain (repositories).
4. **Presentation**: Controllers, DTOs, manejo HTTP.

## 📏 Convenciones
- `*.command.ts`, `*.query.ts`, `*.handler.ts`
- `*.entity.ts`, `*.repository.ts`
- Usar `@CommandHandler`, `@QueryHandler`
- DTOs con sufijo `RequestDto`, `ResponseDto`

## 🚫 Anti-Patrones Prohibidos
- Lógica en controllers.
- Queries con side effects.
- Entities con DB logic.

## 🧾 Checklist por Módulo
- [ ] CQRS aplicado (commands/queries separados).
- [ ] Domain sin dependencies externas.
- [ ] Infrastructure implementa interfaces domain.
- [ ] Controllers delgados.

## 📋 Ejemplo de Implementación
Para un módulo `products`:

1. **Domain** (`domain/product.entity.ts`):
   ```ts
   export class Product {
     @IsString() name: string;
     validate() { /* reglas */ }
   }
   ```

2. **Application** (`application/create-product.usecase.ts`):
   ```ts
   export class CreateProductUseCase {
     execute(command: CreateProductCommand) {
       // Orquestar domain
     }
   }
   ```

3. **Infrastructure** (`infrastructure/product.repository.ts`):
   ```ts
   export class ProductRepository implements IProductRepository {
     // TypeORM logic
   }
   ```

4. **Presentation** (`presentation/product.controller.ts`):
   ```ts
   @Controller('products')
   export class ProductController {
     @Post() create(@Body() dto: CreateProductDto) {
       return this.commandBus.execute(new CreateProductCommand(dto));
     }
   }
   ```

## 🔐 Autenticación
- Usar `@UseGuards(JwtAuthGuard)` en controllers.
- Tokens JWT validados en auth module.
- Roles/permissions en domain.

## 🧾 Conclusión
Sigue estas instrucciones al pie de la letra. Si dudas, consulta la arquitectura CQRS/DDD. Mantén consistencia para evitar deuda técnica.</content>
<parameter name="filePath">/Users/felipe/dev/flow-store-2/BACKEND_INSTRUCTIONS.md