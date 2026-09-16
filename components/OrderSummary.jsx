import { PlusIcon, SquarePenIcon, XIcon } from "lucide-react";
import React, { useState } from "react";
import AddressModal from "./AddressModal";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { fetchCart } from "@/lib/features/cart/cartSlice";
import { formatPrice } from "@/lib/utils";
import { shippingFor } from "@/lib/pricing";

// Accept a Kenyan Safaricom mobile as 07XXXXXXXX / 01XXXXXXXX (local) or
// 2547XXXXXXXX / 2541XXXXXXXX (international). Spaces/dashes are ignored.
const isValidMpesaPhone = (raw) =>
  /^(?:0[17]\d{8}|254[17]\d{8})$/.test(String(raw || "").replace(/\D/g, ""));

const OrderSummary = ({ totalPrice, items }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const router = useRouter();

  const addressList = useSelector((state) => state.address.list);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [placing, setPlacing] = useState(false);

  const handleCouponCode = async (event) => {
    event.preventDefault();
    try {
      if (!user) {
        return toast("Please login to apply coupon", { icon: "⚠️" });
      }
      const token = await getToken();
      const { data } = await axios.post(
        "/api/coupon",
        { code: couponCodeInput },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast(data.message || "Coupon applied successfully");
      setCoupon(data.coupon);
      setCouponCodeInput("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to apply coupon");
      setCouponCodeInput("");
    }
  };

  // Poll our status endpoint until the M-Pesa callback marks the order paid (~90s).
  // A fresh Clerk token is fetched each iteration — session tokens expire ~60s, so
  // reusing one token across the whole loop would 401 on the later polls.
  const pollPaid = async (checkoutRequestId) => {
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const token = await getToken();
        const { data } = await axios.get(
          `/api/mpesa/status?checkoutRequestId=${checkoutRequestId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.paid) return { paid: true };
        if (data.failed) return { paid: false, failed: true, reason: data.reason };
      } catch {
        /* keep polling */
      }
    }
    return { paid: false };
  };

  const handlePlaceOrder = async () => {
    if (!user) return toast("Please login to place order", { icon: "⚠️" });
    if (!selectedAddress) return toast("Please select an address", { icon: "⚠️" });
    const phone = (mpesaPhone || selectedAddress.phone || "").trim();
    if (!phone) return toast("Enter your M-Pesa phone number", { icon: "⚠️" });
    if (!isValidMpesaPhone(phone))
      return toast.error(
        "Enter a valid Safaricom number (07XXXXXXXX or 2547XXXXXXXX)"
      );

    setPlacing(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/orders",
        {
          addressId: selectedAddress.id,
          items,
          couponCode: coupon ? coupon.code : null,
          paymentMethod: "MPESA",
          phone,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(
        data.message || "Check your phone and enter your M-Pesa PIN."
      );
      const result = await pollPaid(data.checkoutRequestId);
      if (result.paid) {
        toast.success("Payment received!");
        dispatch(fetchCart({ getToken }));
        router.push("/orders");
      } else if (result.failed) {
        toast.error(
          result.reason || "Payment was cancelled or failed. Please try again."
        );
      } else {
        toast(
          "Payment not confirmed yet. If you completed it, your order will show under Orders shortly.",
          { icon: "⏳" }
        );
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  // Shipping is free within Nairobi, a flat KES 500 for any other county.
  const shipping = selectedAddress ? shippingFor(selectedAddress.state) : null;
  const discount = coupon ? (coupon.discount / 100) * totalPrice : 0;
  const orderTotal = totalPrice - discount + (shipping || 0);

  return (
    <div className="w-full max-w-lg lg:max-w-85 bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7">
      <h2 className="text-xl font-medium text-slate-600">Payment Summary</h2>
      <p className="text-slate-400 text-xs my-4">Payment Method</p>
      <div className="flex gap-2 items-center">
        <input type="radio" id="MPESA" checked readOnly className="accent-green-600" />
        <label htmlFor="MPESA" className="cursor-pointer">
          Pay with M-Pesa
        </label>
      </div>
      <input
        type="tel"
        value={mpesaPhone}
        onChange={(e) => setMpesaPhone(e.target.value)}
        placeholder={selectedAddress?.phone ? `M-Pesa no. (default ${selectedAddress.phone})` : "M-Pesa no. e.g. 0712 345 678"}
        className="mt-2 w-full border border-slate-300 rounded p-2 text-sm outline-none"
      />
      <div className="my-4 py-4 border-y border-slate-200 text-slate-400">
        <p>Address</p>
        {selectedAddress ? (
          <div className="flex gap-2 items-center">
            <p>
              {selectedAddress.name}, {selectedAddress.city},{" "}
              {selectedAddress.state}, {selectedAddress.zip}
            </p>
            <SquarePenIcon
              onClick={() => setSelectedAddress(null)}
              className="cursor-pointer"
              size={18}
            />
          </div>
        ) : (
          <div>
            {addressList.length > 0 && (
              <select
                className="border border-slate-400 p-2 w-full my-3 outline-none rounded-xl"
                onChange={(e) =>
                  setSelectedAddress(addressList[e.target.value])
                }
              >
                <option value="">Select Address</option>
                {addressList.map((address, index) => (
                  <option key={index} value={index}>
                    {address.name}, {address.city}, {address.state},{" "}
                    {address.zip}
                  </option>
                ))}
              </select>
            )}
            <button
              className="flex items-center gap-1 text-slate-600 mt-1"
              onClick={() => {
                if (!user)
                  return toast("Please login to add an address", {
                    icon: "⚠️",
                  });
                setShowAddressModal(true);
              }}
            >
              Add Address <PlusIcon size={18} />
            </button>
          </div>
        )}
      </div>
      <div className="pb-4 border-b border-slate-200">
        <div className="flex justify-between">
          <div className="flex flex-col gap-1 text-slate-400">
            <p>Subtotal:</p>
            <p>Shipping:</p>
            {coupon && <p>Coupon:</p>}
          </div>
          <div className="flex flex-col gap-1 font-medium text-right">
            <p>{formatPrice(totalPrice)}</p>
            <p className="font-medium">
              {shipping === null
                ? "—"
                : shipping === 0
                ? "Free"
                : formatPrice(shipping)}
            </p>
            {coupon && <p>{`-${formatPrice(discount)}`}</p>}
          </div>
        </div>
        {!coupon ? (
          <form
            onSubmit={(e) =>
              toast.promise(handleCouponCode(e), {
                loading: "Checking Coupon...",
              })
            }
            className="flex justify-center gap-3 mt-3"
          >
            <input
              onChange={(e) => setCouponCodeInput(e.target.value)}
              value={couponCodeInput}
              type="text"
              placeholder="Coupon Code"
              className="border border-slate-400 p-1.5 rounded-xl w-full outline-none"
            />
            <button className="bg-slate-600 text-white px-3 rounded-xl hover:bg-slate-800 active:scale-95 transition-all">
              Apply
            </button>
          </form>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 text-xs mt-2">
            <p>
              Code:{" "}
              <span className="font-semibold ml-1">
                {coupon.code.toUpperCase()}
              </span>
            </p>
            <p>{coupon.description}</p>
            <XIcon
              size={18}
              onClick={() => setCoupon("")}
              className="hover:text-red-700 transition cursor-pointer"
            />
          </div>
        )}
      </div>
      <div className="flex justify-between py-4">
        <p>Total:</p>
        <p className="font-medium text-right">{formatPrice(orderTotal)}</p>
      </div>
      <button
        onClick={handlePlaceOrder}
        disabled={placing}
        className="w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {placing ? "Waiting for M-Pesa…" : "Place Order"}
      </button>
      {placing && (
        <p className="text-xs text-slate-500 text-center mt-2">
          Check your phone and enter your M-Pesa PIN. Don't close this page.
        </p>
      )}

      {showAddressModal && (
        <AddressModal setShowAddressModal={setShowAddressModal} />
      )}
    </div>
  );
};

export default OrderSummary;
