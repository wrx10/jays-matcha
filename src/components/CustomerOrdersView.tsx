import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PackageCheck,
  Truck,
  Store,
  ShoppingBag,
  ArrowRight,
  User,
  Banknote,
  QrCode,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { CustomerOrder, OrderStatus, UserProfile, FulfillmentMethod } from '../types.ts';
import { subscribeToCustomerOrders } from '../firebase.ts';
import { DaisyFlower, DrinkCupGraphic } from './Decorations.tsx';

interface CustomerOrdersViewProps {
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onGoToHome: () => void;
}

const ORDER_STATUS_CONFIG: Record<
  OrderStatus | 'pending',
  { label: string; bg: string; text: string; border: string; dotColor: string }
> = {
  New: {
    label: 'قيد الانتظار (جديد)',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dotColor: 'bg-amber-500 animate-pulse',
  },
  pending: {
    label: 'قيد الانتظار',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dotColor: 'bg-amber-500 animate-pulse',
  },
  Accepted: {
    label: 'مقبول (Accepted)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  Preparing: {
    label: 'قيد التحضير (Preparing)',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dotColor: 'bg-purple-500 animate-pulse',
  },
  Ready: {
    label: 'جاهز للاستلام / التوصيل',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dotColor: 'bg-teal-500',
  },
  Completed: {
    label: 'مكتمل (Completed)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dotColor: 'bg-emerald-600',
  },
  Rejected: {
    label: 'مرفوض (Rejected)',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-300',
    dotColor: 'bg-rose-500',
  },
};

const FULFILLMENT_CONFIG: Record<
  FulfillmentMethod,
  { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string }
> = {
  delivery: {
    label: 'توصيل إلى المنزل',
    icon: Truck,
    bg: 'bg-[#F1F8E9]',
    text: 'text-[#445B32]',
    border: 'border-[#D7E7C8]',
  },
  pickup: {
    label: 'استلام من المتجر',
    icon: Store,
    bg: 'bg-[#FFF9E6]',
    text: 'text-[#6D5220]',
    border: 'border-[#F0E0B0]',
  },
};

export function CustomerOrdersView({
  currentUser,
  onOpenLogin,
  onGoToHome,
}: CustomerOrdersViewProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Subscribe to real-time orders directly from Firestore
  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToCustomerOrders(
      currentUser.uid,
      (userOrders) => {
        setOrders(userOrders);
        setIsLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe to customer orders:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Guest State: User is not logged in
  if (!currentUser) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12 sm:py-16 text-center" id="orders-guest-view" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFFDF9]/95 rounded-3xl p-6 sm:p-10 border-2 border-[#D7E7C8] vintage-card-shadow space-y-5"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-[#F1F8E9] border-2 border-[#D7E7C8] flex items-center justify-center text-[#7A8E68]">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-marhey text-xl sm:text-2xl font-bold text-[#445B32]">
              سجل طلباتي
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
              يرجى تسجيل الدخول بحسابك لعرض ومتابعة جميع طلباتك السابقة ومعرفة حالتها المباشرة من المتجر.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full sm:w-auto py-3 px-8 rounded-full bg-[#7A8E68] hover:bg-[#687C57] text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              id="orders-login-btn"
            >
              <User className="w-4 h-4" />
              <span>تسجيل الدخول / إنشاء حساب</span>
            </button>
            <button
              type="button"
              onClick={onGoToHome}
              className="w-full sm:w-auto py-3 px-6 rounded-full bg-white border border-[#D7E7C8] text-[#445B32] hover:bg-[#F2F7EC] font-bold text-sm transition-all cursor-pointer"
            >
              العودة إلى المتجر
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28 text-right" id="customer-orders-view" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 pb-3 sm:pb-4 border-b-2 border-[#D7E7C8]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-[#F1F8E9] border border-[#D7E7C8] flex items-center justify-center text-[#7A8E68] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-marhey text-lg sm:text-2xl font-bold text-[#445B32]">
              طلباتي السابقة
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500">
              تتبع فوري ومباشر لجميع طلباتك المسجلة في Jay’s Matcha
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToHome}
          className="inline-flex items-center gap-1.5 bg-[#FFFDF9] border border-[#D7E7C8] text-[#445B32] px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold hover:bg-[#F2F7EC] transition-all cursor-pointer shrink-0 shadow-2xs"
          id="btn-back-to-menu-from-orders"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>تصفح الماتشا</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 space-y-3">
          <div className="w-10 h-10 border-3 border-[#7A8E68] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">جاري جلب طلباتك المسجلة من Firebase...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#FFFDF9]/95 rounded-3xl p-8 sm:p-12 text-center border-2 border-[#D7E7C8] vintage-card-shadow space-y-4"
          id="orders-empty-state"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-[#F1F8E9] border border-[#D7E7C8] flex items-center justify-center text-[#7A8E68]">
            <ShoppingBag className="w-8 h-8 opacity-75" />
          </div>

          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="font-marhey text-lg sm:text-xl font-bold text-[#445B32]">
              لا توجد طلبات سابقة حتى الآن
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              لم تقم بإنشاء أي طلب بعد. تصفح قائمتنا الفاخرة واختر ماتشاك المفضلة وسنبدأ بتحضيرها لك بكل حب!
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onGoToHome}
              className="py-3 px-8 rounded-full bg-[#7A8E68] hover:bg-[#687C57] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer"
            >
              اطلب الآن من القائمة ✿
            </button>
          </div>
        </motion.div>
      )}

      {/* Orders List */}
      {!isLoading && orders.length > 0 && (
        <div className="space-y-4 sm:space-y-5" id="customer-orders-list">
          {orders.map((order) => {
            const currentStatus = order.orderStatus || 'New';
            const statusConfig = ORDER_STATUS_CONFIG[currentStatus] || ORDER_STATUS_CONFIG.New;
            const fulfillment = order.fulfillmentMethod || 'delivery';
            const fulfillmentConfig = FULFILLMENT_CONFIG[fulfillment] || FULFILLMENT_CONFIG.delivery;
            const FulfillmentIcon = fulfillmentConfig.icon;

            const formattedDate = new Date(order.createdTimestamp).toLocaleString('ar-SA', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FFFDF9]/95 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-[#D7E7C8] vintage-card-shadow space-y-4 transition-all"
                id={`customer-order-${order.id}`}
              >
                {/* Order Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-[#F1F8E9]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-marhey font-bold text-sm sm:text-base text-[#445B32]">
                        طلب #{order.id?.slice(0, 8)}
                      </span>

                      {/* Live Order Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold border transition-colors ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`} />
                        <span>{statusConfig.label}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formattedDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* Fulfillment Method Badge (توصيل إلى المنزل / استلام من المتجر) */}
                  <div className="self-start sm:self-auto">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold border ${fulfillmentConfig.bg} ${fulfillmentConfig.text} ${fulfillmentConfig.border}`}
                    >
                      <FulfillmentIcon className="w-3.5 h-3.5" />
                      <span>{fulfillmentConfig.label}</span>
                    </span>
                  </div>
                </div>

                {/* Ordered Products Section */}
                <div className="space-y-2 bg-[#FBFDF8] p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#D7E7C8]/60">
                  <div className="text-xs font-bold text-[#556F43] flex items-center justify-between pb-1 border-b border-[#D7E7C8]/40">
                    <span>المنتجات المطلوبة ({order.quantities} مشروبات):</span>
                    <span>السعر</span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {order.productsOrdered.map((item, idx) => (
                      <div key={idx} className="py-2 text-xs flex justify-between items-start text-gray-700">
                        <div className="space-y-0.5">
                          <span className="font-bold text-[#445B32] block sm:inline">
                            {item.quantity}× {item.productName}
                          </span>
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="text-gray-500 text-[11px] flex flex-wrap gap-1 mt-0.5">
                              {item.selectedAddons.map((addon, aIdx) => (
                                <span key={aIdx} className="bg-[#F1F8E9] px-1.5 py-0.2 rounded border border-[#D7E7C8]/50">
                                  {addon.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-[#7A8E68] shrink-0 mr-3">
                          {item.totalItemPrice} ﷼
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Footer with Payment Method & Total */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  {/* Payment Details */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400">طريقة الدفع:</span>
                    <span className="font-bold text-[#445B32] inline-flex items-center gap-1 bg-[#F1F8E9] px-2.5 py-1 rounded-lg border border-[#D7E7C8]">
                      {order.paymentMethod === 'bank_transfer' ? (
                        <>
                          <QrCode className="w-3.5 h-3.5 text-[#7A8E68]" />
                          <span>تحويل بنكي</span>
                        </>
                      ) : (
                        <>
                          <Banknote className="w-3.5 h-3.5 text-[#7A8E68]" />
                          <span>الدفع عند الاستلام (Cash)</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Total Price */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-xs text-gray-500 font-medium">الإجمالي:</span>
                    <span className="font-marhey text-lg sm:text-xl font-bold text-[#7A8E68]">
                      {order.totalPrice} ﷼
                    </span>
                  </div>
                </div>

                {/* Live Tracking Information Strip */}
                <div className="text-[11px] text-gray-500 bg-[#F5F8F1] px-3 py-1.5 rounded-lg border border-[#E0ECCF] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#7A8E68] shrink-0" />
                  <span>
                    حالة الطلب مربوطة بشكل مباشر مع المتجر وتتحدث تلقائياً وفورياً عند أي تغيير.
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
