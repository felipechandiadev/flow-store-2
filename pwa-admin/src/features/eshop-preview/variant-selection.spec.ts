import {
  findVariantByExactSelection,
  isOptionAvailable,
  isOptionCompatibleWithSelection,
  selectionAfterOptionPick,
} from "./variant-selection";

describe("variant-selection", () => {
  const variants = [
    { id: "1", sku: "A-S-B", attributeValues: { Color: "Blanco", Talla: "S" } },
    { id: "2", sku: "A-M-N", attributeValues: { Color: "Negro", Talla: "M" } },
    { id: "3", sku: "A-L-N", attributeValues: { Color: "Negro", Talla: "L" } },
  ];
  const dimensions = ["Color", "Talla"];

  it("permite elegir otra talla aunque no combine con el color actual", () => {
    const selection = { Color: "Blanco", Talla: "S" };
    expect(isOptionAvailable(variants, "Talla", "M")).toBe(true);
    expect(isOptionCompatibleWithSelection(variants, "Talla", "M", selection)).toBe(false);

    const next = selectionAfterOptionPick(variants, "Talla", "M", selection, dimensions);
    expect(next).toEqual({ Color: "Negro", Talla: "M" });
  });

  it("resuelve variante exacta tras ajustar atributos", () => {
    const selection = selectionAfterOptionPick(
      variants,
      "Talla",
      "L",
      { Color: "Blanco", Talla: "S" },
      dimensions,
    );
    expect(findVariantByExactSelection(variants, selection, dimensions)?.sku).toBe("A-L-N");
  });
});
