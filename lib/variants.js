import { applyMargin } from "@/lib/pricing";

// Cheapest in-stock variant; falls back to cheapest overall; null if empty.
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

// Apply MARGIN for display. With variants, each variant is margin-applied and the
// product's own price/mrp become the cheapest in-stock variant ("from" price).
export const withDisplayPricing = (product) => {
  if (!hasVariants(product)) {
    return {
      ...product,
      price: applyMargin(product.price),
      mrp: applyMargin(product.mrp),
    };
  }
  const variants = product.variants.map((v) => ({
    ...v,
    price: applyMargin(v.price),
    mrp: applyMargin(v.mrp),
  }));
  const cheapest = cheapestVariant(variants);
  return {
    ...product,
    hasVariants: true,
    variants,
    price: cheapest ? cheapest.price : applyMargin(product.price),
    mrp: cheapest ? cheapest.mrp : applyMargin(product.mrp),
  };
};
