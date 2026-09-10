"use client";
import Title from "./Title";
import { CoverflowCarousel } from "./CoverflowCarousel";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";

const TopProducts = () => {
  const products = useSelector((state) => state.product.list);
  const router = useRouter();

  // Highest-rated first; fall back to catalogue order. Show up to 12.
  const top = products
    .slice()
    .sort((a, b) => b.rating.length - a.rating.length)
    .slice(0, 12);

  if (top.length === 0) return null;

  const slides = top.map((product) => ({
    src: product.images[0],
    alt: product.name,
    title: product.name,
    subtitle: formatPrice(product.price),
  }));

  return (
    <div className="px-6 my-30 max-w-6xl mx-auto">
      <Title
        title="Top Products"
        description="Our most-loved picks — swipe to explore"
        href="/shop"
      />
      <div className="mt-6">
        <CoverflowCarousel
          slides={slides}
          showCaption
          showNavigation
          loop
          onCardClick={(index) => router.push(`/product/${top[index].id}`)}
        />
      </div>
    </div>
  );
};

export default TopProducts;
