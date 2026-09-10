'use client'
import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import TopProducts from "@/components/TopProducts";
import ShopCTA from "@/components/ShopCTA";

export default function Home() {
    return (
        <div>
            <Hero />
            <LatestProducts />
            <BestSelling />
            <TopProducts />
            <OurSpecs />
            <ShopCTA />
            <Newsletter />
        </div>
    );
}
