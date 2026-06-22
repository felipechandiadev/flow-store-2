import {
  computeJewelryNetPrice,
  parseJewelryMoneyField,
  parseJewelryPercent,
} from "./jewelry-price-math";

describe("jewelry-price-math", () => {
  it("computes net price with merma, metal, costs and utilidad", () => {
    // 10g, 10% merma => 11g; metal 1000 CLP/g => 11000; +5000 stones +2000 labor => 18000; +20% util => 21600
    const net = computeJewelryNetPrice({
      weightGrams: 10,
      metalPricePerGram: 1000,
      mermaPercent: 10,
      utilityPercent: 20,
      stonesCost: 5000,
      laborCost: 2000,
      otherCosts: 0,
    });
    expect(net).toBe(21600);
  });

  it("clamps percent inputs", () => {
    expect(parseJewelryPercent("150")).toBe(100);
    expect(parseJewelryPercent("-5")).toBe(0);
  });

  it("parses money fields", () => {
    expect(parseJewelryMoneyField("$ 12.500")).toBe(12.5);
  });
});
