import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { GetUnitByIdQuery } from '../../queries/get-unit-by-id.query';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitOrmEntity } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { Unit } from '@modules/units/domain/unit.entity';

@QueryHandler(GetUnitByIdQuery)
export class GetUnitByIdQueryHandler implements IQueryHandler<
  GetUnitByIdQuery,
  Unit | null
> {
  private readonly logger = new Logger(GetUnitByIdQueryHandler.name);

  constructor(
    @InjectRepository(UnitOrmEntity)
    private readonly unitRepository: Repository<UnitOrmEntity>,
  ) {}

  async execute(query: GetUnitByIdQuery): Promise<Unit | null> {
    this.logger.debug(`Fetching unit ${query.unitId}`);

    const unit = await this.unitRepository.findOne({
      where: { id: query.unitId },
    });

    if (!unit) {
      return null;
    }

    // Convert ORM to Domain
    return this.ormToDomain(unit);
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
