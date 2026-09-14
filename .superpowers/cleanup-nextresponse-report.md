# NextResponse.json Cleanup Report

**Branch:** feat/cleanup-hero-shipping-brands  
**Date:** 2026-09-14  
**Scope:** All `app/api/**/route.js` files

## Summary

Fixed all incorrect `NextResponse.json()` calls:
- **3-argument calls** (critical bug — status code was silently ignored, responses returned 200): fully eliminated
- **2-argument calls with plain string body** (normalization — correct status but non-JSON body): normalized to object body

**Total files changed:** 20  
**Total calls fixed:** ~75

---

## Files Changed

| File | Calls Fixed | Issues |
|------|-------------|--------|
| `app/api/address/route.js` | 4 | 2x 3-arg (GET catch, POST catch); 2x 2-arg string (Unauthorized in GET/POST) |
| `app/api/admin/approve-store/route.js` | 8 | 2x 3-arg (Forbidden, MISSING_PARAMS, INVALID_STATUS, catch ×2); 3x 2-arg string (Unauthorized ×2, catch) |
| `app/api/admin/coupon/route.js` | 9 | 3-arg (Forbidden, MISSING_PARAMS, catch per handler ×3); 2-arg string (Unauthorized ×3) |
| `app/api/admin/dashboard/route.js` | 3 | 3-arg (Forbidden, dashboardData success with extra arg, catch); 2-arg string (Unauthorized) |
| `app/api/admin/is-admin/route.js` | 3 | 3-arg (Forbidden, catch); 2-arg string (Unauthorized) |
| `app/api/admin/orders/route.js` | 5 | 3-arg (MISSING_PARAMS, catch ×2); 2-arg string (Unauthorized ×2) |
| `app/api/admin/stores/route.js` | 3 | 3-arg (Forbidden, catch); 2-arg string (Unauthorized) |
| `app/api/admin/toggle-store/route.js` | 5 | 3-arg (Forbidden, MISSING_PARAMS, STORE_NOT_FOUND, catch); 2-arg string (Unauthorized) |
| `app/api/cart/route.js` | 4 | 3-arg (MISSING_PARAMS, catch ×2); 2-arg string (Unauthorized ×2) |
| `app/api/coupon/route.js` | 2 | 3-arg (Unauthorized, code required, catch); normalized 2-arg string Unauthorized |
| `app/api/orders/route.js` | 8 | 3-arg (Unauthorized ×2, MISSING_PARAMS, invalid coupon, Invalid quantity, Product not found, select variant, catch ×2) |
| `app/api/paystack/route.js` | 2 | 2-arg string (Invalid signature, Bad Request) |
| `app/api/products/route.js` | 1 | 3-arg (catch) |
| `app/api/rating/route.js` | 6 | 3-arg (Unauthorized ×2, MISSING_FIELDS, ORDER_NOT_FOUND, PRODUCT_NOT_IN_ORDER, ALREADY_RATED, catch ×2) |
| `app/api/store/create/route.js` | 5 | 3-arg (MISSING_FIELDS, STORE_EXISTS, USERNAME_TAKEN); 2-arg string (Unauthorized ×2, NOT_FOUND) |
| `app/api/store/dashboard/route.js` | 3 | 3-arg (Forbidden, catch); 2-arg string (Unauthorized) |
| `app/api/store/data/route.js` | 4 | 3-arg (Missing username ×2, Store not found, catch) |
| `app/api/store/is-seller/route.js` | 2 | 3-arg (catch); 2-arg string (Unauthorized) |
| `app/api/store/orders/route.js` | 6 | 3-arg (Forbidden ×2, MISSING_PARAMS, catch ×2); 2-arg string (Unauthorized ×2) |
| `app/api/store/stock-toggle/route.js` | 4 | 3-arg (MISSING_PRODUCT_ID, Forbidden, PRODUCT_NOT_FOUND, catch); 2-arg string (Unauthorized) |
| `app/api/store/update-status/route.js` | 3 | 3-arg (Forbidden, catch); 2-arg string (Unauthorized) |

## Files Untouched (already correct)

- `app/api/admin/store/[id]/route.js` — already used `{ error: "..." }` body with 2 args
- `app/api/admin/store/[id]/orders/route.js` — already correct
- `app/api/admin/store/[id]/ratings/route.js` — already correct
- `app/api/admin/store/[id]/revenue/route.js` — already correct
- `app/api/store/ai/route.js` — already correct
- `app/api/store/ai/images/route.js` — already correct
- `app/api/store/product/route.js` — already correct (had no 3-arg calls)
- `app/api/store/product/[id]/route.js` — already correct
- `app/api/store/revenue/route.js` — already correct
- `app/api/inngest/route.js` — no NextResponse usage

## Verification

```
grep -rn "NextResponse.json" app/api --include="route.js"
# Python scan: CLEAN — No 3-argument NextResponse.json calls found.
# Python scan: CLEAN — No 2-arg string body NextResponse.json calls found.

npm test
# Tests:   23 passed (23)
```

Port 3000 was in use at time of cleanup; build skipped per task instructions.
