'use client'
import { Suspense } from "react"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon, XIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"
import Link from "next/link"
import { DEPARTMENTS, departmentKeys, categoriesFor, brandsFor } from "@/lib/catalog"

function ShopContent() {
    const searchParams = useSearchParams()
    const search = searchParams.get('search') || ''
    const department = searchParams.get('department') || ''
    const category = searchParams.get('category') || ''
    const brand = searchParams.get('brand') || ''
    const router = useRouter()

    const products = useSelector(state => state.product.list)

    const filteredProducts = products.filter(product => {
        if (search && !product.name.toLowerCase().includes(search.toLowerCase())) return false
        if (department && product.department !== department) return false
        if (category && product.category !== category) return false
        if (brand && product.brand !== brand) return false
        return true
    })

    const hasFilters = !!(search || department || category || brand)

    // Build query string preserving other params, optionally overriding some
    function buildQuery(overrides) {
        const params = {}
        if (search) params.search = search
        if (department) params.department = department
        if (category) params.category = category
        if (brand) params.brand = brand
        Object.assign(params, overrides)
        // Remove empty/falsy values
        Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
        const qs = new URLSearchParams(params).toString()
        return qs ? `/shop?${qs}` : '/shop'
    }

    function chipClass(active) {
        return `px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border ${
            active
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800'
        }`
    }

    // Brands: if dept selected use brandsFor, else distinct brands from product list
    const brandOptions = department
        ? brandsFor(department)
        : [...new Set(products.map(p => p.brand).filter(Boolean))].sort()

    // Category chips: only shown when a department is selected
    const categoryOptions = department ? categoriesFor(department) : []

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="max-w-7xl mx-auto">
                <h1
                    onClick={() => router.push('/shop')}
                    className="text-2xl text-slate-500 my-6 flex items-center gap-2 cursor-pointer"
                >
                    {hasFilters && <MoveLeftIcon size={20} />}
                    All <span className="text-slate-700 font-medium">Products</span>
                </h1>

                {/* Filter bar */}
                <div className="mb-6 space-y-3">
                    {/* Department chips */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-slate-400 w-20 shrink-0">Department</span>
                        <button
                            onClick={() => router.push(buildQuery({ department: '', category: '', brand: '' }))}
                            className={chipClass(!department)}
                        >
                            All
                        </button>
                        {departmentKeys.map(d => (
                            <button
                                key={d}
                                onClick={() => router.push(buildQuery({ department: d, category: '', brand: '' }))}
                                className={chipClass(department === d)}
                            >
                                {DEPARTMENTS[d].label}
                            </button>
                        ))}
                    </div>

                    {/* Category chips — only when a department is chosen */}
                    {department && categoryOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-slate-400 w-20 shrink-0">Category</span>
                            <button
                                onClick={() => router.push(buildQuery({ category: '' }))}
                                className={chipClass(!category)}
                            >
                                All
                            </button>
                            {categoryOptions.map(c => (
                                <button
                                    key={c}
                                    onClick={() => router.push(buildQuery({ category: c }))}
                                    className={chipClass(category === c)}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Brand chips */}
                    {brandOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-slate-400 w-20 shrink-0">Brand</span>
                            <button
                                onClick={() => router.push(buildQuery({ brand: '' }))}
                                className={chipClass(!brand)}
                            >
                                All
                            </button>
                            {brandOptions.map(b => (
                                <button
                                    key={b}
                                    onClick={() => router.push(buildQuery({ brand: b }))}
                                    className={chipClass(brand === b)}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Count + clear */}
                    {hasFilters && (
                        <div className="flex items-center gap-3 pt-1">
                            <span className="text-sm text-slate-500">
                                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                            </span>
                            <Link
                                href="/shop"
                                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                            >
                                <XIcon size={12} />
                                Clear filters
                            </Link>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
                    {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
            </div>
        </div>
    )
}


export default function Shop() {
  return (
    <Suspense fallback={<div>Loading shop...</div>}>
      <ShopContent />
    </Suspense>
  );
}
