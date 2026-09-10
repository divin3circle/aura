import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format a money amount for display, e.g. 4989 -> "KES 4,989".
// Currency symbol comes from NEXT_PUBLIC_CURRENCY_SYMBOL; a space separates it
// from the comma-grouped number. Whole units (no decimals) for a clean storefront.
export function formatPrice(amount) {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
  const value = Number(amount) || 0;
  return `${currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
