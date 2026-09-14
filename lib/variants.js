import { applyMargin } from "@/lib/pricing";

// Resolve the active price and the struck-through comparison price for display/charge.
export const activePricing = (regular, discountedPrice) => {
  const r = Math.round(Number(regular));
  const d = discountedPrice == null ? null : Math.round(Number(discountedPrice));
  return d != null && d < r
    ? { price: d, compareAtPrice: r }
    : { price: r, compareAtPrice: null };
};

// Cheapest in-stock variant by ACTIVE price; falls back to cheapest overall; null if empty.
export const cheapestVariant = (variants = []) => {
  if (!variants.length) return null;
  const inStock = variants.filter((v) => v.inStock);
  const pool = inStock.length ? inStock : variants;
  return pool.reduce((min, v) => (v.price < min.price ? v : min), pool[0]);
};

// The variant whose options match every key/value in `selected`, or null.
export const resolveVariant = (variants = [], selected = {}) => {
  const keys = Object.keys(selected);
  return (
    variants.find((v) => keys.every((k) => v.options?.[k] === selected[k])) || null
  );
};

// Human label like "128GB / Black", ordered by the option definition.
export const variantLabel = (variant, options = []) => {
  if (!variant?.options) return "";
  const order = options.map((o) => o.name);
  const keys = order.length ? order : Object.keys(variant.options);
  return keys.map((k) => variant.options[k]).filter(Boolean).join(" / ");
};

const hasVariants = (product) =>
  Array.isArray(product?.variants) && product.variants.length > 0;

// Resolve display pricing (active price + optional compareAtPrice) for a product/variant.
// discountedPrice (nullable) is a FINAL customer price; when set and lower than the
// regular price it becomes the active price and the regular shows struck-through.
export const withDisplayPricing = (product) => {
  if (!hasVariants(product)) {
    const { price, compareAtPrice } = activePricing(
      applyMargin(product.price),
      product.discountedPrice == null ? null : applyMargin(product.discountedPrice)
    );
    return {
      ...product,
      price,
      compareAtPrice,
    };
  }
  const variants = product.variants.map((v) => {
    const { price, compareAtPrice } = activePricing(
      applyMargin(v.price),
      v.discountedPrice == null ? null : applyMargin(v.discountedPrice)
    );
    return { ...v, price, compareAtPrice };
  });
  // Product-level "from" price uses the cheapest active in-stock variant.
  const cheapest = cheapestVariant(variants);
  const fromPricing = cheapest
    ? { price: cheapest.price, compareAtPrice: cheapest.compareAtPrice }
    : activePricing(applyMargin(product.price), product.discountedPrice == null ? null : applyMargin(product.discountedPrice));
  return {
    ...product,
    hasVariants: true,
    variants,
    price: fromPricing.price,
    compareAtPrice: fromPricing.compareAtPrice,
  };
};

// Cart line identity: plain productId, or productId::variantId when a variant is chosen.
export const cartLineKey = (productId, variantId) =>
  variantId ? `${productId}::${variantId}` : productId;
