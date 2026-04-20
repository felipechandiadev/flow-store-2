import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetAllUnitsQuery } from '../../queries/get-all-units.query';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitOrmEntity } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { Unit } from '@modules/units/domain/unit.entity';

@QueryHandler(GetAllUnitsQuery)
export class GetAllUnitsQueryHandler implements IQueryHandler<
  GetAllUnitsQuery,
  Unit[]
> {
  private readonly logger = new Logger(GetAllUnitsQueryHandler.name);

  constructor(
    @InjectRepository(UnitOrmEntity)
    private readonly unitRepository: Repository<UnitOrmEntity>,
  ) {}

  async execute(query: GetAllUnitsQuery): Promise<Unit[]> {
    this.logger.debug(`Fetching all units with status=${query.status}`);

    const qb = this.unitRepository.createQueryBuilder('unit');

    // Filter by status if provided
    if (query.status === 'active') {
      qb.where('unit.active = :active', { active: true });
    } else if (query.status === 'inactive') {
      qb.where('unit.active = :active', { active: false });
    }

    const units = await qb.orderBy('unit.symbol', 'ASC').getMany();

    // Convert ORM to Domain
    return units.map((orm) => this.ormToDomain(orm));
  }

  private ormToDomain(orm: UnitOrmEntity): Unit {
    const unit = new Unit();
    unit.id = orm.id;
    unit.name = orm.name;
    unit.symbol = orm.symbol;
    unit.dimension = orm.dimension;
    unit.conversionFactor = orm.conversionFactor;
    unit.allowDecimals = orm.allowDecimals;
    unit.isBase = orm.isBase;
    unit.baseUnitId = orm.baseUnitId;
    unit.active = orm.active;
    unit.createdAt = orm.createdAt;
    unit.updatedAt = orm.updatedAt;
    unit.deletedAt = orm.deletedAt;
    return unit;
  }
}
