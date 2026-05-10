import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Check, CheckDirection, CheckStatus } from '../domain/check.entity';
import { CheckEvent } from '../domain/check-event.entity';
import { BankMovement } from '@modules/bank-movements/domain/bank-movement.entity';

export interface ReconciliationResult {
  matched: boolean;
  check: Check | null;
  reason?: string;
}

/**
 * Concilia movimientos bancarios con cheques pendientes/depositados.
 *
 * Reglas:
 *  - Match por `(companyId, amount, checkNumber)`. El número del cheque
 *    se busca en `bankMovement.description` (sustring) para casos de
 *    importación automática.
 *  - Si match único INCOMING en DEPOSITED -> CLEARED.
 *  - Si match único OUTGOING en PENDING -> CLEARED.
 *  - Si hay varios candidatos, no se cambia el estado (operario debe
 *    conciliar manualmente).
 */
@Injectable()
export class ChecksReconciliationService {
  private readonly logger = new Logger(ChecksReconciliationService.name);

  constructor(
    @InjectRepository(Check)
    private readonly checks: Repository<Check>,
    @InjectRepository(CheckEvent)
    private readonly events: Repository<CheckEvent>,
    @InjectRepository(BankMovement)
    private readonly movements: Repository<BankMovement>,
  ) {}

  /**
   * Intenta conciliar automáticamente un movimiento bancario contra los
   * cheques en estado intermedio de la misma empresa.
   */
  async tryMatch(movement: BankMovement): Promise<ReconciliationResult> {
    if (!movement?.companyId) {
      return { matched: false, check: null, reason: 'movement-missing-company' };
    }

    const direction = movement.direction === 'IN'
      ? CheckDirection.INCOMING
      : CheckDirection.OUTGOING;

    const statuses =
      direction === CheckDirection.INCOMING
        ? [CheckStatus.DEPOSITED]
        : [CheckStatus.PENDING];

    const candidates = await this.checks.find({
      where: {
        companyId: movement.companyId,
        direction,
        status: In(statuses),
        amount: Number(movement.amount),
      },
    });

    if (candidates.length === 0) {
      return { matched: false, check: null, reason: 'no-candidates' };
    }

    // Si hay descripción del movimiento, intentamos refinar por número
    // de cheque incluído en el texto.
    let narrowed = candidates;
    if (movement.description) {
      const desc = movement.description.toLowerCase();
      const byNumber = candidates.filter((c) =>
        desc.includes(c.checkNumber.toLowerCase()),
      );
      if (byNumber.length > 0) narrowed = byNumber;
    }

    if (narrowed.length !== 1) {
      return {
        matched: false,
        check: null,
        reason: narrowed.length > 1 ? 'multiple-candidates' : 'no-candidates',
      };
    }

    const target = narrowed[0];
    const prev = target.status;
    target.status = CheckStatus.CLEARED;
    target.clearedDate = new Date().toISOString().slice(0, 10);
    const saved = await this.checks.save(target);

    await this.events.save(
      this.events.create({
        companyId: saved.companyId,
        checkId: saved.id,
        fromStatus: prev,
        toStatus: CheckStatus.CLEARED,
        userId: null,
        notes: `auto-matched bank_movement ${movement.id}`,
        metadata: { bankMovementId: movement.id, amount: movement.amount },
      }),
    );
    return { matched: true, check: saved };
  }

  /**
   * Conciliación manual: el operario asocia explícitamente un movimiento
   * a un cheque y se fuerza la transición a CLEARED.
   */
  async matchManually(
    checkId: string,
    companyId: string,
    bankMovementId: string,
    userId: string | null,
  ): Promise<Check> {
    const check = await this.checks.findOne({
      where: { id: checkId, companyId },
    });
    if (!check) throw new NotFoundException('Cheque no encontrado');
    if (check.status === CheckStatus.CLEARED) {
      throw new BadRequestException('El cheque ya está cobrado');
    }
    const movement = await this.movements.findOne({
      where: { id: bankMovementId, companyId },
    });
    if (!movement) {
      throw new NotFoundException('Movimiento bancario no encontrado');
    }

    const prev = check.status;
    check.status = CheckStatus.CLEARED;
    check.clearedDate = new Date().toISOString().slice(0, 10);
    const saved = await this.checks.save(check);

    await this.events.save(
      this.events.create({
        companyId: saved.companyId,
        checkId: saved.id,
        fromStatus: prev,
        toStatus: CheckStatus.CLEARED,
        userId,
        notes: `manual match with bank_movement ${movement.id}`,
        metadata: { bankMovementId: movement.id, amount: movement.amount },
      }),
    );
    return saved;
  }
}
