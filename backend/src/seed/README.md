# Backend Seeds

Este directorio contiene la lógica de seed para inicializar la base de datos de FlowStore.

## Estructura

```
src/seed/
├── seed.module.ts      # Módulo NestJS para seeds
├── seed.service.ts     # Servicio con la lógica del seed
├── run-seed.ts         # Script CLI para ejecutar el seed
├── data/               # Archivos JSON con datos del seed
│   ├── companies.json
│   ├── branches.json
│   ├── users.json
│   └── ...
└── README.md           # Esta documentación
```

## Uso

### Ejecutar el seed

```bash
# Desde la raíz del proyecto backend
npm run seed

# O directamente con ts-node
npx ts-node src/seed/run-seed.ts
```

### Requisitos

- Base de datos MySQL configurada
- Variables de entorno configuradas (.env.development o .env.production)
- Archivos JSON con datos en `src/seed/data/`

## Archivos de datos

Los archivos JSON en `data/` definen los datos iniciales para cada entidad:

- **companies.json**: Empresas
- **branches.json**: Sucursales
- **users.json**: Usuarios del sistema
- **taxes.json**: Impuestos (IVA, etc.)
- **categories.json**: Categorías de productos
- **products.json**: Productos y variantes
- **customers.json**: Clientes
- **suppliers.json**: Proveedores
- **accountingAccounts.json**: Plan de cuentas
- **accountingRules.json**: Reglas contables automáticas

## Comportamiento

El seed:

1. **Limpia** datos corruptos existentes
2. **Verifica** la conexión a la base de datos
3. **Reinicia** todas las tablas (TRUNCATE)
4. **Crea** datos iniciales en orden de dependencias

⚠️ **ADVERTENCIA**: El seed elimina TODOS los datos existentes. Úsalo solo en entornos de desarrollo o testing.

## Integración con NestJS

El `SeedService` está completamente integrado con NestJS:

- Usa `@InjectDataSource` para acceder a TypeORM
- Importa entidades usando path alias `@modules/*`
- Maneja logging con `Logger` de NestJS
- Puede ser inyectado en otros módulos si es necesario

## Añadir nuevos datos

1. Crea o edita el archivo JSON correspondiente en `data/`
2. Actualiza `SeedService.createSeedData()` para procesar esos datos
3. Ejecuta el seed para validar los cambios

## Troubleshooting

### Error de conexión
- Verifica las variables de entorno DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
- Asegúrate de que MySQL esté corriendo

### Error de archivo no encontrado
- Los archivos JSON deben estar en `src/seed/data/`
- Algunos archivos son opcionales (retornan null si no existen)

### Error de foreign keys
- El seed automáticamente desactiva foreign keys durante el truncate
- Si persiste, verifica que la base de datos tenga permisos adecuados
