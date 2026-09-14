# Product Variants — Phase 1 (Schema + Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the variant data model and make `GET /api/products` return margin-applied variants plus a "from" price, without changing any customer-facing flow yet.

**Architecture:** Options+Variants model — `Product` keeps its base `price`/`mrp` as the default and gains a JSON `options` field (axis definitions); a new `ProductVariant` table holds the priced combos. All variant/pricing logic lives in a new pure module `lib/variants.js` (unit-tested); the API route is a thin wrapper. Schema changes are additive and applied over the pooled Neon connection.

**Tech Stack:** Next.js App Router (JS), Prisma 5.9 + Neon Postgres, Redux Toolkit (later phases), Vitest (new, for pure-logic tests).

**Spec:** `docs/superpowers/specs/2026-09-14-product-variants-design.md`

## Global Constraints

- **Currency:** KES. Prices are whole numbers for display; `MARGIN` (default `1.5`, read from env) is applied via `applyMargin` from `lib/pricing.js`. Never bake MARGIN into stored data.
- **Backward compatibility:** products with no variants MUST behave exactly as today (base `price`/`mrp`). The 30 existing cosmetics have no variants.
- **DB changes:** additive only (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`). No data rewrites. Apply over the **pooled** `DATABASE_URL` (the direct URL is unreachable); run node scripts with `node --env-file=.env`.
- **Prisma:** after any `schema.prisma` change, run `npx prisma generate`.
- **Stock is boolean** (`inStock`) per variant. No counted inventory. No per-variant images.

---

### Task 1: Vitest setup + `cheapestVariant` helper

**Files:**
- Modify: `package.json` (devDeps + `test` script)
- Create: `vitest.config.js`
- Create: `lib/variants.js`
- Test: `lib/variants.test.js`

**Interfaces:**
- Consumes: `applyMargin` from `lib/pricing.js` (later tasks; not needed here).
- Produces: `cheapestVariant(variants) -> variant | null` — the lowest-`price` in-stock variant; falls back to lowest-price overall if none in stock; `null` if the array is empty.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^2`
Expected: `vitest` added to `devDependencies`.

- [ ] **Step 2: Add the test script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.js`** (so the `@/` alias resolves)

```js
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd()) },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `lib/variants.test.js`:

```js
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
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `cheapestVariant` is not exported / module not found.

- [ ] **Step 6: Implement the helper**

Create `lib/variants.js`:

```js
// Cheapest in-stock variant; falls back to cheapest overall; null if empty.
export const cheapestVariant = (variants = []) => {
  if (!variants.length) return null;
  const inStock = variants.filter((v) => v.inStock);
  const pool = inStock.length ? inStock : variants;
  return pool.reduce((min, v) => (v.price < min.price ? v : min), pool[0]);
};
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.js lib/variants.js lib/variants.test.js
git commit -m "test: add vitest + cheapestVariant helper for product variants"
```

---

### Task 2: `resolveVariant` + `variantLabel` helpers

**Files:**
- Modify: `lib/variants.js`
- Test: `lib/variants.test.js`

**Interfaces:**
- Produces:
  - `resolveVariant(variants, selected) -> variant | null` — the variant whose `options` match every key/value in `selected` (e.g. `{ Storage: "128GB", Colour: "Black" }`); `null` if no match.
  - `variantLabel(variant, options) -> string` — human label like `"128GB / Black"`, ordered by the product's `options` definition (`[{ name, values }]`).

- [ ] **Step 1: Write the failing tests**

Append to `lib/variants.test.js`:

```js
import { resolveVariant, variantLabel } from "@/lib/variants";

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `resolveVariant` / `variantLabel` not exported.

- [ ] **Step 3: Implement the helpers**

Append to `lib/variants.js`:

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/variants.js lib/variants.test.js
git commit -m "feat: add resolveVariant + variantLabel helpers"
```

---

### Task 3: `withDisplayPricing` transform

**Files:**
- Modify: `lib/variants.js`
- Test: `lib/variants.test.js`

**Interfaces:**
- Consumes: `applyMargin`, `cheapestVariant`.
- Produces: `withDisplayPricing(product) -> product` — returns a copy with MARGIN applied. No variants → `price`/`mrp` are margin-applied (today's behaviour). Has variants → each variant's `price`/`mrp` are margin-applied and the product's `price`/`mrp` are set to the cheapest in-stock variant (the "from" price), and a `hasVariants: true` flag is added.

Note on MARGIN in tests: `applyMargin` reads `process.env.MARGIN` at import; Vitest does not load `.env`, so `MARGIN` is unset and `applyMargin(x) === Math.round(x)`. Tests assert against ×1 rounding.

- [ ] **Step 1: Write the failing tests**

Append to `lib/variants.test.js`:

```js
import { withDisplayPricing } from "@/lib/variants";

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `withDisplayPricing` not exported.

- [ ] **Step 3: Implement the transform**

Add the import at the top of `lib/variants.js`:

```js
import { applyMargin } from "@/lib/pricing";
```

Append:

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/variants.js lib/variants.test.js
git commit -m "feat: add withDisplayPricing transform for variant catalogues"
```

---

### Task 4: Schema + additive migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create (temporary, deleted at end): `_tmp_variants_migration.mjs`

**Interfaces:**
- Produces: DB has a `ProductVariant` table, `Product."options"` JSONB column, and `OrderItem."variantId"` / `"variantLabel"` columns. Prisma client regenerated with `product.variants`, `product.options`, `orderItem.variant`.

- [ ] **Step 1: Edit `prisma/schema.prisma` — add `options` + `variants` to `Product`**

In `model Product`, after the `subtitle` line, add:

```prisma
    options  Json             @default("[]")
```

And in the relations area of `model Product` (next to `Product Product[]` etc.), add:

```prisma
    variants ProductVariant[]
```

- [ ] **Step 2: Add the `ProductVariant` model**

After the `Product` model, add:

```prisma
model ProductVariant {
    id        String   @id @default(cuid())
    productId String
    options   Json
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

- [ ] **Step 3: Add variant fields to `OrderItem`**

In `model OrderItem`, add the scalar fields and relation:

```prisma
    variantId    String?
    variantLabel String?
    variant      ProductVariant? @relation(fields: [variantId], references: [id])
```

- [ ] **Step 4: Apply the additive migration over the pooled connection**

Create `_tmp_variants_migration.mjs`:

```js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const run = async (sql) => { await prisma.$executeRawUnsafe(sql); console.log("ok:", sql.slice(0, 64)); };
try {
  await run(`CREATE TABLE IF NOT EXISTS "ProductVariant" (
    "id" TEXT PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "sku" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "options" JSONB NOT NULL DEFAULT '[]'`);
  await run(`ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantId" TEXT`);
  await run(`ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantLabel" TEXT`);
  await run(`DO $$ BEGIN
    ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null; END $$`);
  await run(`DO $$ BEGIN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON UPDATE CASCADE ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN null; END $$`);
  const cols = await prisma.$queryRawUnsafe(`SELECT table_name, column_name FROM information_schema.columns WHERE (table_name='Product' AND column_name='options') OR (table_name='OrderItem' AND column_name IN ('variantId','variantLabel')) OR table_name='ProductVariant' ORDER BY table_name, column_name`);
  console.log(JSON.stringify(cols));
} catch (e) { console.error("ERR:", e.message); process.exit(1); }
finally { await prisma.$disconnect(); }
```

Run: `node --env-file=.env _tmp_variants_migration.mjs`
Expected: each `ok:` line prints, and the final JSON lists the new `ProductVariant` columns + `Product.options` + `OrderItem.variantId/variantLabel`.

Note: this is additive/non-destructive. If a sandbox classifier blocks it, stop and ask the user to approve (or to run it themselves via `! node --env-file=.env _tmp_variants_migration.mjs`).

- [ ] **Step 5: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client".

- [ ] **Step 6: Delete the temp migration script**

Run: `rm -f _tmp_variants_migration.mjs`

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add ProductVariant model + product.options + orderItem variant fields"
```

---

### Task 5: `GET /api/products` returns variants + "from" pricing

**Files:**
- Modify: `app/api/products/route.js`
- Create (temporary, deleted at end): `_tmp_verify_products.mjs`

**Interfaces:**
- Consumes: `withDisplayPricing` from `lib/variants.js`.
- Produces: `GET /api/products` returns each product with a `variants` array (margin-applied) and, for products with variants, a `price`/`mrp` equal to the cheapest in-stock variant. Products without variants are unchanged.

- [ ] **Step 1: Replace the inline margin map with `withDisplayPricing` and include variants**

In `app/api/products/route.js`:

Change the import line:

```js
import { applyMargin } from "@/lib/pricing";
```

to:

```js
import { withDisplayPricing } from "@/lib/variants";
```

Add `variants: true` to the `include` object (alongside `rating` and `store`):

```js
      include: {
        rating: {
          select: {
            createdAt: true,
            rating: true,
            review: true,
            user: { select: { name: true, image: true } },
          },
        },
        store: true,
        variants: true,
      },
```

Replace the `.map(...)` that applied margin:

```js
    products = products
      .filter((product) => product.store.isActive)
      .map((product) => ({
        ...product,
        mrp: applyMargin(product.mrp),
        price: applyMargin(product.price),
      }));
```

with:

```js
    products = products
      .filter((product) => product.store.isActive)
      .map(withDisplayPricing);
```

- [ ] **Step 2: Verify the transform against real data**

Create `_tmp_verify_products.mjs`:

```js
import { PrismaClient } from "@prisma/client";
import { withDisplayPricing } from "./lib/variants.js";
const prisma = new PrismaClient();
try {
  const products = await prisma.product.findMany({
    where: { inStock: true },
    include: { store: true, variants: true },
    take: 3,
  });
  for (const p of products.map(withDisplayPricing)) {
    console.log(p.name, "| price:", p.price, "| hasVariants:", !!p.hasVariants, "| variants:", p.variants?.length ?? 0);
  }
} catch (e) { console.error("ERR:", e.message); process.exit(1); }
finally { await prisma.$disconnect(); }
```

Run: `node --env-file=.env _tmp_verify_products.mjs`
Expected: prints 3 products; existing (no-variant) products show `hasVariants: false` and a margin-applied price (base × MARGIN). No crash.

- [ ] **Step 3: Delete the temp verify script**

Run: `rm -f _tmp_verify_products.mjs`

- [ ] **Step 4: Confirm the build compiles (into a throwaway dir so the dev cache is untouched)**

Run: `npx next build --distDir .next-verify && rm -rf .next-verify`
Expected: "Compiled successfully".

- [ ] **Step 5: Commit**

```bash
git add app/api/products/route.js
git commit -m "feat: return margin-applied variants + from-price in /api/products"
```

---

## Self-Review

**Spec coverage (Phase 1 scope):**
- Data model (options JSON + ProductVariant table + OrderItem fields) → Task 4. ✅
- MARGIN applies to variant prices → Task 3 (`withDisplayPricing`), used in Task 5. ✅
- "from KES X" cheapest-variant price on cards → Task 1 (`cheapestVariant`) + Task 3 + Task 5. ✅
- Variant resolution + label helpers (needed by later phases; built + tested now) → Task 2. ✅
- Backward compatibility (no-variant products unchanged) → Task 3 test + Task 5 verify. ✅
- Later phases (product page, cart/checkout, admin) are intentionally **out of Phase 1 scope**.

**Placeholder scan:** none — all steps contain runnable code/commands.

**Type consistency:** `cheapestVariant`, `resolveVariant`, `variantLabel`, `withDisplayPricing` are named identically across the interfaces blocks, tests, and usage in Task 5. Variant shape (`{ id, productId, options, price, mrp, inStock }`) matches the schema in Task 4.

## Notes

- Vitest is introduced only for pure-logic tests in `lib/`. It does not touch the app runtime.
- Schema/migration and the route wiring are glue code verified by scripts + build rather than unit tests (no Next route-handler test harness in this project).
