import { describe, it, expect } from "vitest";
import { cheapestVariant } from "@/lib/variants";

describe("cheapestVariant", () => {
  it("returns null for an empty list", () => {
    expect(cheapestVariant([])).toBeNull();
  });

  it("returns the lowest-priced in-stock variant", () => {
    const variants = [
      { id: "a", price: 3000, inStock: true },
      { id: "b", price: 2000, inStock: true },
      { id: "c", price: 1000, inStock: false },
    ];
    expect(cheapestVariant(variants).id).toBe("b");
  });

  it("falls back to the lowest overall when none are in stock", () => {
    const variants = [
      { id: "a", price: 3000, inStock: false },
      { id: "b", price: 1500, inStock: false },
    ];
    expect(cheapestVariant(variants).id).toBe("b");
  });
});
