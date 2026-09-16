"use client";
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { use, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts } from "@/lib/features/product/productSlice";
import { useAuth, useUser } from "@clerk/nextjs";
import { fetchCart, updateCart } from "@/lib/features/cart/cartSlice";
import { fetchAddress } from "@/lib/features/address/addressSlice";
import { fetchUserRatings } from "@/lib/features/rating/ratingSlice";

export default function PublicLayout({ children }) {
  const dispatch = useDispatch();
  const { user } = useUser();
  const { getToken } = useAuth();

  const { cartItems } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchProducts({}));
  }, []);

  useEffect(() => {
    if (user) {
      dispatch(fetchCart({ getToken }));
      dispatch(fetchAddress({ getToken }));
      dispatch(fetchUserRatings({ getToken }));
    }
  }, [user]);

  useEffect(() => {
    // Only sync the cart to the server for signed-in users; otherwise the
    // POST /api/cart 401s on every cart change for logged-out visitors.
    if (user && cartItems) {
      dispatch(updateCart({ getToken }));
    }
  }, [cartItems, user]);

  return (
    <>
      <Banner />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
