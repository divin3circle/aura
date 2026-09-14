# Phase 4a — Editable Discounts + Taxonomy Foundation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add an admin-editable, per-product/per-variant customer discount (a final price, not margin-based) and the department/brand taxonomy — the data + display foundation the admin editor and storefront browse build on.

**Architecture:** New nullable `discountedPrice` on `Product` and `ProductVariant` = the final KES price a customer pays when a promo is set (no MARGIN applied). New `department` enum + `brand` on `Product`. `withDisplayPricing` stops applying the mrp strikethrough and instead exposes `price` (active) + `compareAtPrice` (struck-through) derived from discountedPrice. Taxonomy lives in `lib/catalog.js`.

**Tech Stack:** Next.js (JS), Prisma + Neon, Redux, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-14-product-variants-design.md`

## Global Constraints

- MARGIN is disabled (`=1`); prices are WYSIWYG. `applyMargin(x)` now effectively rounds. Do NOT re-introduce a multiplier.
- `discountedPrice` is a FINAL customer price (KES). When set and `< price`, it is the active/charged price; the regular `price` shows struck-through. It is NOT multiplied by anything.
- Additive, non-destructive DB changes over the pooled `DATABASE_URL` (`node --env-file=.env`). Escalate if a classifier blocks.
- Vitest: `process.env.MARGIN` unset (applyMargin rounds).
- Backward compatible: products without a discount behave exactly as now (single price, no strikethrough).

---

### Task 1: Schema — discountedPrice, department, brand

**Files:** Modify `prisma/schema.prisma`; temp migration script.

**Interfaces:** Produces `Product.discountedPrice Float?`, `Product.department Department` (enum COSMETICS|ELECTRONICS, default COSMETICS), `Product.brand String?`, `ProductVariant.discountedPrice Float?`.

- [ ] **Step 1:** In `prisma/schema.prisma`, add an enum:

```prisma
enum Department {
    COSMETICS
    ELECTRONICS
}
```

- [ ] **Step 2:** Add to `model Product` (after `subtitle`/`options`): `department Department @default(COSMETICS)`, `brand String?`, `discountedPrice Float?`. Add `discountedPrice Float?` to `model ProductVariant`.

- [ ] **Step 3:** Apply the migration — create `_tmp_phase4_schema.mjs`:

```js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const run = async (sql) => { await prisma.$executeRawUnsafe(sql); console.log("ok:", sql.slice(0,72)); };
try {
  await run(`DO $$ BEGIN CREATE TYPE "Department" AS ENUM ('COSMETICS','ELECTRONICS'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
  await run(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "department" "Department" NOT NULL DEFAULT 'COSMETICS'`);
  await run(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand" TEXT`);
  await run(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discountedPrice" DOUBLE PRECISION`);
  await run(`ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "discountedPrice" DOUBLE PRECISION`);
  const cols = await prisma.$queryRawUnsafe(`SELECT table_name, column_name FROM information_schema.columns WHERE (table_name='Product' AND column_name IN ('department','brand','discountedPrice')) OR (table_name='ProductVariant' AND column_name='discountedPrice') ORDER BY 1,2`);
  console.log(JSON.stringify(cols));
} catch(e){ console.error("ERR:", e.message); process.exit(1); } finally { await prisma.$disconnect(); }
```

Run `node --env-file=.env _tmp_phase4_schema.mjs` → expect the 4 columns listed. Then `npx prisma generate`, then `rm -f _tmp_phase4_schema.mjs`.

- [ ] **Step 4:** Commit `prisma/schema.prisma` — `feat: add discountedPrice, department, and brand to schema`.

---

### Task 2: Taxonomy config + backfill

**Files:** Create `lib/catalog.js`; temp backfill script.

**Interfaces:** Produces `DEPARTMENTS` config and department/brand values on the 30 cosmetics.

- [ ] **Step 1:** Create `lib/catalog.js`:

```js
// Department -> subcategories + suggested brands. Single source for the admin cascade + browse.
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

export const departmentKeys = Object.keys(DEPARTMENTS);
export const categoriesFor = (dept) => DEPARTMENTS[dept]?.categories ?? [];
export const brandsFor = (dept) => DEPARTMENTS[dept]?.brands ?? [];
```

- [ ] **Step 2:** Backfill — create `_tmp_backfill.mjs` that sets `department='COSMETICS'` for all existing products and infers `brand` from the product name (case-insensitive match against `["COSRX","Innisfree","MISSHA","SKIN1004","AXIS-Y","AHC","Centellian24"]`; leave null if none match). Print counts. Run with `node --env-file=.env`, then delete it.

```js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BRANDS = ["COSRX","Innisfree","MISSHA","SKIN1004","AXIS-Y","AHC","Centellian24"];
try {
  const products = await prisma.product.findMany();
  let n = 0;
  for (const p of products) {
    const hay = p.name.toLowerCase();
    const brand = BRANDS.find((b) => hay.includes(b.toLowerCase())) ?? null;
    await prisma.product.update({ where: { id: p.id }, data: { department: "COSMETICS", brand } });
    n++;
  }
  console.log("backfilled", n, "products");
} catch(e){ console.error(e.message); process.exit(1);} finally { await prisma.$disconnect(); }
```

- [ ] **Step 3:** Commit `lib/catalog.js` — `feat: add department/brand taxonomy config + backfill cosmetics`.

---

### Task 3: Discount pricing logic (display + checkout) + tests

**Files:** Modify `lib/variants.js`, `lib/variants.test.js`, `app/api/orders/route.js`. Verify `components/ProductCard.jsx` / `components/ProductDetails.jsx` reflect `compareAtPrice`.

**Interfaces:** `withDisplayPricing` now sets, per product and per variant: `price` = active (discountedPrice if set & lower, else regular) and `compareAtPrice` = the struck-through regular price (or null). No MARGIN multiplier beyond rounding.

- [ ] **Step 1: Add a failing test** in `lib/variants.test.js` for a new helper `activePricing(regular, discountedPrice)`:

```js
import { activePricing } from "@/lib/variants";
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
```

- [ ] **Step 2:** Implement in `lib/variants.js`:

```js
// Resolve the active price and the struck-through comparison price for display/charge.
export const activePricing = (regular, discountedPrice) => {
  const r = Math.round(Number(regular));
  const d = discountedPrice == null ? null : Math.round(Number(discountedPrice));
  return d != null && d < r
    ? { price: d, compareAtPrice: r }
    : { price: r, compareAtPrice: null };
};
```

- [ ] **Step 3:** Update `withDisplayPricing` (same file) so each variant and the product use `activePricing(base, discountedPrice)`, setting `price` + `compareAtPrice`; the product-level "from" uses the cheapest active in-stock variant. Update the existing `withDisplayPricing` tests to assert `compareAtPrice` (null when no discount). Remove any reliance on `applyMargin` doing more than rounding.

- [ ] **Step 4:** Update `components/ProductCard.jsx` and `components/ProductDetails.jsx` to show `compareAtPrice` struck-through when present (replacing the old `mrp`-based `hasDiscount`). ProductDetails: `hasDiscount = Boolean(activeCompareAt)`.

- [ ] **Step 5:** Update `app/api/orders/route.js` so the charged unit price is `activePricing(base, discountedPrice).price` for the resolved variant (or product) — i.e. honor `discountedPrice`. (base = variant/product `price`; discountedPrice = variant/product `discountedPrice`.)

- [ ] **Step 6:** `npm test` passes; build (dev-guarded). Commit — `feat: editable discountedPrice drives active price + strikethrough`.

---

## Self-Review
- discountedPrice (final, no margin) + department + brand schema → Task 1; config + backfill → Task 2; display/charge logic + strikethrough → Task 3. ✅
- No placeholders; full code/commands.
- Names consistent: `activePricing`, `withDisplayPricing`, `DEPARTMENTS`, `discountedPrice`.

## Notes
- Admin editor + per-product analytics/discount page = next plan (Phase 4b). Storefront browse = Phase 5.
