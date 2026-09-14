# Product Variants & Quantity Selector — Design

**Date:** 2026-09-14
**Status:** Approved design → ready for implementation planning
**Repo:** aura (Next.js App Router, Prisma + Neon Postgres, Clerk, Redux Toolkit)

## Summary

Add multi-axis product variants that change price (and in/out stock), plus a
quantity selector on the product page. Variants are **opt-in per product**:
products with no variants keep using their base `price`/`mrp` exactly as today,
so the 30 cosmetics already in the catalogue are unaffected.

Examples this must support:
- **No variants** → default price (most current products).
- **Single axis, single value** → e.g. `Size: 100ml` shown as a static label.
- **Single axis, multiple values** → e.g. `Size: 50ml / 100ml`, each priced.
- **Multi-axis combinations** → e.g. electronics `Storage × Colour`, each existing
  combo priced individually.

## Goals

- Variants carry their own `price`, `mrp`, and in/out stock.
- Only the combinations that actually exist are defined (explicit variant rows,
  not a forced cartesian product — handles "512GB only in Black").
- Global `MARGIN` (×1.5) and `formatPrice` apply to variant prices identically.
- Product cards show "from KES X" (cheapest variant) when variants exist.
- A quantity stepper on the product page, independent of variants.

## Non-goals (deliberately deferred — YAGNI)

- **Counted stock** per variant. Stock is a boolean (`inStock`), matching
  `Product.inStock` today. Can upgrade to counts later without reworking the model.
- **Per-variant images.** Variants share the product's images for now.
- Promoting the size text currently in descriptions (`"Size: 100g"`) into a real
  option. Optional cleanup, not part of this work.

## Data model (additive, non-destructive)

`Product` keeps `price`/`mrp` as the default and gains an `options` JSON field
describing the axes. Variants live in a new table so they have stable ids that
the cart and orders can reference, and so counted stock is a clean future add.

```prisma
model Product {
  // ...existing fields (price, mrp, subtitle, images, category, etc.)...
  options  Json             @default("[]") // [{ name: "Storage", values: ["128GB","256GB"] }, ...]
  variants ProductVariant[]
}

model ProductVariant {
  id        String   @id @default(cuid())
  productId String
  options   Json     // the specific combo: { "Storage": "128GB", "Colour": "Black" }
  price     Float
  mrp       Float
  inStock   Boolean  @default(true)
  sku       String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  orderItems OrderItem[]
}
```

`OrderItem` gains an optional variant reference plus a durable label snapshot so
order history stays readable even if a variant is later edited or deleted:

```prisma
model OrderItem {
  // ...existing (orderId, productId, quantity, price)...
  variantId    String?
  variantLabel String? // snapshot, e.g. "128GB / Black"
  variant      ProductVariant? @relation(fields: [variantId], references: [id])
}
```

**Derived:** `hasVariants = variants.length > 0`.

## Pricing

- Product with variants → the **selected variant's** `price`/`mrp` is authoritative.
- `MARGIN` applies unchanged in the same two server places:
  - `GET /api/products` — apply to each variant's `price`/`mrp` before returning,
    and set the product's displayed `price` to the cheapest in-stock variant
    (for the "from KES X" card label).
  - `POST /api/orders` — charge the resolved variant's `price` (× MARGIN).
- Products without variants: unchanged.

## Product page (`ProductDetails`)

- Render one selector (button chips) per axis from `product.options`.
- Selecting all axes resolves to a `ProductVariant` by matching `options`.
  - Show that variant's price (× MARGIN) and stock; hide/adjust the mrp
    strikethrough per the existing `hasDiscount` rule.
  - Combos with no matching variant row are **disabled** ("Unavailable").
  - Single-value axis renders as a static label (auto-selected).
  - Default selection: first in-stock variant.
- **Quantity stepper** (reuse `Counter`) before Add-to-Cart; local `quantity`
  state defaults to 1.
- Add-to-Cart dispatches `{ productId, variantId, quantity }`.

## Cart (largest refactor)

Today: `cartItems: { [productId]: qty }` (a count map).

New shape, keyed by product **and** variant so each variant is its own line:

```js
cartItems: {
  "<productId>:<variantId|default>": { productId, variantId: string|null, quantity: number }
}
total: <sum of quantities>
```

Touch points:
- `lib/features/cart/cartSlice.js` — `addToCart` / `removeFromCart` /
  `deleteItemFromCart` / `updateCart` operate on the composite line key; accept
  `variantId` + `quantity`.
- `app/api/cart` — stores the cart JSON (shape is transparent to it); the
  `total` semantics are unchanged (sum of quantities).
- `app/(public)/cart/page.jsx` — iterate lines; resolve product + variant for
  name, variant label, price, image.
- `components/OrderSummary.jsx` — build `items` from the new line shape.
- **Old-shape carts** (test data) are normalized to the new shape (or reset) on load.

## Orders

- `POST /api/orders` receives items as `{ productId, variantId, quantity }`.
  For each item, load the product (with variants); if `variantId`, use that
  variant's `price` (× MARGIN) and stock; else fall back to product base price.
  Persist `variantId` + `variantLabel` on each `OrderItem`.
- Shipping (county-based) and coupon logic unchanged.
- Order history (`OrderItem.jsx`) shows `variantLabel` when present.

## Admin (add / edit product) — biggest new UI

- `app/store/add-product` gains a variant editor:
  1. Define axes (name + list of values).
  2. Add the specific combos that exist; for each: `price`, `mrp`, in/out.
  - No axes → base price only (current behaviour).
- `POST /api/store/product` accepts and persists `options` (JSON on Product) and
  `ProductVariant` rows. Validation: variant `options` keys must match defined axes.

## Backward compatibility & migration

- All schema changes are additive: `Product.options` (JSON default `[]`), new
  `ProductVariant` table, `OrderItem.variantId` / `variantLabel` (nullable).
- Existing 30 products have no options/variants → default-price path, unchanged.
- Applied over the pooled Neon connection with `CREATE TABLE IF NOT EXISTS` +
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (non-destructive), then
  `prisma generate`. No data rewrite.

## Phasing (each phase independently shippable)

1. **Schema + backend** — model, migration, `GET /api/products` returns
   options/variants and "from" price, `formatPrice`/MARGIN cover variants.
2. **Product page** — axis selectors, variant resolution, quantity stepper.
3. **Cart + checkout** — variant-aware cart shape, cart page, OrderSummary,
   `/api/orders` variant pricing, `OrderItem` fields.
4. **Admin variant editor** — define axes + priced combos; persist.

## Testing

- Unit: variant resolution from selected options; cheapest-in-stock selection;
  cart line keying (add/remove/delete distinct variants); price × MARGIN.
- Integration: order total with a variant + shipping + coupon; order records
  store variantId + label.
- Manual (argent/browser): product page selection across all three cases
  (none / single / multi), cart with two variants of one product, checkout.
- Backward-compat: a no-variant product still adds to cart and checks out.

## Taxonomy: departments, subcategories, brands (addendum 2026-09-14)

The store now sells both **cosmetics** and **electronics** from a **single
`Product` model** (a separate electronics model was rejected — it would
duplicate the entire cart/order/variant/pricing/admin pipeline for no gain;
the two types differ only in taxonomy + a few attributes, and the variant
system already covers both: cosmetics `Size`, electronics `Storage × Colour`).

Add to `Product`:
- **`department`** — enum `Department { COSMETICS, ELECTRONICS }`, default `COSMETICS`.
- **`brand`** — `String?` (e.g. "COSRX", "Samsung", "Apple").
- **`category`** (existing) becomes the **department-scoped subcategory**.

Taxonomy lives in one config, `lib/catalog.js`:
```js
export const DEPARTMENTS = {
  COSMETICS: {
    label: "Cosmetics",
    categories: ["Skincare","Masks","Fragrances","Sunscreen","Cleansers","Toners","Serums","Makeup","Haircare"],
    brands: ["COSRX","Innisfree","MISSHA","SKIN1004","AXIS-Y","AHC","Centellian24"],
  },
  ELECTRONICS: {
    label: "Electronics",
    categories: ["Mobile Phones","Smartwatches","Laptops","Tablets","Earbuds","Accessories"],
    brands: ["Apple","Samsung","Xiaomi","Oppo","Google"],
  },
};
```

Admin add/edit product cascade: **Department → Category (filtered) → Brand
(department dropdown + "Other" free text)**. Server validates `category`
belongs to `department`; `brand` is free (dropdown is a convenience).

Migration is additive: `department` enum column (default COSMETICS), `brand`
text nullable. Backfill: existing 30 products → `COSMETICS`, and `brand`
inferred from their names (COSRX / Innisfree / MISSHA / SKIN1004 / AXIS-Y /
AHC / Centellian24).

This taxonomy also unblocks a future **storefront browse/filter by
department / category / brand** (Phase 5, optional).

### Revised phases
1. Schema + backend (DONE) — variant model, `/api/products` from-price.
2. Product page — variant selectors + quantity stepper.
3. Cart + checkout — variant-aware cart line keying + `OrderItem` PK includes
   `variantId`; reconcile cart preview + `/api/orders` charge to the resolved
   variant price.
4. Admin editor + taxonomy — Department → Category → Brand cascade + variant
   editor; add `department`/`brand` schema + backfill.
5. (Optional) Storefront browse/filter by department/category/brand.

## Open questions resolved

- Stock granularity: **in/out** per variant (not counts).
- Variant images: **shared** with the product.
- Combination coverage: **explicit** variant rows (partial matrices allowed).
- Cosmetics vs electronics: **one Product model** + `department`/`brand` (no separate model).
- Brand input: **dropdown + "Other"** free text.
