import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Check } from 'lucide-react';
import { Product, Addon } from '../types.ts';
import { AVAILABLE_ADDONS } from '../data/products.ts';
import { DrinkCupGraphic, DaisyFlower, Butterfly } from './Decorations.tsx';

interface AddonModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmAddToCart: (product: Product, selectedAddons: Addon[]) => void;
  availableAddons?: Addon[];
}

export function AddonModal({
  product,
  isOpen,
  onClose,
  onConfirmAddToCart,
  availableAddons,
}: AddonModalProps) {
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);

  const addonsList = availableAddons && availableAddons.length > 0 ? availableAddons : AVAILABLE_ADDONS;

  // Reset selected addons when modal opens with a new product
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAddons([]);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const toggleAddon = (addon: Addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const totalItemPrice = product.basePrice + addonsTotal;

  const handleConfirm = () => {
    onConfirmAddToCart(product, selectedAddons);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          id="addon-modal-container"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#2D3F22]/30 backdrop-blur-xs"
          />

          {/* Modal Bottom Sheet on Mobile / Centered Card on Desktop */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-md bg-[#FDFDFD] rounded-t-[36px] sm:rounded-[40px] shadow-2xl border-4 border-[#D7E7C8] max-h-[88vh] flex flex-col overflow-hidden z-10"
            id="addon-modal-content"
          >
            {/* Header with drink preview */}
            <div className="relative p-5 pb-3 bg-gradient-to-b from-[#F1F8E9]/60 to-[#FDFDFD] border-b border-[#D7E7C8]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-16 bg-[#F1F8E9] rounded-2xl flex items-center justify-center border border-[#D7E7C8]/50 overflow-hidden p-1 shadow-inner">
                  <DrinkCupGraphic type={product.type} size={product.size} className="w-12 h-14" />
                </div>
                <div>
                  <h3 className="font-marhey text-lg sm:text-xl font-bold text-[#7A8E68]">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    السعر الأساسي: <span className="font-bold text-[#5D6D4E]">{product.basePrice} ﷼</span>
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-[#7A8E68] hover:text-[#5D6D4E] hover:bg-[#F1F8E9] rounded-full transition-colors"
                aria-label="إغلاق"
                id="addon-modal-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subheading */}
            <div className="px-6 pt-3 pb-1 bg-[#FDFDFD] text-center sm:text-right">
              <h4 className="text-base font-bold text-[#7A8E68] font-marhey">
                اختيارات الإضافات
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                خصص مشروبك المفضل
              </p>
            </div>

            {/* Scrollable list of addons from Firestore */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1" id="addon-items-list">
              {addonsList.map((addon) => {
                const isSelected = selectedAddons.some((a) => a.id === addon.id);

                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => toggleAddon(addon)}
                    className={`w-full p-3.5 rounded-2xl border transition-all text-right flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#F1F8E9] border-[#D7E7C8] shadow-xs'
                        : 'bg-white border-gray-100 hover:bg-[#FAFDF6] hover:border-[#D7E7C8]/40'
                    }`}
                    id={`addon-item-${addon.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-[#7A8E68] border-[#7A8E68] text-white'
                            : 'border-gray-200 bg-white text-transparent'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-medium text-sm text-[#5D6D4E]">
                          {addon.name}
                        </span>
                        {addon.category && (
                          <span className="text-[11px] text-gray-400 font-normal">
                            {addon.category === 'Milk' ? 'الحليب (Milk)' : addon.category === 'Foam' ? 'الفوم (Foam)' : addon.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-sm font-bold ${
                        addon.price === 0 ? 'text-green-600' : 'text-pink-400'
                      }`}
                    >
                      {addon.price === 0 ? 'مجانًا' : `${addon.price} ﷼`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer with Total and Add to Cart confirmation button */}
            <div className="p-4 sm:p-5 bg-white border-t border-[#D7E7C8]/40 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              <div className="flex items-center justify-between px-1 text-xs sm:text-sm">
                <span className="text-gray-500 font-medium">الإجمالي مع الإضافات:</span>
                <span className="font-bold text-base sm:text-lg text-[#5D6D4E]">
                  {totalItemPrice} ﷼
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-3.5 sm:py-4 bg-[#7A8E68] hover:bg-[#6A7E58] active:scale-98 text-white rounded-2xl sm:rounded-3xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base min-h-[44px]"
                id="addon-confirm-add-btn"
              >
                <span>إضافة إلى السلة</span>
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full">
                  ({totalItemPrice} ﷼)
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
