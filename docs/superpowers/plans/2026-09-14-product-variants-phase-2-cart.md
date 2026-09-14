# Product Variants — Phase 2 (Variant-Aware Cart) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the cart key items by product **and** variant (so two sizes of one product are separate lines) and carry an explicit quantity, without changing checkout behaviour yet.

**Architecture:** The cart line key becomes `productId` (no variant) or `productId::variantId` (with variant) via a pure `cartLineKey` helper. `cartItems` changes from `{ [productId]: qty }` to `{ [lineKey]: { productId, variantId, quantity } }`. Reducers are pure → unit-tested with Vitest. The cart page, `Counter`, and `OrderSummary` are rewired to the new shape and resolve per-variant price/label from the product's `variants` returned by `/api/products`.

**Tech Stack:** Next.js App Router (JS), Redux Toolkit, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-14-product-variants-design.md`

## Global Constraints

- **Backward compatibility:** old-shape carts (`{ [productId]: number }`) already in the DB must normalize to the new shape on load without error. No-variant items keep the plain `productId` as their line key.
- **Pricing:** the cart reads the **margin-applied** prices returned by `GET /api/products` (product.price for no-variant lines; the matching `variant.price` for variant lines). Never re-apply MARGIN in the client.
- **`variantId` is nullable** everywhere — a line with `variantId: null` is a normal no-variant product.
- **Vitest:** `process.env.MARGIN` is unset under test.

---

### Task 1: `cartLineKey` helper

**Files:**
- Modify: `lib/variants.js`
- Test: `lib/variants.test.js`

**Interfaces:**
- Produces: `cartLineKey(productId, variantId) -> string` — returns `productId` when `variantId` is null/undefined, else `` `${productId}::${variantId}` ``.

- [ ] **Step 1: Write the failing tests** — append to `lib/variants.test.js`:

```js
import { cartLineKey } from "@/lib/variants";

describe("cartLineKey", () => {
  it("is just the productId when there is no variant", () => {
    expect(cartLineKey("prod1", null)).toBe("prod1");
    expect(cartLineKey("prod1")).toBe("prod1");
  });
  it("joins product and variant when a variant is given", () => {
    expect(cartLineKey("prod1", "var9")).toBe("prod1::var9");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL (`cartLineKey` not exported).

- [ ] **Step 3: Implement** — append to `lib/variants.js`:

```js
// Cart line identity: plain productId, or productId::variantId when a variant is chosen.
export const cartLineKey = (productId, variantId) =>
  variantId ? `${productId}::${variantId}` : productId;
```

- [ ] **Step 4: Run to verify it passes** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/variants.js lib/variants.test.js
git commit -m "feat: add cartLineKey helper for variant-aware cart lines"
```

---

### Task 2: Variant-aware `cartSlice` reducers + normalization

**Files:**
- Modify: `lib/features/cart/cartSlice.js`
- Test: `lib/features/cart/cartSlice.test.js` (create)

**Interfaces:**
- Consumes: `cartLineKey` from `@/lib/variants`.
- Produces: reducer actions with new payloads:
  - `addToCart({ productId, variantId?, quantity? })` — default `variantId=null`, `quantity=1`; increments the line's quantity if it exists.
  - `removeFromCart({ productId, variantId? })` — decrements by 1; deletes the line at 0.
  - `deleteItemFromCart({ productId, variantId? })` — removes the whole line.
  - `clearCart()`.
  - `fetchCart.fulfilled` normalizes both old (`{id: number}`) and new (`{key: {productId,variantId,quantity}}`) shapes; `state.total` is the summed quantities.
  - State shape: `{ total: number, cartItems: { [lineKey]: { productId, variantId, quantity } } }`.

- [ ] **Step 1: Write the failing tests** — create `lib/features/cart/cartSlice.test.js`:

```js
import { describe, it, expect } from "vitest";
import reducer, {
  addToCart, removeFromCart, deleteItemFromCart, clearCart, fetchCart,
} from "./cartSlice";

const empty = { total: 0, cartItems: {} };

describe("cartSlice reducers", () => {
  it("adds a no-variant line under the plain productId", () => {
    const s = reducer(empty, addToCart({ productId: "p1" }));
    expect(s.cartItems.p1).toEqual({ productId: "p1", variantId: null, quantity: 1 });
    expect(s.total).toBe(1);
  });

  it("keeps two variants of one product as separate lines", () => {
    let s = reducer(empty, addToCart({ productId: "p1", variantId: "a", quantity: 2 }));
    s = reducer(s, addToCart({ productId: "p1", variantId: "b" }));
    expect(s.cartItems["p1::a"].quantity).toBe(2);
    expect(s.cartItems["p1::b"].quantity).toBe(1);
    expect(s.total).toBe(3);
  });

  it("increments an existing line", () => {
    let s = reducer(empty, addToCart({ productId: "p1", variantId: "a" }));
    s = reducer(s, addToCart({ productId: "p1", variantId: "a", quantity: 3 }));
    expect(s.cartItems["p1::a"].quantity).toBe(4);
    expect(s.total).toBe(4);
  });

  it("removeFromCart decrements then deletes at zero", () => {
    let s = reducer(empty, addToCart({ productId: "p1", quantity: 2 }));
    s = reducer(s, removeFromCart({ productId: "p1" }));
    expect(s.cartItems.p1.quantity).toBe(1);
    s = reducer(s, removeFromCart({ productId: "p1" }));
    expect(s.cartItems.p1).toBeUndefined();
    expect(s.total).toBe(0);
  });

  it("deleteItemFromCart removes the whole line and adjusts total", () => {
    let s = reducer(empty, addToCart({ productId: "p1", quantity: 3 }));
    s = reducer(s, deleteItemFromCart({ productId: "p1" }));
    expect(s.cartItems.p1).toBeUndefined();
    expect(s.total).toBe(0);
  });

  it("normalizes an old-shape cart on fetch", () => {
    const s = reducer(empty, { type: fetchCart.fulfilled.type, payload: { cartItems: { p1: 2, p2: 1 } } });
    expect(s.cartItems.p1).toEqual({ productId: "p1", variantId: null, quantity: 2 });
    expect(s.total).toBe(3);
  });

  it("passes through a new-shape cart on fetch", () => {
    const payload = { cartItems: { "p1::a": { productId: "p1", variantId: "a", quantity: 2 } } };
    const s = reducer(empty, { type: fetchCart.fulfilled.type, payload });
    expect(s.cartItems["p1::a"].quantity).toBe(2);
    expect(s.total).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — rewrite the reducers block in `lib/features/cart/cartSlice.js`. Keep the existing `fetchCart` and `updateCart` thunks unchanged; add the import and replace the `reducers` and the `fetchCart.fulfilled` extraReducer:

```js
import { cartLineKey } from "@/lib/variants";
```

Reducers:

```js
  reducers: {
    addToCart: (state, action) => {
      const { productId, variantId = null, quantity = 1 } = action.payload;
      const key = cartLineKey(productId, variantId);
      if (state.cartItems[key]) {
        state.cartItems[key].quantity += quantity;
      } else {
        state.cartItems[key] = { productId, variantId, quantity };
      }
      state.total += quantity;
    },
    removeFromCart: (state, action) => {
      const { productId, variantId = null } = action.payload;
      const key = cartLineKey(productId, variantId);
      const line = state.cartItems[key];
      if (!line) return;
      line.quantity -= 1;
      state.total -= 1;
      if (line.quantity <= 0) delete state.cartItems[key];
    },
    deleteItemFromCart: (state, action) => {
      const { productId, variantId = null } = action.payload;
      const key = cartLineKey(productId, variantId);
      const line = state.cartItems[key];
      if (!line) return;
      state.total -= line.quantity;
      delete state.cartItems[key];
    },
    clearCart: (state) => {
      state.cartItems = {};
      state.total = 0;
    },
  },
```

`fetchCart.fulfilled` (normalization):

```js
    builder.addCase(fetchCart.fulfilled, (state, action) => {
      const cart = action.payload || {};
      const raw = cart.cartItems || {};
      const normalized = {};
      let total = 0;
      for (const [key, val] of Object.entries(raw)) {
        if (typeof val === "number") {
          normalized[key] = { productId: key, variantId: null, quantity: val };
          total += val;
        } else if (val && typeof val === "object") {
          const quantity = val.quantity || 0;
          normalized[key] = {
            productId: val.productId,
            variantId: val.variantId ?? null,
            quantity,
          };
          total += quantity;
        }
      }
      state.cartItems = normalized;
      state.total = total;
    });
```

- [ ] **Step 4: Run to verify it passes** — `npm test` → PASS (all cart + variant tests).

- [ ] **Step 5: Commit**

```bash
git add lib/features/cart/cartSlice.js lib/features/cart/cartSlice.test.js
git commit -m "feat: variant-aware cart reducers with old-shape normalization"
```

---

### Task 3: Rewire Counter, cart page, and OrderSummary to variant lines

**Files:**
- Modify: `components/Counter.jsx`
- Modify: `app/(public)/cart/page.jsx`
- Modify: `components/OrderSummary.jsx`

**Interfaces:**
- Consumes: `cartLineKey`, `variantLabel` from `@/lib/variants`; the new `cartItems` line shape; product `variants`/`options` from `/api/products`.
- Produces: cart lines render per-variant price + a size/label; `OrderSummary` receives `items` as `[{ id: productId, variantId, quantity }]`.

- [ ] **Step 1: Update `Counter` to be variant-aware**

Replace `components/Counter.jsx` entirely with:

```jsx
'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { cartLineKey } from "@/lib/variants";
import { useDispatch, useSelector } from "react-redux";

const Counter = ({ productId, variantId = null }) => {
    const { cartItems } = useSelector(state => state.cart);
    const dispatch = useDispatch();
    const key = cartLineKey(productId, variantId);
    const quantity = cartItems[key]?.quantity ?? 0;

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={() => dispatch(removeFromCart({ productId, variantId }))} className="p-1 select-none">-</button>
            <p className="p-1">{quantity}</p>
            <button onClick={() => dispatch(addToCart({ productId, variantId }))} className="p-1 select-none">+</button>
        </div>
    )
}

export default Counter
```

- [ ] **Step 2: Update the cart page** (`app/(public)/cart/page.jsx`)

Change `createCartArray` to iterate the new line shape, resolve the variant, and compute per-line price + label. Import helpers:

```js
import { cartLineKey, variantLabel } from "@/lib/variants";
```

Replace `createCartArray` with:

```js
  const createCartArray = () => {
    let total = 0;
    const arr = [];
    for (const [key, line] of Object.entries(cartItems)) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) continue;
      const variant = line.variantId
        ? (product.variants || []).find((v) => v.id === line.variantId)
        : null;
      const unitPrice = variant ? variant.price : product.price;
      const label = variant ? variantLabel(variant, product.options) : "";
      arr.push({
        key,
        product,
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice,
        label,
      });
      total += unitPrice * line.quantity;
    }
    setCartArray(arr);
    setTotalPrice(total);
  };
```

In the row rendering, use the new fields:
- image: `item.product.images[0]`, name: `item.product.name`, plus show `item.label` (e.g. under the name) when present.
- unit price cell: `formatPrice(item.unitPrice)`.
- `<Counter productId={item.productId} variantId={item.variantId} />`.
- line total cell: `formatPrice(item.unitPrice * item.quantity)`.
- delete button: `handleDeleteItemFromCart(item.productId, item.variantId)` and update the handler:

```js
  const handleDeleteItemFromCart = (productId, variantId) => {
    dispatch(deleteItemFromCart({ productId, variantId }));
  };
```

Build the `items` passed to `OrderSummary` from the new shape:

```js
      items={cartArray.map((i) => ({ id: i.productId, variantId: i.variantId, quantity: i.quantity }))}
```

(Keep passing `totalPrice={totalPrice}`.)

- [ ] **Step 3: Update `OrderSummary` items handling**

`OrderSummary` already receives `items` and forwards them to `/api/orders` in `handlePlaceOrder` (as `items: items`). No structural change needed beyond confirming it passes the new `items` array through unchanged (each element `{ id, variantId, quantity }`). Leave the order request shape as `items` — the orders route consumes `variantId` in Phase 3. No edit required unless it references `item.` fields directly; if it does, keep `id`/`quantity` semantics.

- [ ] **Step 4: Verify the build (dev-server-guarded)**

Run: `lsof -ti:3000`
- If nothing: `npm run build` → expect "Compiled successfully".
- If a PID prints: skip the build (dev server live); rely on unit tests + note it.

Also run `npm test` → all cart + variant tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/Counter.jsx "app/(public)/cart/page.jsx" components/OrderSummary.jsx
git commit -m "feat: variant-aware cart UI (counter, cart page, order summary)"
```

---

## Self-Review

**Spec coverage (Phase 2 scope):** cart keyed by product+variant (Task 1+2), quantity carried per line (Task 2), old-cart normalization (Task 2), UI renders per-variant price+label (Task 3). Product-page selectors and `/api/orders` variant pricing are Phase 3. ✅

**Placeholder scan:** none. (Task 3 Step 1 has an intentional inline correction note: import `cartLineKey` from `@/lib/variants`, not `@/lib/utils`.)

**Type consistency:** `cartLineKey`/`variantLabel` names match Phase 1 exports. Line shape `{ productId, variantId, quantity }` is identical across reducers, cart page, and Counter. `items` shape `{ id, variantId, quantity }` matches what Phase 3's `/api/orders` will consume.

## Notes
- No schema change in Phase 2.
- `/api/cart` stores `cart` as JSON — the new line shape is transparent to it; normalization on read (Task 2) covers any old rows.
