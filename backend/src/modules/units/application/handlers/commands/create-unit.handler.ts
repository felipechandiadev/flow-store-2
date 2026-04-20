import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CreateUnitCommand } from '../../commands/create-unit.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitOrmEntity } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { Unit } from '@modules/units/domain/unit.entity';

@CommandHandler(CreateUnitCommand)
export class CreateUnitCommandHandler implements ICommandHandler<
  CreateUnitCommand,
  Unit
> {
  private readonly logger = new Logger(CreateUnitCommandHandler.name);

  constructor(
    @InjectRepository(UnitOrmEntity)
    private readonly unitRepository: Repository<UnitOrmEntity>,
  ) {}

  async execute(command: CreateUnitCommand): Promise<Unit> {
    this.logger.debug(`Creating unit: ${command.name} (${command.symbol})`);

    const unit = this.unitRepository.create({
      name: command.name,
      symbol: command.symbol,
      dimension: command.dimension as any, // Already validated as UnitDimension
      conversionFactor: command.conversionFactor,
      allowDecimals: command.allowDecimals,
      isBase: command.isBase,
    });

    const saved = await this.unitRepository.save(unit);
    this.logger.debug(`Unit ${saved.id} created successfully`);

    // Convert ORM to Domain
    return this.ormToDomain(saved);
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
