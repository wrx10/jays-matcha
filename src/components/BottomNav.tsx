import React from 'react';
import { Home, ShoppingBag, Clock } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'cart' | 'orders';
  onTabChange: (tab: 'home' | 'cart' | 'orders') => void;
  cartCount: number;
  ordersCount?: number;
}

export function BottomNav({ activeTab, onTabChange, cartCount, ordersCount }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 sm:h-20 bg-[#FFFDF9]/95 backdrop-blur-md border-t-2 border-[#D7E7C8] flex justify-around items-center px-4 sm:px-10 z-40 shadow-md pb-[env(safe-area-inset-bottom,0px)]"
      id="bottom-nav-bar"
    >
      {/* 1. الرئيسية */}
      <button
        type="button"
        onClick={() => onTabChange('home')}
        className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-colors cursor-pointer py-1 px-3 sm:px-6 min-h-[44px] ${
          activeTab === 'home' ? 'text-[#445B32]' : 'text-gray-400 hover:text-[#5D6D4E]'
        }`}
        id="bottom-nav-home-btn"
      >
        <Home className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
        <span className="text-[11px] sm:text-xs font-bold font-marhey">الرئيسية</span>
      </button>

      {/* 2. الطلبات */}
      <button
        type="button"
        onClick={() => onTabChange('orders')}
        className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-colors cursor-pointer py-1 px-3 sm:px-6 min-h-[44px] ${
          activeTab === 'orders' ? 'text-[#445B32]' : 'text-gray-400 hover:text-[#5D6D4E]'
        }`}
        id="bottom-nav-orders-btn"
      >
        <div className="relative">
          <Clock className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
          {ordersCount !== undefined && ordersCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-[#7A8E68] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
              {ordersCount}
            </span>
          )}
        </div>
        <span className="text-[11px] sm:text-xs font-bold font-marhey">الطلبات</span>
      </button>

      {/* 3. السلة */}
      <button
        type="button"
        onClick={() => onTabChange('cart')}
        className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-colors cursor-pointer py-1 px-3 sm:px-6 min-h-[44px] ${
          activeTab === 'cart' ? 'text-[#445B32]' : 'text-gray-400 hover:text-[#5D6D4E]'
        }`}
        id="bottom-nav-cart-btn"
      >
        <div className="relative">
          <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-[#F8BBD0] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[11px] sm:text-xs font-bold font-marhey">السلة</span>
      </button>
    </nav>
  );
}
