import { describe, it, expect } from "vitest";
import { cheapestVariant, resolveVariant, variantLabel, withDisplayPricing } from "@/lib/variants";

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

describe("withDisplayPricing", () => {
  it("passes through base price for a product with no variants", () => {
    const p = withDisplayPricing({ id: "p1", price: 1000, mrp: 1200, variants: [] });
    expect(p.price).toBe(1000);
    expect(p.mrp).toBe(1200);
    expect(p.hasVariants).toBeFalsy();
  });

  it("sets the product price to the cheapest in-stock variant", () => {
    const p = withDisplayPricing({
      id: "p2",
      price: 999,
      mrp: 999,
      variants: [
        { id: "a", price: 3000, mrp: 3000, inStock: true, options: { Size: "100ml" } },
        { id: "b", price: 2000, mrp: 2500, inStock: true, options: { Size: "50ml" } },
      ],
    });
    expect(p.hasVariants).toBe(true);
    expect(p.price).toBe(2000); // cheapest in-stock
    expect(p.mrp).toBe(2500);
    expect(p.variants).toHaveLength(2);
  });
});
