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
