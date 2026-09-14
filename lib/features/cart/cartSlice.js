import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { cartLineKey } from "@/lib/variants";

export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async ({ getToken }, thunkAPI) => {
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return data.cart;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

export const updateCart = createAsyncThunk(
  "cart/updateCart",
  async ({ getToken }, thunkAPI) => {
    try {
      const token = await getToken();
      const cartState = thunkAPI.getState().cart;
      const { data } = await axios.post(
        "/api/cart",
        { cart: { cartItems: cartState.cartItems, total: cartState.total } },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);
const cartSlice = createSlice({
  name: "cart",
  initialState: {
    total: 0,
    cartItems: {},
  },
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
  extraReducers: (builder) => {
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
  },
});

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } =
  cartSlice.actions;

export default cartSlice.reducer;
