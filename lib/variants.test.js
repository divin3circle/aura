import { describe, it, expect } from "vitest";
import { activePricing, cheapestVariant, resolveVariant, variantLabel, withDisplayPricing, cartLineKey } from "@/lib/variants";

describe("activePricing", () => {
  it("no discount → price=regular, compareAt=null", () => {
    expect(activePricing(2000, null)).toEqual({ price: 2000, compareAtPrice: null });
  });
  it("valid discount → discounted active, regular struck-through", () => {
    expect(activePricing(2000, 1500)).toEqual({ price: 1500, compareAtPrice: 2000 });
  });
  it("ignores a discount >= regular", () => {
    expect(activePricing(2000, 2500)).toEqual({ price: 2000, compareAtPrice: null });
  });
});

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
  it("passes through base price for a product with no variants, no discount", () => {
    const p = withDisplayPricing({ id: "p1", price: 1000, mrp: 1200, variants: [] });
    expect(p.price).toBe(1000);
    expect(p.compareAtPrice).toBeNull();
    expect(p.hasVariants).toBeFalsy();
  });

  it("applies discountedPrice for a product with no variants", () => {
    const p = withDisplayPricing({ id: "p1", price: 1000, discountedPrice: 800, variants: [] });
    expect(p.price).toBe(800);
    expect(p.compareAtPrice).toBe(1000);
  });

  it("sets the product price to the cheapest in-stock variant active price", () => {
    const p = withDisplayPricing({
      id: "p2",
      price: 999,
      variants: [
        { id: "a", price: 3000, discountedPrice: null, inStock: true, options: { Size: "100ml" } },
        { id: "b", price: 2000, discountedPrice: null, inStock: true, options: { Size: "50ml" } },
      ],
    });
    expect(p.hasVariants).toBe(true);
    expect(p.price).toBe(2000); // cheapest in-stock active
    expect(p.compareAtPrice).toBeNull();
    expect(p.variants).toHaveLength(2);
  });

  it("uses discountedPrice as active price for cheapest variant", () => {
    const p = withDisplayPricing({
      id: "p3",
      price: 999,
      variants: [
        { id: "a", price: 3000, discountedPrice: 2500, inStock: true, options: { Size: "100ml" } },
        { id: "b", price: 2000, discountedPrice: 1800, inStock: true, options: { Size: "50ml" } },
      ],
    });
    expect(p.hasVariants).toBe(true);
    expect(p.price).toBe(1800); // cheapest in-stock active (discounted)
    expect(p.compareAtPrice).toBe(2000); // regular price of cheapest
  });
});

describe("cartLineKey", () => {
  it("is just the productId when there is no variant", () => {
    expect(cartLineKey("prod1", null)).toBe("prod1");
    expect(cartLineKey("prod1")).toBe("prod1");
  });
  it("joins product and variant when a variant is given", () => {
    expect(cartLineKey("prod1", "var9")).toBe("prod1::var9");
  });
});
