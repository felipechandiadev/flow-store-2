import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';

export function isMassVolumeLength(d: UnitDimension | undefined | null): boolean {
  return (
    d === UnitDimension.MASS ||
    d === UnitDimension.VOLUME ||
    d === UnitDimension.LENGTH
  );
}

/** Stock en base física → cantidad equivalente en unidades de venta (conteo) cuando aplica puente variante. */
export function posDisplayStockInSaleUnits(input: {
  physicalStockInBase: number;
  stockBaseDimension?: UnitDimension | null;
  saleDimension?: UnitDimension | null;
  stockBaseQtyPerCountSaleUnit?: unknown;
}): number {
  const phy = Number(input.physicalStockInBase) || 0;
  const raw = input.stockBaseQtyPerCountSaleUnit;
  const bridge =
    raw != null && raw !== ''
      ? Number(raw)
      : NaN;
  if (
    isMassVolumeLength(input.stockBaseDimension) &&
    input.saleDimension === UnitDimension.COUNT &&
    Number.isFinite(bridge) &&
    bridge > 0
  ) {
    return phy / bridge;
  }
  return phy;
}
