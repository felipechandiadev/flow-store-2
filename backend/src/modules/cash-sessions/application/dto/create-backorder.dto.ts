import { IsNumber, IsOptional, Min } from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';

/**
 * Registro de encargo (reserva + abono) desde POS.
 * Misma forma que venta en líneas y pagos; el abono va en `backorderDepositAmount`.
 */
export class CreateBackorderDto extends CreateSaleDto {
  @IsNumber()
  @Min(1)
  backorderDepositAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  backorderDepositPercent?: number;
}
