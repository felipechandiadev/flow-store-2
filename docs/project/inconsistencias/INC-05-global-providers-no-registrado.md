# INC-05 · `GlobalProvidersModule` documentado pero no registrado

| Campo | Valor |
|-------|-------|
| **Severidad** | Crítica |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |

---

## Resumen

[MODULOS_Y_SERVICIOS_BACKEND.md §2.2](../MODULOS_Y_SERVICIOS_BACKEND.md) lista `GlobalProvidersModule` como infraestructura shared activa. El módulo existe pero **no está importado** en `AppModule`.

---

## Evidencia

```typescript
// backend/src/shared/providers/global-providers.module.ts
@Global()
@Module({
  providers: REPOSITORY_PROVIDERS,
  exports: REPOSITORY_PROVIDERS.map((p) => p.provide),
})
export class GlobalProvidersModule {}
```

Propósito declarado: exponer `@InjectRepository(DomainEntity)` globalmente.

Búsqueda en `app.module.ts`: **sin import** de `GlobalProvidersModule`.

El sistema funciona porque cada módulo registra sus propias entidades vía `TypeOrmModule.forFeature([...])`.

---

## Impacto

- Doc sugiere patrón global de repositorios que no está activo
- Confusión al depender de providers que no se cargan

---

## Resolución propuesta

| Opción | Acción |
|--------|--------|
| **A** | Quitar de tabla “activa” en MODULOS; nota “definido, no registrado” |
| **B** | Registrar en `AppModule` si se quiere el patrón `@Global()` |

---

## Archivos clave

- `backend/src/shared/providers/global-providers.module.ts`
- `backend/src/shared/providers/repository-providers.ts`
- `backend/src/app.module.ts`

[← Índice](./README.md) · [Deuda código](./DEUDA_CODIGO.md)
