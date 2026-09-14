"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import { formatPrice } from "@/lib/utils";
import {
  StarIcon,
  CircleDollarSignIcon,
  ShoppingBasketIcon,
  TagsIcon,
  ArrowLeftIcon,
} from "lucide-react";

export default function ManageProductPage() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [reviews, setReviews] = useState([]);

  // Discount form state
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProduct = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/store/product/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProduct(data.product);
      setAnalytics(data.analytics);
      setReviews(data.analytics.reviews ?? []);
      setDiscountedPrice(
        data.product.discountedPrice != null
          ? String(data.product.discountedPrice)
          : ""
      );
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error(
          "Failed to load product" +
            (error.response?.data?.error
              ? `: ${error.response.data.error}`
              : "")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchProduct();
    }
  }, [user, id]);

  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        discountedPrice:
          discountedPrice.trim() === "" ? null : Number(discountedPrice),
      };
      await axios.put(`/api/store/product/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Discount saved successfully");
      await fetchProduct();
    } catch (error) {
      toast.error(
        "Failed to save discount" +
          (error.response?.data?.error
            ? `: ${error.response.data.error}`
            : "")
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  if (notFound) {
    return (
      <div className="text-slate-500 mt-10">
        <p className="text-lg">Product not found.</p>
        <Link
          href="/store/manage-product"
          className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeftIcon size={16} /> Back to products
        </Link>
      </div>
    );
  }

  if (!product) return null;

  const analyticsCards = [
    {
      title: "Units Sold",
      value: analytics?.unitsSold ?? 0,
      icon: ShoppingBasketIcon,
    },
    {
      title: "Revenue",
      value: formatPrice(analytics?.revenue ?? 0),
      icon: CircleDollarSignIcon,
    },
    {
      title: "Orders",
      value: analytics?.orderCount ?? 0,
      icon: TagsIcon,
    },
  ];

  return (
    <div className="text-slate-500 mb-28 max-w-4xl">
      {/* Back link */}
      <Link
        href="/store/manage-product"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-5"
      >
        <ArrowLeftIcon size={15} /> Back to products
      </Link>

      <h1 className="text-2xl text-slate-500 mb-6">
        Product{" "}
        <span className="text-slate-800 font-medium">Management</span>
      </h1>

      {/* Product summary */}
      <div className="flex gap-5 flex-wrap border border-slate-200 rounded-lg p-5 mb-6">
        {product.images?.[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            width={120}
            height={120}
            className="rounded-lg object-cover shadow"
          />
        )}
        <div className="flex flex-col gap-1 text-sm">
          <h2 className="text-lg font-medium text-slate-800">{product.name}</h2>
          {product.subtitle && (
            <p className="text-slate-400">{product.subtitle}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-slate-600">
            {product.brand && (
              <span>
                <span className="text-slate-400">Brand: </span>
                {product.brand}
              </span>
            )}
            {product.department && (
              <span>
                <span className="text-slate-400">Department: </span>
                {product.department}
              </span>
            )}
            {product.category && (
              <span>
                <span className="text-slate-400">Category: </span>
                {product.category}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-1 text-slate-600">
            <span>
              <span className="text-slate-400">Price: </span>
              <span className="font-medium text-slate-800">
                {formatPrice(product.price)}
              </span>
            </span>
            {product.mrp && product.mrp !== product.price && (
              <span>
                <span className="text-slate-400">MRP: </span>
                <span className="line-through">{formatPrice(product.mrp)}</span>
              </span>
            )}
            {product.discountedPrice != null && (
              <span>
                <span className="text-slate-400">Discounted: </span>
                <span className="text-green-600 font-medium">
                  {formatPrice(product.discountedPrice)}
                </span>
              </span>
            )}
          </div>
          <div className="mt-2">
            <Link
              href={`/store/edit-product/${product.id}`}
              className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition-colors"
            >
              Edit product
            </Link>
          </div>
        </div>
      </div>

      {/* Variants */}
      {product.variants && product.variants.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-5 mb-6">
          <h3 className="font-medium text-slate-700 mb-3">Variants</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-gray-600 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-3 py-2">Options</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">MRP</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2">In Stock</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {product.variants.map((variant) => (
                  <tr
                    key={variant.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2">
                      {Object.entries(variant.options ?? {})
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2">{formatPrice(variant.price)}</td>
                    <td className="px-3 py-2">
                      {variant.mrp ? formatPrice(variant.mrp) : "—"}
                    </td>
                    <td className="px-3 py-2 text-green-600">
                      {variant.discountedPrice != null
                        ? formatPrice(variant.discountedPrice)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          variant.inStock
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {variant.inStock ? "In stock" : "Out"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics strip */}
      <div className="flex flex-wrap gap-4 mb-6">
        {analyticsCards.map((card, index) => (
          <div
            key={index}
            className="flex items-center gap-8 border border-slate-200 p-3 px-5 rounded-lg"
          >
            <div className="flex flex-col gap-1 text-xs">
              <p>{card.title}</p>
              <b className="text-xl font-medium text-slate-700">{card.value}</b>
            </div>
            <card.icon
              size={40}
              className="w-10 h-10 p-2 text-slate-400 bg-slate-100 rounded-full"
            />
          </div>
        ))}
      </div>

      {/* Discount setter */}
      <div className="border border-slate-200 rounded-lg p-5 mb-6">
        <h3 className="font-medium text-slate-700 mb-1">Set Discount Price</h3>
        <p className="text-xs text-slate-400 mb-4">
          Leave empty to remove the discount. Applies at the product level.
        </p>
        <form onSubmit={handleSaveDiscount} className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 1999"
            value={discountedPrice}
            onChange={(e) => setDiscountedPrice(e.target.value)}
            className="border border-slate-200 rounded px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-slate-800 text-white text-sm px-5 py-2 rounded hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {product.discountedPrice != null && (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setDiscountedPrice("");
              }}
              className="text-sm text-red-500 hover:text-red-700 px-3 py-2 underline disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Reviews */}
      <div className="border border-slate-200 rounded-lg p-5">
        <h3 className="font-medium text-slate-700 mb-4">
          Reviews{" "}
          <span className="text-slate-400 font-normal text-sm">
            ({reviews.length})
          </span>
        </h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400">No reviews yet for this product.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="flex max-sm:flex-col gap-4 sm:items-start justify-between py-5 text-sm text-slate-600"
              >
                <div className="flex gap-3">
                  {review.user?.image && (
                    <Image
                      src={review.user.image}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover"
                      width={36}
                      height={36}
                    />
                  )}
                  <div>
                    <p className="font-medium text-slate-700">
                      {review.user?.name ?? "Anonymous"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(review.createdAt).toDateString()}
                    </p>
                    <div className="flex mt-1">
                      {Array(5)
                        .fill("")
                        .map((_, i) => (
                          <StarIcon
                            key={i}
                            size={14}
                            className="text-transparent"
                            fill={review.rating >= i + 1 ? "#00C950" : "#D1D5DB"}
                          />
                        ))}
                    </div>
                    {review.review && (
                      <p className="mt-2 text-slate-500 max-w-xs leading-6">
                        {review.review}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
