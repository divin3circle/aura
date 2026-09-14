# Phase 5 — Storefront Browse / Filter Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let shoppers filter `/shop` by Department, Category, and Brand (combined with the existing search), and make the homepage category chips link into the filtered shop.

**Architecture:** Filters live in URL query params (`?department=&category=&brand=&search=`) so they're shareable and compose with the current `search` param. The shop page reads the params, filters the Redux product list (which already carries `department`, `category`, `brand`), and renders filter chips sourced from `lib/catalog.js`. The homepage `CategoriesMarquee` chips become links to `/shop?category=`.

**Tech Stack:** Next.js App Router (JS), Redux, `lib/catalog.js`.

**Spec:** `docs/superpowers/specs/2026-09-14-product-variants-design.md`

## Global Constraints

- Products from `/api/products` include `department`, `category`, `brand` (and margin-applied display prices). Filter client-side on the Redux list.
- Filters are additive: department AND category AND brand AND search all narrow the set. Category options depend on the selected department (`categoriesFor`).
- Empty/absent params = no filter on that axis (show all). Keep the existing search behavior.
- No schema/DB/API changes — this is a UI/filtering phase.

---

### Task 1: Shop page filters (department / category / brand + search)

**Files:** Modify `app/(public)/shop/page.jsx`.

**Interfaces:** `/shop` reads `department`, `category`, `brand`, `search` from query params; renders chip filters; filters the product list by all active axes.

- [ ] **Step 1:** Read `department`, `category`, `brand`, `search` from `useSearchParams()`. Compute `filteredProducts` from the Redux list applying every active filter: `search` (name includes, case-insensitive), `department` (exact), `category` (exact), `brand` (exact).

- [ ] **Step 2:** Render a filter bar above the grid:
  - Department chips: "All" + `departmentKeys` (labels from `DEPARTMENTS[d].label`). Selecting one updates `?department=` and clears `category` (since categories are department-scoped).
  - Category chips: shown when a department is selected — `categoriesFor(department)` — plus "All". Updates `?category=`.
  - Brand chips (or a compact select): `brandsFor(department)` when a department is selected, else the distinct brands present in the product list; "All" clears it. Updates `?brand=`.
  - Each chip navigates via `router.push` with the merged query string (preserve other active params + search). Active chip is visually highlighted (slate-800 bg / white text, like the variant chips).

- [ ] **Step 3:** Keep the existing "All Products" heading + back behavior; show a small "N products" count and a "Clear filters" link when any filter is active.

- [ ] **Step 4:** Build dev-guarded (`lsof -ti:3000`; build if free else skip); `npm test` passes. Commit — `feat: department/category/brand filters on the shop page`.

---

### Task 2: Wire homepage category chips into the filtered shop

**Files:** Modify `components/CategoriesMarquee.jsx`.

**Interfaces:** Each marquee chip links to `/shop?category=<name>` (and the relevant department).

- [ ] **Step 1:** Make each chip a Next `Link` to `/shop?department=COSMETICS&category=<encoded name>` (the marquee currently shows cosmetics categories from `lib/catalog`). Preserve the marquee animation/markup; just wrap each chip in a link.

- [ ] **Step 2:** Build dev-guarded; commit — `feat: link homepage category chips to filtered shop`.

---

## Self-Review
- Shop filters (dept/category/brand + search) via URL params → Task 1; homepage chips link into shop → Task 2. ✅ Delivers the storefront browse the taxonomy was built for.
- No placeholders; no schema/API changes.
- Uses `lib/catalog.js` helpers consistent with the admin form.

## Notes
- Department/brand data is already backfilled on all 36 products (Phase 4a).
- A left sidebar layout is an alternative to chips; chips chosen for consistency with the product-page variant selectors.
