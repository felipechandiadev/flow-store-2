import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { TenantContext } from './tenant.context';

/**
 * Auto-set `companyId` en cualquier INSERT cuando:
 *   - la entidad tiene una columna `companyId`,
 *   - el valor no fue ya provisto por el caller,
 *   - hay un activeCompanyId en TenantContext (ALS).
 *
 * Esto evita tener que pasar `companyId` explícitamente en todos los services
 * existentes. Las queries de SELECT no se filtran automáticamente — eso queda
 * a discreción de cada controller (con @CurrentCompany()).
 */
@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>): void | Promise<any> {
    const entity = event.entity;
    if (!entity || typeof entity !== 'object') return;

    // Si la entidad no declara la columna companyId, salir.
    const hasCompanyIdColumn = event.metadata.columns.some(
      (c) =>
        c.propertyName === 'companyId' ||
        c.databaseName === 'company_id' ||
        c.databaseName === 'companyId',
    );
    if (!hasCompanyIdColumn) return;

    if ((entity as any).companyId) return; // ya viene seteado

    const fromCtx = TenantContext.getCompanyId();
    if (fromCtx) {
      (entity as any).companyId = fromCtx;
    }
  }
}
