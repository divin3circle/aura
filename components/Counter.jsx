'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { cartLineKey } from "@/lib/variants";
import { useDispatch, useSelector } from "react-redux";

const Counter = ({ productId, variantId = null }) => {
    const { cartItems } = useSelector(state => state.cart);
    const dispatch = useDispatch();
    const key = cartLineKey(productId, variantId);
    const quantity = cartItems[key]?.quantity ?? 0;

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={() => dispatch(removeFromCart({ productId, variantId }))} className="p-1 select-none">-</button>
            <p className="p-1">{quantity}</p>
            <button onClick={() => dispatch(addToCart({ productId, variantId }))} className="p-1 select-none">+</button>
        </div>
    )
}

export default Counter
