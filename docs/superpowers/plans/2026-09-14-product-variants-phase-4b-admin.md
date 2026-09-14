# Phase 4b — Admin Product Editor + Per-Product Page Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let the store admin create/edit products with department→category→brand + per-size variant prices, and manage each product on a dedicated page that sets a discount and shows salvaged analytics (units sold, revenue, orders, reviews).

**Architecture:** New/updated store API routes carry the new fields (department, brand, category, options, variants, discountedPrice). The add-product form gains the taxonomy cascade + a variant editor + a discount field. A new `/store/manage-product/[id]` page (linked from the manage-products table) shows analytics computed from existing Order/OrderItem/Rating data and lets the admin set `discountedPrice`.

**Tech Stack:** Next.js App Router (JS), Prisma + Neon, Clerk (seller auth), Redux.

**Spec:** `docs/superpowers/specs/2026-09-14-product-variants-design.md`

## Global Constraints

- Prices are WYSIWYG (MARGIN=1). `discountedPrice` is a FINAL customer price. All money fields are plain KES numbers.
- Taxonomy comes from `lib/catalog.js` (`DEPARTMENTS`, `categoriesFor`, `brandsFor`). Category must belong to the chosen department; brand = dropdown + free "Other".
- Seller endpoints stay behind `authSeller` (owner's store only). A product page/edit must verify the product belongs to the caller's store.
- Additive DB usage only; standalone scripts (if any) use the Neon adapter (CJS).
- Vitest for any pure helpers; UI/endpoints verified by build (dev-guarded) + manual.

---

### Task 1: `GET /api/store/product/[id]` — product + analytics

**Files:** Create `app/api/store/product/[id]/route.js`.

**Interfaces:** Produces GET returning `{ product (with variants), analytics: { unitsSold, revenue, orderCount, reviews: [...] } }` for a product owned by the caller's store. `unitsSold`/`revenue`/`orderCount` computed from paid `OrderItem`s of that product; `reviews` from `Rating` (with user name/image, rating, review, createdAt).

- [ ] **Step 1:** Implement the route: `getAuth` → `authSeller(userId)` → 403 if none; load the product by id (include variants); 404 if not found or `product.storeId !== storeId`. Compute analytics: `orderItems = prisma.orderItem.findMany({ where: { productId, order: { isPaid: true } }, include: { order: true } })`; `unitsSold = sum(quantity)`, `revenue = sum(price*quantity)`, `orderCount = distinct orderId`. `reviews = prisma.rating.findMany({ where: { productId }, include: { user: { select: { name:true, image:true } } }, orderBy: { createdAt: 'desc' } })`. Return JSON.

- [ ] **Step 2:** Verify with a throwaway `node --env-file=.env` script (Neon adapter, CJS) that the handler's query logic returns sane numbers for one existing product (call the prisma queries directly). Delete the script.

- [ ] **Step 3:** Build (dev-guarded). Commit — `feat: store product detail + analytics API`.

---

### Task 2: Create/edit endpoints accept taxonomy + variants + discount

**Files:** Modify `app/api/store/product/route.js` (POST create); add PUT to `app/api/store/product/[id]/route.js` (edit).

**Interfaces:** Create + edit accept `department`, `brand`, `category`, `options` (axes JSON), `variants` (array of `{ options, price, mrp?, inStock, discountedPrice? }`), and product-level `discountedPrice`. Edit updates scalar fields and replaces the product's variants (deleteMany + create) and its options.

- [ ] **Step 1:** Update POST create: read the new fields from the formData/JSON; validate `category ∈ categoriesFor(department)`; persist `department`, `brand`, `discountedPrice`, `options`; if `variants` provided, create them (nested). Keep existing image upload.

- [ ] **Step 2:** Add PUT `[id]`: authSeller + ownership check; update scalar fields (name, subtitle, description, category, department, brand, price, mrp, discountedPrice, options); replace variants (`deleteMany({where:{productId}})` then create the provided set). Return the updated product.

- [ ] **Step 3:** Build (dev-guarded). Commit — `feat: accept department/brand/variants/discount in store product create+edit`.

---

### Task 3: Add/edit product form — taxonomy cascade + variant editor + discount

**Files:** Modify `app/store/add-product/page.jsx` (and the `categories` export it holds — source category options from `lib/catalog.js` instead).

**Interfaces:** The form lets the admin pick Department → Category (filtered) → Brand (dropdown + Other), enter base price + optional product discountedPrice, and define size variants (add rows: size value + price + in/out stock + optional discount). Submits the new shape to the create endpoint.

- [ ] **Step 1:** Replace the hard-coded `categories` list with `DEPARTMENTS` from `@/lib/catalog`. Add department + brand selects; category select filters by department (`categoriesFor`). Brand select from `brandsFor(department)` plus an "Other" free-text.

- [ ] **Step 2:** Add a simple variant editor: a toggle "This product has sizes/options"; when on, an axis name (default "Size") + repeatable rows `{ value, price, inStock }`; product base price used when off. Add a product-level `discountedPrice` input (optional).

- [ ] **Step 3:** Submit `department`, `brand`, `category`, `options`, `variants`, `discountedPrice` to the create endpoint. Build (dev-guarded) + manual sanity. Commit — `feat: admin product form with department/brand cascade + variant editor`.

---

### Task 4: Per-product management page (`/store/manage-product/[id]`)

**Files:** Create `app/store/manage-product/[id]/page.jsx`; link rows in `app/store/manage-product/page.jsx` to it.

**Interfaces:** Fetches `GET /api/store/product/[id]`; shows the product summary + analytics (units sold, revenue, order count) + reviews list, and a **discount setter** (input for `discountedPrice`, Save → PUT). Also a link/button to edit the full product.

- [ ] **Step 1:** Make each product row in `app/store/manage-product/page.jsx` link to `/store/manage-product/[id]`.

- [ ] **Step 2:** Build the page: fetch product+analytics (with token); render summary, an analytics strip (units sold / revenue via `formatPrice` / orders), the reviews list, and a discount form that PUTs `discountedPrice` (clear = null). Show the variant sizes + prices, with per-size discount optional.

- [ ] **Step 3:** Build (dev-guarded) + manual. Commit — `feat: per-product management page with discount setter + analytics`.

---

## Self-Review
- Product+analytics API (T1); create/edit accept new fields (T2); admin form cascade + variant editor (T3); per-product page with discount + analytics (T4). ✅ Covers the spec's admin scope + the user's dedicated-page request (discount + orders/purchases/reviews).
- No placeholders in intent; each task names exact files + endpoints. (Implementers read actual files for surrounding JSX.)
- Ownership/auth enforced on all seller routes.

## Notes
- Phase 5 (storefront browse by department/category/brand) follows.
- Per-variant discount UI can be minimal; product-level discount is the primary ask.
