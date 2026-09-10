// Global pricing margin.
//
// The DB stores BASE prices (KES, converted from supplier cost). Every customer-facing
// price — product listings, cart, and the amount actually charged at checkout — is
// multiplied by this factor. To do a uniform price change, edit MARGIN in .env only.
//
// Applied server-side in exactly two places so it can never drift:
//   - GET  /api/products  (feeds all display + the client cart preview)
//   - POST /api/orders    (the authoritative amount charged + stored order records)
// Because it is applied at the API boundary, MARGIN is NOT a NEXT_PUBLIC var and is
// never exposed to the browser.

export const MARGIN = Number(process.env.MARGIN) || 1;

// Multiply a base price by the margin, rounded to a whole KES so the amount
// shown to the customer and the amount charged always match.
export const applyMargin = (amount) => Math.round(Number(amount) * MARGIN);

// Shipping: free within Nairobi, a flat fee everywhere else in Kenya.
export const SHIPPING_FEE = 500;
export const shippingFor = (county) =>
  (county || "").trim().toLowerCase() === "nairobi" ? 0 : SHIPPING_FEE;
