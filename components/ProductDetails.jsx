'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { formatPrice } from "@/lib/utils";
import { resolveVariant, cheapestVariant, cartLineKey } from "@/lib/variants";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";

const ProductDetails = ({ product }) => {
    const productId = product.id;
    const options = product.options || [];
    const variants = product.variants || [];
    const hasVariants = variants.length > 0;

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();
    const router = useRouter();

    const [mainImage, setMainImage] = useState(product.images[0]);
    const [selected, setSelected] = useState(() => (hasVariants ? (cheapestVariant(variants)?.options ?? {}) : {}));
    const [quantity, setQuantity] = useState(1);

    const selectedVariant = hasVariants ? resolveVariant(variants, selected) : null;
    const activePrice = selectedVariant ? selectedVariant.price : product.price;
    const activeCompareAt = selectedVariant ? selectedVariant.compareAtPrice : product.compareAtPrice;
    const inStock = selectedVariant ? selectedVariant.inStock : product.inStock;
    const hasDiscount = Boolean(activeCompareAt);

    const variantId = selectedVariant?.id ?? null;
    const inCart = Boolean(cart[cartLineKey(productId, variantId)]);
    const canAdd = inStock && (!hasVariants || Boolean(selectedVariant));

    const isValue = (axis, value) => {
        const v = resolveVariant(variants, { ...selected, [axis]: value });
        return { exists: Boolean(v), inStock: Boolean(v?.inStock) };
    };

    const averageRating = product.rating.length
        ? product.rating.reduce((acc, item) => acc + item.rating, 0) / product.rating.length
        : 0;

    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {product.images.map((image, index) => (
                        <div key={index} onClick={() => setMainImage(product.images[index])} className={`relative size-26 rounded-lg overflow-hidden ring-1 cursor-pointer group ${mainImage === image ? 'ring-slate-800' : 'ring-black/5'}`}>
                            <Image src={image} fill sizes="104px" className="object-cover group-hover:scale-105 group-active:scale-95 transition" alt={product.name} />
                        </div>
                    ))}
                </div>
                <div className="relative h-100 sm:size-113 rounded-lg overflow-hidden ring-1 ring-black/5">
                    <Image src={mainImage} alt={product.name} fill sizes="(max-width: 640px) 100vw, 452px" className="object-cover" />
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-semibold text-slate-800">{product.name}</h1>
                <div className='flex items-center mt-2'>
                    {Array(5).fill('').map((_, index) => (
                        <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={averageRating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                    ))}
                    <p className="text-sm ml-3 text-slate-500">{product.rating.length} Reviews</p>
                </div>
                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p>{formatPrice(activePrice)}</p>
                    {hasDiscount && (
                        <p className="text-xl text-slate-500 line-through">{formatPrice(activeCompareAt)}</p>
                    )}
                </div>
                {hasDiscount && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <TagIcon size={14} />
                        <p>Save {((activeCompareAt - activePrice) / activeCompareAt * 100).toFixed(0)}% right now</p>
                    </div>
                )}

                {options.map((opt) => (
                    <div key={opt.name} className="mt-6">
                        <p className="text-sm font-medium text-slate-700 mb-2">{opt.name}</p>
                        <div className="flex flex-wrap gap-2">
                            {opt.values.map((value) => {
                                const { exists, inStock: vInStock } = isValue(opt.name, value);
                                const isSelected = selected[opt.name] === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        disabled={!exists}
                                        onClick={() => setSelected({ ...selected, [opt.name]: value })}
                                        className={`px-4 py-2 rounded border text-sm transition ${isSelected ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-500'} ${!exists ? 'opacity-40 cursor-not-allowed line-through' : ''} ${exists && !vInStock ? 'opacity-60' : ''}`}
                                    >
                                        {value}{exists && !vInStock ? ' (out of stock)' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div className="flex items-end gap-5 mt-8">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-slate-700">Quantity</p>
                        <div className="inline-flex items-center gap-3 px-3 py-2 rounded border border-slate-200 text-slate-600">
                            <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-1 select-none"><MinusIcon size={16} /></button>
                            <p className="w-6 text-center">{quantity}</p>
                            <button type="button" onClick={() => setQuantity(q => q + 1)} className="p-1 select-none"><PlusIcon size={16} /></button>
                        </div>
                    </div>
                    <button
                        onClick={() => inCart ? router.push('/cart') : dispatch(addToCart({ productId, variantId, quantity }))}
                        disabled={!inCart && !canAdd}
                        className="bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {inCart ? 'View Cart' : (canAdd ? 'Add to Cart' : 'Unavailable')}
                    </button>
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <EarthIcon className="text-slate-400" /> Fast delivery across Kenya </p>
                    <p className="flex gap-3"> <CreditCardIcon className="text-slate-400" /> Secure payment via Paystack </p>
                    <p className="flex gap-3"> <UserIcon className="text-slate-400" /> Authentic Korean brands </p>
                </div>
            </div>
        </div>
    )
}

export default ProductDetails
