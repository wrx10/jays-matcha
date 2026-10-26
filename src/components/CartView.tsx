import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Plus, Minus, Banknote, ShoppingBag, Check, Loader2, AlertCircle, QrCode, Truck, Store } from 'lucide-react';
import { CartItem, UserProfile, FulfillmentMethod } from '../types.ts';
import { DrinkCupGraphic, DaisyFlower } from './Decorations.tsx';
import { createCustomerOrder } from '../firebase.ts';

interface CartViewProps {
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onGoToHome: () => void;
  currentUser?: UserProfile | null;
  onOpenLogin?: () => void;
  onClearCart?: () => void;
}

export function CartView({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onGoToHome,
  currentUser = null,
  onOpenLogin,
  onClearCart,
}: CartViewProps) {
  const [orderConfirmation, setOrderConfirmation] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod | null>(null);

  // مجموع المنتجات يتغير تلقائيًا حسب المنتجات الموجودة فعليًا في السلة، مع احتساب الإضافات المختارة لكل منتج
  const calculateItemUnitPrice = (item: CartItem) => {
    const addonsTotal = item.selectedAddons.reduce((sum, a) => sum + a.price, 0);
    return item.product.basePrice + addonsTotal;
  };

  const calculateItemTotal = (item: CartItem) => {
    return calculateItemUnitPrice(item) * item.quantity;
  };

  const overallTotal = items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );

  const handleCompleteOrder = async () => {
    if (items.length === 0) return;

    if (!currentUser) {
      setOrderError('يرجى تسجيل الدخول أولاً لإتمام الطلب وربطه بحسابك الشخصي.');
      if (onOpenLogin) onOpenLogin();
      return;
    }

    if (!fulfillmentMethod) {
      setOrderError('يرجى اختيار طريقة الاستلام (توصيل إلى المنزل أو استلام من المتجر) قبل إتمام الطلب.');
      const section = document.getElementById('cart-fulfillment-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setOrderError(null);
    setIsSubmitting(true);

    try {
      const productsOrdered = items.map((item) => {
        const addonsSum = item.selectedAddons.reduce((sum, a) => sum + a.price, 0);
        return {
          productId: item.product.id,
          productName: item.product.name,
          unitPrice: item.product.basePrice,
          quantity: item.quantity,
          selectedAddons: item.selectedAddons,
          totalItemPrice: (item.product.basePrice + addonsSum) * item.quantity,
        };
      });

      const totalQuantities = items.reduce((sum, item) => sum + item.quantity, 0);

      const orderId = await createCustomerOrder({
        customerUid: currentUser.uid,
        customerFullName: currentUser.fullName,
        customerEmail: currentUser.email || undefined,
        productsOrdered,
        quantities: totalQuantities,
        totalPrice: overallTotal,
        orderStatus: 'pending',
        paymentStatus: paymentMethod === 'cash' ? 'cash_on_delivery' : 'pending',
        paymentMethod: paymentMethod,
        fulfillmentMethod: fulfillmentMethod,
        createdTimestamp: new Date().toISOString(),
      });

      if (onClearCart) onClearCart();
      setFulfillmentMethod(null);
      setOrderConfirmation(`تم استلام طلبك بنجاح! رقم الطلب: ${orderId.slice(0, 8)} ✿ شكراً لاختيارك Jay’s Matcha`);
      setTimeout(() => {
        setOrderConfirmation(null);
      }, 6000);
    } catch (err) {
      console.error('Order creation error:', err);
      setOrderError('تعذر إرسال الطلب. يرجى التأكد من الاتصال والمحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-32 sm:pb-28" id="cart-view-container">
      {/* Title */}
      <div className="text-center mb-5 sm:mb-8 relative">
        <div className="inline-block relative">
          <h2 className="font-marhey text-2xl sm:text-3xl font-bold text-[#445B32]">
            سلة المشتريات
          </h2>
          <div className="absolute -top-3 -right-6 pointer-events-none opacity-80">
            <DaisyFlower className="w-5 h-5 sm:w-6 sm:h-6" petalColor="#FFE6EE" centerColor="#F9E79F" />
          </div>
        </div>
      </div>

      {orderError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-[#5D6D4E] flex items-center justify-center gap-2 shadow-xs text-center font-bold text-sm"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{orderError}</span>
        </motion.div>
      )}

      {orderConfirmation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-6 p-4 rounded-2xl bg-[#F1F8E9] border-2 border-[#D7E7C8] text-[#445B32] flex items-center justify-center gap-2 shadow-xs text-center font-bold text-sm"
        >
          <Check className="w-5 h-5 text-[#7A8E68] shrink-0" />
          <span>{orderConfirmation}</span>
        </motion.div>
      )}

      {items.length === 0 ? (
        /* Empty Cart State */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFFDF9]/95 rounded-3xl p-8 sm:p-12 text-center border-2 border-[#D7E7C8] vintage-card-shadow"
          id="cart-empty-state"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#F2F7EC] flex items-center justify-center text-[#7A8E68] border border-[#D7E7C8]">
            <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
          </div>
          <h3 className="font-marhey text-lg font-bold text-[#445B32] mb-2">السلة فارغة حالياً</h3>
          <p className="text-sm text-gray-500 mb-6">
            لم تقم بإضافة أي مشروب ماتشا إلى السلة بعد.
          </p>
          <button
            onClick={onGoToHome}
            className="py-3 px-8 rounded-full bg-[#F8BBD0] hover:bg-[#F06292] text-white font-bold text-sm transition-all shadow-md active:scale-98 cursor-pointer"
            id="cart-back-to-home-btn"
          >
            تصفح قائمة الماتشا
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Cart Items List */}
          <div className="space-y-4" id="cart-items-list">
            <AnimatePresence>
              {items.map((item) => {
                const addonsPriceTotal = item.selectedAddons.reduce(
                  (sum, a) => sum + a.price,
                  0
                );
                const itemUnitPrice = calculateItemUnitPrice(item);
                const itemTotal = calculateItemTotal(item);

                return (
                  <motion.div
                    key={item.cartItemId}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#FFFDF9]/95 rounded-3xl p-4 sm:p-5 border-2 border-[#D7E7C8] vintage-card-shadow relative"
                    id={`cart-item-${item.cartItemId}`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-20 bg-[#F2F7EC] rounded-2xl flex items-center justify-center border border-[#D7E7C8]/70 shrink-0 p-1 shadow-inner">
                        <DrinkCupGraphic
                          type={item.product.type}
                          size={item.product.size}
                          className="w-12 h-16"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-marhey text-base font-bold text-[#445B32]">
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              سعر المنتج: <span className="font-bold text-[#7A8E68]">{item.product.basePrice} ﷼</span>
                            </p>
                          </div>

                          {/* Delete Item Button */}
                          <button
                            onClick={() => onRemoveItem(item.cartItemId)}
                            className="p-1.5 text-gray-400 hover:text-[#C2395A] hover:bg-[#FFE8EE] rounded-xl transition-colors cursor-pointer"
                            aria-label="حذف"
                            id={`cart-item-delete-${item.cartItemId}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Selected Add-ons with prices */}
                        <div className="mt-3 pt-2.5 border-t border-[#F1F8E9]">
                          <span className="text-xs font-semibold text-[#556F43] block mb-1.5">
                            الإضافات المختارة:
                          </span>
                          {item.selectedAddons.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {item.selectedAddons.map((addon, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2.5 py-1 rounded-full bg-[#F1F8E9] text-[#445B32] border border-[#D7E7C8] flex items-center gap-1 font-medium"
                                >
                                  <span>{addon.name}</span>
                                  <span className={`text-[11px] font-bold ${addon.price === 0 ? 'text-green-600' : 'text-pink-500'}`}>
                                    ({addon.price === 0 ? 'Free' : `${addon.price} ﷼`})
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              بدون إضافات
                            </span>
                          )}

                          {item.selectedAddons.length > 0 && (
                            <p className="text-[11px] text-gray-500 mt-1.5">
                              إجمالي أسعار الإضافات: <span className="font-bold text-[#445B32]">{addonsPriceTotal} ﷼</span>
                            </p>
                          )}
                        </div>

                        {/* Quantity & Item Total */}
                        <div className="mt-3 pt-2.5 border-t border-[#F1F8E9] flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-[#F1F8E9] p-1 rounded-full border border-[#D7E7C8]">
                            <button
                              onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                              className="w-8 h-8 rounded-full bg-white text-[#445B32] hover:bg-[#E8F0DC] flex items-center justify-center border border-[#D7E7C8] transition-colors shadow-2xs cursor-pointer active:scale-95"
                              id={`cart-qty-minus-${item.cartItemId}`}
                              aria-label="تقليل الكمية"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-7 text-center text-xs sm:text-sm font-bold text-[#445B32]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                              className="w-8 h-8 rounded-full bg-white text-[#445B32] hover:bg-[#E8F0DC] flex items-center justify-center border border-[#D7E7C8] transition-colors shadow-2xs cursor-pointer active:scale-95"
                              id={`cart-qty-plus-${item.cartItemId}`}
                              aria-label="زيادة الكمية"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="text-left">
                            <span className="text-[11px] sm:text-xs text-gray-400 block">الإجمالي:</span>
                            <span className="font-bold text-sm sm:text-base text-[#445B32]">
                              {itemTotal} ﷼
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Cart Overall Summary Card */}
          <div className="bg-[#FFFDF9]/95 rounded-3xl p-5 border-2 border-[#D7E7C8] vintage-card-shadow space-y-3" id="cart-summary-card">
            <div className="flex items-center justify-between text-sm text-gray-600 font-medium">
              <span>مجموع المنتجات:</span>
              <span className="font-bold text-base text-[#445B32]">{overallTotal} ﷼</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold text-[#445B32] pt-2 border-t border-[#F1F8E9]">
              <span>الإجمالي الكلي:</span>
              <span className="text-xl text-[#7A8E68]">{overallTotal} ﷼</span>
            </div>
          </div>

          {/* Fulfillment Method Section: Delivery or Pickup */}
          <div className="bg-[#FFFDF9]/95 rounded-3xl p-5 sm:p-6 border-2 border-[#D7E7C8] vintage-card-shadow space-y-4" id="cart-fulfillment-section">
            <div className="flex items-center justify-between">
              <h3 className="font-marhey text-lg font-bold text-[#445B32]">طريقة الاستلام</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                fulfillmentMethod
                  ? 'bg-[#E8F0DC] text-[#445B32]'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {fulfillmentMethod ? 'تم الاختيار' : 'مطلوب تحديد الخيار'}
              </span>
            </div>

            {/* Fulfillment Methods Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="fulfillment-methods-selector">
              {/* Option 1: Delivery */}
              <button
                type="button"
                onClick={() => {
                  setFulfillmentMethod('delivery');
                  if (orderError?.includes('طريقة الاستلام')) setOrderError(null);
                }}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer text-right ${
                  fulfillmentMethod === 'delivery'
                    ? 'border-[#7A8E68] bg-[#F1F8E9] shadow-xs'
                    : 'border-[#E0ECD5] bg-white hover:bg-[#FBFDF9]'
                }`}
                id="fulfillment-method-delivery"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${
                    fulfillmentMethod === 'delivery'
                      ? 'bg-white border-[#D7E7C8] text-[#7A8E68]'
                      : 'bg-[#F9FBF6] border-gray-200 text-gray-400'
                  }`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm sm:text-base block text-[#445B32]">توصيل إلى المنزل</span>
                    <span className="text-[11px] sm:text-xs text-[#6A7E58]">توصيل الطلب مباشرة لموقعك</span>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  fulfillmentMethod === 'delivery'
                    ? 'border-[#7A8E68] bg-[#7A8E68] text-white'
                    : 'border-gray-300 bg-white'
                }`}>
                  {fulfillmentMethod === 'delivery' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* Option 2: Pickup */}
              <button
                type="button"
                onClick={() => {
                  setFulfillmentMethod('pickup');
                  if (orderError?.includes('طريقة الاستلام')) setOrderError(null);
                }}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer text-right ${
                  fulfillmentMethod === 'pickup'
                    ? 'border-[#7A8E68] bg-[#F1F8E9] shadow-xs'
                    : 'border-[#E0ECD5] bg-white hover:bg-[#FBFDF9]'
                }`}
                id="fulfillment-method-pickup"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${
                    fulfillmentMethod === 'pickup'
                      ? 'bg-white border-[#D7E7C8] text-[#7A8E68]'
                      : 'bg-[#F9FBF6] border-gray-200 text-gray-400'
                  }`}>
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm sm:text-base block text-[#445B32]">استلام من المتجر</span>
                    <span className="text-[11px] sm:text-xs text-[#6A7E58]">استلام الماتشا بنفسك من الفرع</span>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  fulfillmentMethod === 'pickup'
                    ? 'border-[#7A8E68] bg-[#7A8E68] text-white'
                    : 'border-gray-300 bg-white'
                }`}>
                  {fulfillmentMethod === 'pickup' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>

          {/* Payment Method Section: Cash and Bank Transfer */}
          <div className="bg-[#FFFDF9]/95 rounded-3xl p-5 sm:p-6 border-2 border-[#D7E7C8] vintage-card-shadow space-y-4" id="cart-payment-section">
            <div>
              <h3 className="font-marhey text-lg font-bold text-[#445B32]">طريقة الدفع</h3>
            </div>

            {/* Payment Methods Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="payment-methods-selector">
              {/* Option 1: Cash */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer text-right ${
                  paymentMethod === 'cash'
                    ? 'border-[#7A8E68] bg-[#F1F8E9] shadow-xs'
                    : 'border-[#E0ECD5] bg-white hover:bg-[#FBFDF9]'
                }`}
                id="payment-method-cash"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${
                    paymentMethod === 'cash'
                      ? 'bg-white border-[#D7E7C8] text-[#7A8E68]'
                      : 'bg-[#F9FBF6] border-gray-200 text-gray-400'
                  }`}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm sm:text-base block text-[#445B32]">Cash</span>
                    <span className="text-[11px] sm:text-xs text-[#6A7E58]">الدفع نقداً عند الاستلام</span>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'cash'
                    ? 'border-[#7A8E68] bg-[#7A8E68] text-white'
                    : 'border-gray-300 bg-white'
                }`}>
                  {paymentMethod === 'cash' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* Option 2: Bank Transfer */}
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer text-right ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-[#7A8E68] bg-[#F1F8E9] shadow-xs'
                    : 'border-[#E0ECD5] bg-white hover:bg-[#FBFDF9]'
                }`}
                id="payment-method-bank-transfer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-white border-[#D7E7C8] text-[#7A8E68]'
                      : 'bg-[#F9FBF6] border-gray-200 text-gray-400'
                  }`}>
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm sm:text-base block text-[#445B32]">Bank Transfer</span>
                    <span className="text-[11px] sm:text-xs text-[#6A7E58]">تحويل بنكي عبر الباركود</span>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-[#7A8E68] bg-[#7A8E68] text-white'
                    : 'border-gray-300 bg-white'
                }`}>
                  {paymentMethod === 'bank_transfer' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>

            {/* Bank Transfer QR Code Display */}
            {paymentMethod === 'bank_transfer' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 sm:p-6 bg-white rounded-2xl border-2 border-[#D7E7C8] text-center space-y-3 shadow-inner"
                id="bank-transfer-qr-display"
              >
                <div className="flex justify-center items-center">
                  <img
                    src="/assets/aistudio/cdcc5d7c-f3b5-4d38-b778-be18a6571c3e_4c410d8a.jpeg"
                    alt="باركود التحويل البنكي - QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-2xl bg-white border-2 border-[#D7E7C8]/70 p-2.5 shadow-xs mx-auto aspect-square select-none"
                    loading="eager"
                  />
                </div>
              </motion.div>
            )}

            {/* Complete Order Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={isSubmitting}
                className="w-full py-4 bg-[#7A8E68] hover:bg-[#687C57] text-white rounded-2xl font-bold text-base shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                id="btn-complete-order"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري إرسال الطلب...</span>
                  </>
                ) : (
                  <span>إتمام الطلب</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
