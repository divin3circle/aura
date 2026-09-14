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
