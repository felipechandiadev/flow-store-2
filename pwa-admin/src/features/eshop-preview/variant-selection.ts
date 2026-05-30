export type VariantWithAttributes = {
  id: string;
  sku: string;
  attributeValues: Record<string, string>;
};

/** Coincidencia exacta: todos los atributos del producto deben estar seleccionados y coincidir. */
export function findVariantByExactSelection<T extends VariantWithAttributes>(
  variants: T[],
  selection: Record<string, string>,
  dimensions: string[],
): T | null {
  if (dimensions.length === 0) {
    return variants[0] ?? null;
  }
  if (!dimensions.every((d) => Boolean(selection[d]?.trim()))) {
    return null;
  }
  return (
    variants.find((variant) =>
      dimensions.every((d) => variant.attributeValues[d] === selection[d]),
    ) ?? null
  );
}

/** Tras elegir un valor, resuelve la variante más coherente y devuelve su combinación completa. */
export function selectionAfterOptionPick<T extends VariantWithAttributes>(
  variants: T[],
  dimension: string,
  value: string,
  prevSelection: Record<string, string>,
  dimensions: string[],
): Record<string, string> {
  const candidates = variants.filter((v) => v.attributeValues[dimension] === value);
  if (candidates.length === 0) {
    return prevSelection;
  }
  if (candidates.length === 1) {
    return { ...candidates[0].attributeValues };
  }

  let best = candidates[0];
  let bestScore = -1;
  for (const variant of candidates) {
    let score = 0;
    for (const d of dimensions) {
      if (d === dimension) {
        continue;
      }
      const prev = prevSelection[d];
      if (prev && variant.attributeValues[d] === prev) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = variant;
    }
  }
  return { ...best.attributeValues };
}

/** Alguna variante ofrece este valor (el botón siempre debe poder pulsarse). */
export function isOptionAvailable<T extends VariantWithAttributes>(
  variants: T[],
  dimension: string,
  value: string,
): boolean {
  return variants.some((variant) => variant.attributeValues[dimension] === value);
}

/**
 * Compatible con la selección actual en las demás dimensiones (solo estilo visual).
 * Si es false, al hacer clic se ajustarán otros atributos vía selectionAfterOptionPick.
 */
export function isOptionCompatibleWithSelection<T extends VariantWithAttributes>(
  variants: T[],
  dimension: string,
  value: string,
  selection: Record<string, string>,
): boolean {
  return variants.some((variant) => {
    if (variant.attributeValues[dimension] !== value) {
      return false;
    }
    for (const [key, selected] of Object.entries(selection)) {
      if (key === dimension || !selected) {
        continue;
      }
      if (variant.attributeValues[key] !== selected) {
        return false;
      }
    }
    return true;
  });
}
