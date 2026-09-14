# Product Variants — Phase 3 (Product Page + Checkout) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let buyers pick a size/config + quantity on the product page and have checkout charge and record the exact chosen variant.

**Architecture:** `ProductDetails` renders one selector per `product.options` axis, resolves the selected combo to a `ProductVariant` (via `resolveVariant`), and shows that variant's price/stock; Add-to-Cart dispatches `{ productId, variantId, quantity }` into the Phase-2 variant-aware cart. `/api/orders` resolves each item's variant to charge the right price and stores `variantId` + a `variantLabel` snapshot. `OrderItem` moves from a composite PK to a surrogate `id` so two variants of one product can coexist in one order.

**Tech Stack:** Next.js App Router (JS), Prisma + Neon, Redux Toolkit.

**Spec:** `docs/superpowers/specs/2026-09-14-product-variants-design.md`

## Global Constraints

- Prices from `/api/products` are already margin-applied for **display**; the server re-derives the charge in `/api/orders` from the **base** price × MARGIN (`applyMargin`). Never double-apply.
- No-variant products keep working exactly as before (base price, no selectors).
- `variantId` is nullable throughout; a null means "no variant".
- DB changes go over the pooled `DATABASE_URL` (`node --env-file=.env`); additive/guarded SQL. The PK change is the one riskier migration — if a classifier blocks it, stop and escalate (don't force).
- Vitest: `process.env.MARGIN` unset under test.

---

### Task 1: Product page — variant selectors + quantity

**Files:**
- Modify: `components/ProductDetails.jsx` (replace the component)

**Interfaces:**
- Consumes: `resolveVariant`, `cheapestVariant`, `cartLineKey` from `@/lib/variants`; `addToCart` (payload `{productId, variantId, quantity}`) from the cart slice.
- Produces: buyer can select each axis, pick a quantity, and add the resolved variant to the cart.

- [ ] **Step 1: Replace `components/ProductDetails.jsx` with:**

```jsx
'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { formatPrice } from "@/lib/utils";
import { resolveVariant, cheapestVariant, cartLineKey } from "@/lib/variants";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";

const ProductDetails = ({ product }) => {
    const productId = product.id;
    const options = product.options || [];
    const variants = product.variants || [];
    const hasVariants = variants.length > 0;

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();
    const router = useRouter();

    const [mainImage, setMainImage] = useState(product.images[0]);
    const [selected, setSelected] = useState(() => (hasVariants ? (cheapestVariant(variants)?.options ?? {}) : {}));
    const [quantity, setQuantity] = useState(1);

    const selectedVariant = hasVariants ? resolveVariant(variants, selected) : null;
    const activePrice = selectedVariant ? selectedVariant.price : product.price;
    const activeMrp = selectedVariant ? selectedVariant.mrp : product.mrp;
    const inStock = selectedVariant ? selectedVariant.inStock : product.inStock;
    const hasDiscount = activeMrp > activePrice;

    const variantId = selectedVariant?.id ?? null;
    const inCart = Boolean(cart[cartLineKey(productId, variantId)]);
    const canAdd = inStock && (!hasVariants || Boolean(selectedVariant));

    const isValue = (axis, value) => {
        const v = resolveVariant(variants, { ...selected, [axis]: value });
        return { exists: Boolean(v), inStock: Boolean(v?.inStock) };
    };

    const averageRating = product.rating.length
        ? product.rating.reduce((acc, item) => acc + item.rating, 0) / product.rating.length
        : 0;

    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {product.images.map((image, index) => (
                        <div key={index} onClick={() => setMainImage(product.images[index])} className={`relative size-26 rounded-lg overflow-hidden ring-1 cursor-pointer group ${mainImage === image ? 'ring-slate-800' : 'ring-black/5'}`}>
                            <Image src={image} fill sizes="104px" className="object-cover group-hover:scale-105 group-active:scale-95 transition" alt={product.name} />
                        </div>
                    ))}
                </div>
                <div className="relative h-100 sm:size-113 rounded-lg overflow-hidden ring-1 ring-black/5">
                    <Image src={mainImage} alt={product.name} fill sizes="(max-width: 640px) 100vw, 452px" className="object-cover" />
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-semibold text-slate-800">{product.name}</h1>
                <div className='flex items-center mt-2'>
                    {Array(5).fill('').map((_, index) => (
                        <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={averageRating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                    ))}
                    <p className="text-sm ml-3 text-slate-500">{product.rating.length} Reviews</p>
                </div>
                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p>{formatPrice(activePrice)}</p>
                    {hasDiscount && (
                        <p className="text-xl text-slate-500 line-through">{formatPrice(activeMrp)}</p>
                    )}
                </div>
                {hasDiscount && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <TagIcon size={14} />
                        <p>Save {((activeMrp - activePrice) / activeMrp * 100).toFixed(0)}% right now</p>
                    </div>
                )}

                {options.map((opt) => (
                    <div key={opt.name} className="mt-6">
                        <p className="text-sm font-medium text-slate-700 mb-2">{opt.name}</p>
                        <div className="flex flex-wrap gap-2">
                            {opt.values.map((value) => {
                                const { exists, inStock: vInStock } = isValue(opt.name, value);
                                const isSelected = selected[opt.name] === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        disabled={!exists}
                                        onClick={() => setSelected({ ...selected, [opt.name]: value })}
                                        className={`px-4 py-2 rounded border text-sm transition ${isSelected ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-500'} ${!exists ? 'opacity-40 cursor-not-allowed line-through' : ''} ${exists && !vInStock ? 'opacity-60' : ''}`}
                                    >
                                        {value}{exists && !vInStock ? ' (out of stock)' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div className="flex items-end gap-5 mt-8">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-slate-700">Quantity</p>
                        <div className="inline-flex items-center gap-3 px-3 py-2 rounded border border-slate-200 text-slate-600">
                            <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-1 select-none"><MinusIcon size={16} /></button>
                            <p className="w-6 text-center">{quantity}</p>
                            <button type="button" onClick={() => setQuantity(q => q + 1)} className="p-1 select-none"><PlusIcon size={16} /></button>
                        </div>
                    </div>
                    <button
                        onClick={() => inCart ? router.push('/cart') : dispatch(addToCart({ productId, variantId, quantity }))}
                        disabled={!inCart && !canAdd}
                        className="bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {inCart ? 'View Cart' : (canAdd ? 'Add to Cart' : 'Unavailable')}
                    </button>
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <EarthIcon className="text-slate-400" /> Fast delivery across Kenya </p>
                    <p className="flex gap-3"> <CreditCardIcon className="text-slate-400" /> Secure payment via Paystack </p>
                    <p className="flex gap-3"> <UserIcon className="text-slate-400" /> Authentic Korean brands </p>
                </div>
            </div>
        </div>
    )
}

export default ProductDetails
```

- [ ] **Step 2: Verify build (dev-server-guarded)**

Run: `lsof -ti:3000` — if empty, `npm run build` → "Compiled successfully"; if a PID prints, skip and note it. Then `npm test` → all pass (no new tests; this is UI).

- [ ] **Step 3: Commit**

```bash
git add components/ProductDetails.jsx
git commit -m "feat: variant selectors + quantity picker on product page"
```

---

### Task 2: `OrderItem` surrogate-id PK migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create (temp, delete after): `_tmp_orderitem_pk.mjs`

**Interfaces:**
- Produces: `OrderItem` has a surrogate `id String @id @default(cuid())` (composite `@@id([orderId, productId])` removed), so multiple variants of one product can be separate order items.

- [ ] **Step 1: Edit `prisma/schema.prisma` `OrderItem` model** — add an `id` PK and remove the composite id:

Change the model to:

```prisma
model OrderItem {
    id           String  @id @default(cuid())
    orderId      String
    productId    String
    quantity     Int
    price        Float
    variantId    String?
    variantLabel String?

    order   Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
    product Product         @relation(fields: [productId], references: [id])
    variant ProductVariant? @relation(fields: [variantId], references: [id])
}
```

(Remove the `@@id([orderId, productId])` line.)

- [ ] **Step 2: Apply the migration** — create `_tmp_orderitem_pk.mjs`:

```js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const run = async (sql) => { await prisma.$executeRawUnsafe(sql); console.log("ok:", sql.slice(0, 70)); };
try {
  await run(`ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "id" TEXT`);
  await run(`UPDATE "OrderItem" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL`);
  await run(`ALTER TABLE "OrderItem" ALTER COLUMN "id" SET NOT NULL`);
  await run(`ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_pkey"`);
  await run(`ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")`);
  const pk = await prisma.$queryRawUnsafe(`SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) WHERE i.indrelid='"OrderItem"'::regclass AND i.indisprimary`);
  console.log("PK columns:", JSON.stringify(pk));
} catch (e) { console.error("ERR:", e.message); process.exit(1); }
finally { await prisma.$disconnect(); }
```

Run: `node --env-file=.env _tmp_orderitem_pk.mjs`
Expected: each `ok:` line prints; final `PK columns: [{"attname":"id"}]`.
Note: additive except the PK swap on 5 existing rows (non-destructive — rows keep all data, just gain an `id`). If a sandbox classifier blocks it, STOP, report BLOCKED with the error, and ask the controller (do not force).

- [ ] **Step 3:** `npx prisma generate` → "Generated Prisma Client". Then `rm -f _tmp_orderitem_pk.mjs`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: give OrderItem a surrogate id PK for per-variant order lines"
```

---

### Task 3: `/api/orders` — charge + record the chosen variant

**Files:**
- Modify: `app/api/orders/route.js`

**Interfaces:**
- Consumes: items as `{ id: productId, variantId, quantity }`; `applyMargin`, `variantLabel` from lib.
- Produces: each order line charged at the resolved variant's base price × MARGIN, and persisted with `variantId` + `variantLabel`.

- [ ] **Step 1: Update the item→store loop in `app/api/orders/route.js`**

Add the import:

```js
import { applyMargin, shippingFor } from "@/lib/pricing";
import { variantLabel } from "@/lib/variants";
```

Replace the loop that builds `ordersByStore` (currently loads the product and pushes `{ ...item, price: applyMargin(product.price) }`) with one that resolves the variant:

```js
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        include: { variants: true },
      });
      const storeId = product.storeId;
      const variant = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : null;
      const unitBase = variant ? variant.price : product.price;
      const label = variant ? variantLabel(variant, product.options) : null;

      if (!ordersByStore.has(storeId)) ordersByStore.set(storeId, []);
      ordersByStore.get(storeId).push({
        ...item,
        price: applyMargin(unitBase),
        variantId: variant ? variant.id : null,
        variantLabel: label,
      });
    }
```

- [ ] **Step 2: Persist the variant fields on each order item**

In the `prisma.order.create` call, update the nested `orderItems.create` map:

```js
          orderItems: {
            create: sellerItems.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
              variantId: item.variantId ?? null,
              variantLabel: item.variantLabel ?? null,
            })),
          },
```

- [ ] **Step 3: Verify build (dev-server-guarded)** — `lsof -ti:3000`; build if free else skip. `npm test` passes.

- [ ] **Step 4: Commit**

```bash
git add app/api/orders/route.js
git commit -m "feat: charge and record the chosen variant at checkout"
```

---

### Task 4: Order history shows the variant label

**Files:**
- Modify: `components/OrderItem.jsx`

**Interfaces:**
- Consumes: `item.variantLabel` on stored order items.
- Produces: the ordered size/config shows under the product name in order history.

- [ ] **Step 1: Render the label** — in `components/OrderItem.jsx`, in the block that renders `item.product.name`, add directly beneath it:

```jsx
                  {item.variantLabel && (
                    <p className="text-xs text-slate-500">{item.variantLabel}</p>
                  )}
```

- [ ] **Step 2: Verify** — `lsof -ti:3000`; build if free else skip. `npm test` passes.

- [ ] **Step 3: Commit**

```bash
git add components/OrderItem.jsx
git commit -m "feat: show variant label in order history"
```

---

## Self-Review

**Spec coverage (Phase 3):** product-page selectors + quantity (Task 1); `/api/orders` variant pricing + persistence (Task 3); `OrderItem` PK carry-forward fix (Task 2); order-history label (Task 4). ✅

**Placeholder scan:** none — full code/commands throughout.

**Type consistency:** `resolveVariant`/`cheapestVariant`/`cartLineKey`/`variantLabel` match Phase 1/2 exports. `addToCart({productId, variantId, quantity})` matches the Phase 2 reducer. Items `{ id, variantId, quantity }` match what the cart page sends (Phase 2). `OrderItem.variantId`/`variantLabel` columns exist from Phase 1.

## Notes
- Task 2 is the one non-trivial migration (PK swap on 5 test rows). It is non-destructive but touches existing rows; escalate if blocked.
- Reconciliation of the "from" price vs charged price (Phase 1 carry-forward) is resolved here: the product page charges the *selected* variant, and the cart already uses per-variant prices (Phase 2).
