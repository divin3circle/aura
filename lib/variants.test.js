import { describe, it, expect } from "vitest";
import { cheapestVariant, resolveVariant, variantLabel } from "@/lib/variants";

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

describe("resolveVariant", () => {
  const variants = [
    { id: "a", options: { Storage: "128GB", Colour: "Black" } },
    { id: "b", options: { Storage: "256GB", Colour: "Black" } },
  ];

  it("matches a full selection", () => {
    expect(resolveVariant(variants, { Storage: "256GB", Colour: "Black" }).id).toBe("b");
  });

  it("returns null when no combo matches", () => {
    expect(resolveVariant(variants, { Storage: "512GB", Colour: "Black" })).toBeNull();
  });
});

describe("variantLabel", () => {
  it("orders values by the option definition", () => {
    const options = [{ name: "Storage", values: [] }, { name: "Colour", values: [] }];
    const variant = { options: { Colour: "Black", Storage: "128GB" } };
    expect(variantLabel(variant, options)).toBe("128GB / Black");
  });

  it("returns an empty string for a variant with no options", () => {
    expect(variantLabel({}, [])).toBe("");
  });
});
