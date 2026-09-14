import Link from "next/link";
import { departmentKeys, categoriesFor } from "@/lib/catalog";

// Each category paired with its department, so a chip links to the right filter.
const categoryItems = departmentKeys.flatMap((d) =>
  categoriesFor(d).map((category) => ({ category, department: d }))
);

const CategoriesMarquee = () => {
  return (
    <div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-20">
      <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-linear-to-r from-white to-transparent" />
      <div className="flex min-w-[200%] animate-[marqueeScroll_10s_linear_infinite] sm:animate-[marqueeScroll_40s_linear_infinite] group-hover:[animation-play-state:paused] gap-4">
        {[...categoryItems, ...categoryItems, ...categoryItems, ...categoryItems].map(
          ({ category, department }, index) => (
            <Link
              key={index}
              href={`/shop?department=${department}&category=${encodeURIComponent(category)}`}
              className="shrink-0 whitespace-nowrap px-5 py-2 bg-slate-100 rounded-lg text-slate-500 text-xs sm:text-sm hover:bg-slate-600 hover:text-white active:scale-95 transition-all duration-300"
            >
              {category}
            </Link>
          )
        )}
      </div>
      <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-linear-to-l from-white to-transparent" />
    </div>
  );
};

export default CategoriesMarquee;
