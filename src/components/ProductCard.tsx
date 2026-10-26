import React from 'react';
import { motion } from 'motion/react';
import { Product } from '../types.ts';
import { DrinkCupGraphic, DaisyFlower } from './Decorations.tsx';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onAddToCartClick: (product: Product) => void;
}

export function ProductCard({ product, onAddToCartClick }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="group relative bg-[#FFFDF9]/95 p-3 sm:p-5 rounded-2xl sm:rounded-[36px] border-2 border-[#D7E7C8] hover:border-[#BCCEAA] vintage-card-shadow flex flex-col items-center text-center transition-all hover:scale-[1.02] overflow-hidden"
      id={`product-card-${product.id}`}
    >
      {/* Delicate vintage daisy accent in corner */}
      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 pointer-events-none opacity-80 transition-transform group-hover:rotate-12">
        <DaisyFlower className="w-3.5 h-3.5 sm:w-5 sm:h-5" petalColor="#FFE6EE" centerColor="#F9E79F" />
      </div>

      {/* Drink container with vintage circular frame */}
      <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#F2F7EC] rounded-full mb-2.5 sm:mb-4 flex items-center justify-center relative border-2 border-dashed border-[#D4E4C5] shadow-inner shrink-0">
        <DrinkCupGraphic
          type={product.type}
          size={product.size}
          className="w-13 h-17 sm:w-18 sm:h-22"
        />

        {product.size === 'large' && (
          <span className="absolute text-[9px] sm:text-[11px] -bottom-1 font-bold text-[#556F43] bg-[#FFFDF9] px-2 py-0.5 rounded-full border border-[#D7E7C8] shadow-2xs">
            كبير
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="w-full flex-1 flex flex-col justify-between items-center">
        <div className="mb-2.5 sm:mb-4 w-full">
          <h3 className="font-marhey text-xs sm:text-base md:text-lg font-bold text-[#445B32] leading-tight sm:leading-snug truncate">
            {product.name}
          </h3>
          <p className="text-xs sm:text-sm font-bold text-[#7A8E68] mt-0.5 sm:mt-1">
            {product.basePrice} ﷼
          </p>
        </div>

        {/* Vintage Pill Button: إضافة إلى السلة */}
        <button
          type="button"
          onClick={() => onAddToCartClick(product)}
          className="w-full py-2 sm:py-2.5 px-1.5 sm:px-4 bg-[#F8BBD0] hover:bg-[#F06292] text-white rounded-full font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1 min-h-[36px]"
          id={`btn-add-to-cart-${product.id}`}
        >
          <span className="truncate">إضافة إلى السلة</span>
        </button>
      </div>
    </motion.div>
  );
}
