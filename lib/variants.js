// Cheapest in-stock variant; falls back to cheapest overall; null if empty.
export const cheapestVariant = (variants = []) => {
  if (!variants.length) return null;
  const inStock = variants.filter((v) => v.inStock);
  const pool = inStock.length ? inStock : variants;
  return pool.reduce((min, v) => (v.price < min.price ? v : min), pool[0]);
};
