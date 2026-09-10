"use client";
import { useSelector } from "react-redux";
import { ArcGalleryHero } from "./ui/arc-gallery-hero";

const ShopCTA = () => {
  const products = useSelector((state) => state.product.list);

  // Fan of real product photos; needs a few to form the arc.
  const images = products
    .map((p) => p.images?.[0])
    .filter(Boolean)
    .slice(0, 12);

  if (images.length < 3) return null;

  return (
    <ArcGalleryHero
      images={images}
      title="Korea's glow, delivered to Kenya"
      subtitle="Authentic K-beauty and skincare — hand-picked in Seoul, shipped straight to your door."
      primaryLabel="Shop the collection"
      primaryHref="/shop"
      secondaryLabel="About us"
      secondaryHref="/about"
    />
  );
};

export default ShopCTA;
