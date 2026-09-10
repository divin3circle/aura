'use client'
import { formatPrice } from '@/lib/utils'
import { StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const ProductCard = ({ product }) => {

    // calculate the average rating of the product
    const rating = Math.round(product.rating.reduce((acc, curr) => acc + curr.rating, 0) / product.rating.length);

    return (
        <Link href={`/product/${product.id}`} className=' group max-xl:mx-auto'>
            <div className='relative h-40 sm:w-60 sm:h-68 rounded-lg overflow-hidden ring-1 ring-black/5'>
                <Image fill sizes='(max-width: 640px) 50vw, 240px' className='object-cover group-hover:scale-105 transition duration-300' src={product.images[0]} alt={product.name} />
            </div>
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <div>
                    <p>{product.name}</p>
                    <div className='flex'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                        ))}
                    </div>
                </div>
                <p className='whitespace-nowrap'>{formatPrice(product.price)}</p>
            </div>
        </Link>
    )
}

export default ProductCard