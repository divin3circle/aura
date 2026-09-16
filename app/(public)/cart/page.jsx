"use client";
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { variantLabel } from "@/lib/variants";
import { formatPrice } from "@/lib/utils";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function Cart() {
  const { cartItems } = useSelector((state) => state.cart);
  const products = useSelector((state) => state.product.list);

  const dispatch = useDispatch();

  const [cartArray, setCartArray] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

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

  const handleDeleteItemFromCart = (productId, variantId) => {
    dispatch(deleteItemFromCart({ productId, variantId }));
  };

  useEffect(() => {
    if (products.length > 0) {
      createCartArray();
    }
  }, [cartItems, products]);

  return cartArray.length > 0 ? (
    <div className="min-h-screen mx-6 text-slate-800">
      <div className="max-w-7xl mx-auto ">
        {/* Title */}
        <PageTitle
          heading="My Cart"
          text="items in your cart"
          linkText="Add more"
        />

        <div className="flex items-start justify-between gap-5 max-lg:flex-col">
          <div className="w-full max-w-4xl">
            {/* Tablet / desktop: table */}
            <table className="hidden md:table w-full text-slate-600 table-auto">
              <thead>
                <tr>
                  <th className="text-left">Product</th>
                  <th>Quantity</th>
                  <th>Total Price</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {cartArray.map((item) => (
                  <tr key={item.key} className="space-x-2">
                    <td className="flex gap-3 my-4">
                      <div className="flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md">
                        <Image
                          src={item.product.images[0]}
                          className="h-14 w-auto"
                          alt=""
                          width={45}
                          height={45}
                        />
                      </div>
                      <div>
                        <p>{item.product.name}</p>
                        {item.label && (
                          <p className="text-xs text-slate-500">{item.label}</p>
                        )}
                        <p>{formatPrice(item.unitPrice)}</p>
                      </div>
                    </td>
                    <td className="text-center">
                      <Counter productId={item.productId} variantId={item.variantId} />
                    </td>
                    <td className="text-center">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleDeleteItemFromCart(item.productId, item.variantId)}
                        className=" text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all"
                      >
                        <Trash2Icon size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile: stacked cards (table can't reflow on narrow screens) */}
            <div className="md:hidden flex flex-col divide-y divide-slate-200">
              {cartArray.map((item) => (
                <div key={item.key} className="flex gap-3 py-4">
                  <div className="flex items-center justify-center bg-slate-100 size-20 shrink-0 rounded-md">
                    <Image
                      src={item.product.images[0]}
                      className="h-16 w-auto"
                      alt=""
                      width={50}
                      height={50}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {item.product.name}
                    </p>
                    {item.label && (
                      <p className="text-xs text-slate-500">{item.label}</p>
                    )}
                    <p className="text-sm text-slate-500 mt-0.5">
                      {formatPrice(item.unitPrice)}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <Counter productId={item.productId} variantId={item.variantId} />
                      <p className="font-medium text-slate-800 whitespace-nowrap">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteItemFromCart(item.productId, item.variantId)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 active:scale-95 transition-all"
                    >
                      <Trash2Icon size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <OrderSummary totalPrice={totalPrice} items={cartArray.map((i) => ({ id: i.productId, variantId: i.variantId, quantity: i.quantity }))} />
        </div>
      </div>
    </div>
  ) : (
    <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
      <h1 className="text-2xl sm:text-4xl font-semibold">Your cart is empty</h1>
    </div>
  );
}
