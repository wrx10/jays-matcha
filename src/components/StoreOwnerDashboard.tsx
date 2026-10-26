import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  X,
  Check,
  User,
  Mail,
  Banknote,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import { CustomerOrder, OrderStatus, UserProfile } from '../types.ts';
import {
  FirestoreProductDoc,
  subscribeToStoreOrders,
  updateOrderStatus,
  deleteOrderFromFirestore,
  deleteAllOrdersFromFirestore,
  updateProductInFirestore,
  addProductToFirestore,
  deleteProductFromFirestore,
  isStoreOwner,
  registerStoreOwnerPushSubscription,
  registerStoreOwnerFcmToken,
  onForegroundFcmMessage,
} from '../firebase.ts';
import { DaisyFlower } from './Decorations.tsx';

interface StoreOwnerDashboardProps {
  currentUser: UserProfile | null;
  firestoreProducts: FirestoreProductDoc[];
  onBackToStore: () => void;
  focusedOrderId?: string | null;
}

const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
  New: { label: 'جديد (New)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Accepted: { label: 'تم القبول (Accepted)', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Preparing: { label: 'قيد التحضير (Preparing)', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Ready: { label: 'جاهز (Ready)', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  Completed: { label: 'مكتمل (Completed)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Rejected: { label: 'مرفوض (Rejected)', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Non-blocking
  }
}

export function StoreOwnerDashboard({
  currentUser,
  firestoreProducts,
  onBackToStore,
  focusedOrderId,
}: StoreOwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  });
  const [hasDismissedPrompt, setHasDismissedPrompt] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('store_owner_notif_prompt_dismissed') === 'true';
    }
    return false;
  });
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Product management modal states
  const [editingProduct, setEditingProduct] = useState<FirestoreProductDoc | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState<number | ''>('');
  const [newProductCategory, setNewProductCategory] = useState<'drinks' | 'milk_options' | 'add_ons'>('drinks');
  const [newProductSize, setNewProductSize] = useState<'regular' | 'large'>('regular');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Tracking known orders to detect only brand-new orders (no old orders, no duplicates)
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Auto-register Web Push subscription if permission was previously granted
  useEffect(() => {
    if (isStoreOwner(currentUser) && notificationPermission === 'granted') {
      registerStoreOwnerPushSubscription(currentUser).catch((e) => console.log('Push subscription:', e));
    }
  }, [currentUser, notificationPermission]);

  // Handle request for notification permission
  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setIsRequestingPermission(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted' && currentUser) {
        await registerStoreOwnerPushSubscription(currentUser);
        showFeedback('تم تفعيل إشعارات الطلبات الجديدة بنجاح! ✿');
      } else if (permission === 'denied') {
        localStorage.setItem('store_owner_notif_prompt_dismissed', 'true');
        setHasDismissedPrompt(true);
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleDismissNotificationPrompt = () => {
    localStorage.setItem('store_owner_notif_prompt_dismissed', 'true');
    setHasDismissedPrompt(true);
  };

  // Real-time listener for all store orders with new order detection
  useEffect(() => {
    if (!isStoreOwner(currentUser)) return;

    const unsubscribe = subscribeToStoreOrders((realOrders) => {
      // First load: store all existing IDs to avoid notifying on old orders
      if (!initialLoadDoneRef.current) {
        realOrders.forEach((o) => {
          if (o.id) knownOrderIdsRef.current.add(o.id);
        });
        initialLoadDoneRef.current = true;
      } else {
        // Subsequent updates: check for brand new incoming orders
        const newIncomingOrders = realOrders.filter(
          (o) => o.id && !knownOrderIdsRef.current.has(o.id)
        );

        if (newIncomingOrders.length > 0) {
          newIncomingOrders.forEach((newOrder) => {
            if (newOrder.id) knownOrderIdsRef.current.add(newOrder.id);

            // Requirement 4: Trigger push notification for store owner
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              try {
                const notif = new Notification('New Order', {
                  body: 'A new order has been received.',
                  icon: '/favicon.svg',
                  tag: `order-${newOrder.id}`,
                });
                notif.onclick = () => {
                  window.focus();
                  setSelectedOrder(newOrder);
                };
              } catch (e) {
                console.log('Foreground notification dispatch:', e);
              }
            }
          });

          // Play pleasant notification chime
          playNotificationChime();
          const latestOrder = newIncomingOrders[0];
          showFeedback(`طلب جديد وارد! #${latestOrder.id?.slice(0, 8)} (${latestOrder.totalPrice} ﷼)`);
        }
      }

      setOrders(realOrders);

      // Keep selected order in sync if currently viewed
      setSelectedOrder((prev) => {
        if (!prev || !prev.id) return null;
        const updated = realOrders.find((o) => o.id === prev.id);
        return updated || prev;
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to foreground FCM push messages
  useEffect(() => {
    if (!isStoreOwner(currentUser)) return;
    const unsub = onForegroundFcmMessage((payload) => {
      console.log('Foreground FCM message received:', payload);
      playNotificationChime();
      const title = payload.notification?.title || payload.data?.title || 'New Order';
      const body = payload.notification?.body || payload.data?.body || 'A new order has been received.';
      showFeedback(`${title}: ${body}`);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [currentUser]);

  // Auto-focus order if requested via notification click
  useEffect(() => {
    if (focusedOrderId && orders.length > 0) {
      const match = orders.find((o) => o.id === focusedOrderId);
      if (match) setSelectedOrder(match);
    }
  }, [focusedOrderId, orders]);

  // Authorization Guard
  if (!currentUser || !isStoreOwner(currentUser)) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center" id="unauthorized-dashboard">
        <div className="bg-[#FFFDF9]/95 rounded-3xl p-8 border-2 border-[#D7E7C8] vintage-card-shadow space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-marhey text-2xl font-bold text-[#445B32]">
            منطقة مخصصة لصاحب المتجر فقط
          </h2>
          <p className="text-sm text-gray-600">
            هذه اللوحة محمية وتتطلب تسجيل الدخول بحساب مالك متجر Jay’s Matcha المعتمد.
          </p>
          <button
            type="button"
            onClick={onBackToStore}
            className="py-3 px-8 rounded-full bg-[#7A8E68] hover:bg-[#687C57] text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer"
          >
            العودة إلى المتجر
          </button>
        </div>
      </div>
    );
  }

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdatingStatus(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      showFeedback(`تم تحديث حالة الطلب إلى "${ORDER_STATUS_LABELS[newStatus].label}"`);
    } catch (err) {
      console.error('Failed to update status:', err);
      showFeedback('تعذر تحديث حالة الطلب في Firebase');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const [isDeletingOrder, setIsDeletingOrder] = useState<string | null>(null);
  const [isDeletingAllOrders, setIsDeletingAllOrders] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<CustomerOrder | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  // Confirm delete single order
  const handleConfirmDeleteSingleOrder = async () => {
    if (!orderToDelete || !orderToDelete.id) return;
    const orderId = orderToDelete.id;
    setIsDeletingOrder(orderId);
    try {
      await deleteOrderFromFirestore(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);
      showFeedback('تم حذف الطلب بنجاح من قاعدة البيانات');
    } catch (err) {
      console.error('Failed to delete order:', err);
      showFeedback('تعذر حذف الطلب من Firebase');
    } finally {
      setIsDeletingOrder(null);
    }
  };

  // Confirm delete all orders
  const handleConfirmDeleteAllOrders = async () => {
    setIsDeletingAllOrders(true);
    try {
      await deleteAllOrdersFromFirestore(orders);
      setOrders([]);
      setSelectedOrder(null);
      setShowDeleteAllModal(false);
      showFeedback('تم حذف جميع الطلبات بنجاح من قاعدة البيانات');
    } catch (err) {
      console.error('Failed to delete all orders:', err);
      showFeedback('تعذر حذف جميع الطلبات من Firebase');
    } finally {
      setIsDeletingAllOrders(false);
    }
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSavingProduct(true);
    try {
      await updateProductInFirestore(editingProduct.id, {
        name: editingProduct.name.trim(),
        price: Number(editingProduct.price),
        available: editingProduct.available,
      });
      showFeedback(`تم تحديث سعر وبيانات المنتج "${editingProduct.name}" بنجاح في Firebase`);
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to edit product:', err);
      showFeedback('تعذر حفظ تعديل المنتج في Firebase');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || newProductPrice === '') return;
    setIsSavingProduct(true);
    try {
      await addProductToFirestore({
        name: newProductName.trim(),
        price: Number(newProductPrice),
        category: newProductCategory,
        size: newProductCategory === 'drinks' ? newProductSize : undefined,
        available: true,
      });
      showFeedback(`تمت إضافة المنتج "${newProductName}" بنجاح إلى Firebase`);
      setNewProductName('');
      setNewProductPrice('');
      setIsAddProductOpen(false);
    } catch (err) {
      console.error('Failed to create product:', err);
      showFeedback('تعذر إضافة المنتج إلى Firebase');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProductFromFirestore(productToDelete.id);
      showFeedback(`تم حذف المنتج "${productToDelete.name}" بنجاح من Firebase`);
      setProductToDelete(null);
    } catch (err) {
      console.error('Failed to delete product:', err);
      showFeedback('تعذر حذف المنتج من Firebase');
    }
  };

  const handleToggleProductAvailability = async (product: FirestoreProductDoc) => {
    try {
      await updateProductInFirestore(product.id, {
        available: !product.available,
      });
      showFeedback(`تم تغيير حالة توفر "${product.name}" إلى ${!product.available ? 'متوفر' : 'غير متوفر'}`);
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return (o.orderStatus || 'New') === statusFilter;
  });

  const newOrdersCount = orders.filter((o) => (o.orderStatus || 'New') === 'New').length;

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28 text-right" id="store-owner-dashboard">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8 pb-3 sm:pb-4 border-b-2 border-[#D7E7C8]">
        <h2 className="font-marhey text-base sm:text-lg font-bold text-[#445B32]">
          لوحة تحكم المتجر
        </h2>
      </div>

      {/* Floating feedback message */}
      {feedbackMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4 sm:mb-5 p-3 sm:p-3.5 rounded-2xl bg-[#F1F8E9] border-2 border-[#D7E7C8] text-[#445B32] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs text-center"
        >
          <Check className="w-4 h-4 text-[#7A8E68] shrink-0" />
          <span>{feedbackMsg}</span>
        </motion.div>
      )}

      {/* Notification Permission Banner for Store Owner */}
      {typeof window !== 'undefined' && 'Notification' in window && notificationPermission === 'default' && !hasDismissedPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 sm:mb-6 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#FFFDF9]/95 border-2 border-[#D7E7C8] vintage-card-shadow flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-right"
          id="notif-permission-banner"
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F1F8E9] border border-[#D7E7C8] flex items-center justify-center text-[#7A8E68] shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-marhey text-xs sm:text-sm font-bold text-[#445B32]">
                إشعارات الطلبات الفورية (Push Notifications)
              </h4>
              <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5">
                فعّل إشعارات المتصفح لتصلك تنبيهات حقيقية عند وصول أي طلب جديد (New Order).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={handleRequestNotificationPermission}
              disabled={isRequestingPermission}
              className="flex-1 sm:flex-initial py-2 px-3.5 sm:px-4 rounded-full bg-[#7A8E68] hover:bg-[#687C57] text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[36px]"
              id="btn-enable-notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{isRequestingPermission ? 'جاري التفعيل...' : 'تفعيل الإشعارات'}</span>
            </button>
            <button
              type="button"
              onClick={handleDismissNotificationPrompt}
              className="py-2 px-3 rounded-full bg-white border border-[#D7E7C8] text-gray-500 hover:text-gray-700 font-bold text-xs cursor-pointer min-h-[36px]"
              id="btn-dismiss-notifications"
            >
              لاحقاً
            </button>
          </div>
        </motion.div>
      )}

      {/* Navigation Tabs inside Dashboard */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 mb-5 sm:mb-6" id="dashboard-nav-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-7 py-2.5 sm:py-3 rounded-2xl sm:rounded-full font-marhey text-xs sm:text-sm font-bold transition-all cursor-pointer border-2 min-h-[42px] ${
            activeTab === 'orders'
              ? 'bg-[#7A8E68] text-white border-[#5F734E] shadow-sm'
              : 'bg-[#FFFDF9]/90 text-[#445B32] border-[#D7E7C8] hover:bg-[#F2F7EC]'
          }`}
          id="tab-dashboard-orders"
        >
          <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">الطلبات ({orders.length})</span>
          {newOrdersCount > 0 && (
            <span className="bg-[#F8BBD0] text-white text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.2 rounded-full font-bold animate-pulse shrink-0">
              {newOrdersCount} جديد
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-7 py-2.5 sm:py-3 rounded-2xl sm:rounded-full font-marhey text-xs sm:text-sm font-bold transition-all cursor-pointer border-2 min-h-[42px] ${
            activeTab === 'products'
              ? 'bg-[#7A8E68] text-white border-[#5F734E] shadow-sm'
              : 'bg-[#FFFDF9]/90 text-[#445B32] border-[#D7E7C8] hover:bg-[#F2F7EC]'
          }`}
          id="tab-dashboard-products"
        >
          <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">إدارة المنتجات ({firestoreProducts.length})</span>
        </button>
      </div>

      {/* TAB 1: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4 sm:space-y-5" id="dashboard-orders-section">
          {/* Header with Filters & Delete All Orders Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold -mx-1 px-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer text-xs min-h-[34px] ${
                  statusFilter === 'all'
                    ? 'bg-[#445B32] text-white border-[#445B32]'
                    : 'bg-white text-gray-600 border-[#D7E7C8] hover:bg-[#F2F7EC]'
                }`}
              >
                الكل ({orders.length})
              </button>
              {[
                { status: 'New' as OrderStatus, label: 'جديد' },
                { status: 'Accepted' as OrderStatus, label: 'تم القبول' },
                { status: 'Ready' as OrderStatus, label: 'جاهز' },
              ].map(({ status, label }) => {
                const count = orders.filter((o) => (o.orderStatus || 'New') === status).length;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer text-xs min-h-[34px] ${
                      statusFilter === status
                        ? 'bg-[#445B32] text-white border-[#445B32]'
                        : 'bg-white text-gray-600 border-[#D7E7C8] hover:bg-[#F2F7EC]'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Delete All Orders Action */}
            {orders.length > 0 && (
              <button
                type="button"
                disabled={isDeletingAllOrders}
                onClick={() => setShowDeleteAllModal(true)}
                className="py-1.5 px-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto disabled:opacity-50 min-h-[34px]"
                id="btn-delete-all-orders"
                title="حذف جميع الطلبات نهائياً من قاعدة البيانات"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingAllOrders ? 'جاري الحذف...' : `حذف جميع الطلبات (${orders.length})`}</span>
              </button>
            )}
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-[#FFFDF9]/95 rounded-2xl sm:rounded-3xl p-8 sm:p-10 text-center border-2 border-[#D7E7C8] vintage-card-shadow">
              <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-[#7A8E68] mx-auto mb-3 opacity-60" />
              <h3 className="font-marhey text-base sm:text-lg font-bold text-[#445B32]">لا توجد طلبات في هذا القسم حالياً</h3>
              <p className="text-xs text-gray-500 mt-1">عندما يقوم عميل بإنشاء طلب حقيقي، سيظهر هنا فوراً في الوقت الفعلي.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:gap-4" id="orders-list">
              {filteredOrders.map((order) => {
                const currentStatus = (order.orderStatus as OrderStatus) || 'New';
                const statusInfo = ORDER_STATUS_LABELS[currentStatus] || ORDER_STATUS_LABELS.New;
                const formattedDate = new Date(order.createdTimestamp).toLocaleString('ar-SA', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });

                return (
                  <div
                    key={order.id}
                    className="bg-[#FFFDF9]/95 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-[#D7E7C8] vintage-card-shadow transition-all space-y-3.5 sm:space-y-4"
                    id={`order-card-${order.id}`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#F1F8E9]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-marhey font-bold text-sm sm:text-base text-[#445B32]">
                            طلب #{order.id?.slice(0, 8)}
                          </span>
                          <span className={`text-[11px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{formattedDate}</span>
                          </span>
                          <span className="flex items-center gap-1 font-bold text-[#445B32]">
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span>{order.customerFullName}</span>
                          </span>
                        </div>
                      </div>

                      {/* Total & Payment Method */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100 sm:text-left">
                        <div className="flex items-center sm:block gap-1.5">
                          <span className="text-xs text-gray-400 block">الإجمالي:</span>
                          <span className="font-marhey text-base sm:text-lg font-bold text-[#7A8E68]">
                            {order.totalPrice} ﷼
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#445B32] bg-[#F1F8E9] px-2 py-0.5 rounded-md border border-[#D7E7C8] inline-flex items-center gap-1">
                          <Banknote className="w-3 h-3" />
                          <span>Cash</span>
                        </span>
                      </div>
                    </div>

                    {/* Ordered Items Summary */}
                    <div className="space-y-1.5 bg-[#FBFDF8] p-3 rounded-xl sm:rounded-2xl border border-[#D7E7C8]/50">
                      <span className="text-xs font-bold text-[#556F43] block mb-1">
                        المنتجات المطلوبة ({order.quantities} مشروبات):
                      </span>
                      <div className="divide-y divide-gray-100">
                        {order.productsOrdered.map((item, idx) => (
                          <div key={idx} className="py-1 text-xs flex justify-between items-center text-gray-700">
                            <div className="pr-1">
                              <span className="font-bold text-[#445B32]">{item.quantity}× {item.productName}</span>
                              {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <span className="text-gray-500 text-[11px] mr-1.5 block sm:inline">
                                  ({item.selectedAddons.map((a) => a.name).join('، ')})
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-[#7A8E68] shrink-0 mr-2">{item.totalItemPrice} ﷼</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                      {/* Left: View Details & Delete Single Order */}
                      <div className="flex items-center gap-2">
                        {/* View Details Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="py-2 px-3.5 sm:px-4 rounded-full bg-white border border-[#D7E7C8] text-[#445B32] font-bold text-xs hover:bg-[#F1F8E9] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs min-h-[36px]"
                          id={`btn-view-order-${order.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض التفاصيل</span>
                        </button>

                        {/* Delete Single Order Button */}
                        <button
                          type="button"
                          disabled={isDeletingOrder === order.id}
                          onClick={() => setOrderToDelete(order)}
                          className="py-2 px-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50 min-h-[36px]"
                          id={`btn-delete-order-${order.id}`}
                          title="حذف هذا الطلب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeletingOrder === order.id ? 'جاري الحذف...' : 'حذف'}</span>
                        </button>
                      </div>

                      {/* Status Buttons: Accept, Reject, and Quick Changer */}
                      <div className="flex items-center gap-2">
                        {currentStatus === 'New' && (
                          <>
                            <button
                              type="button"
                              disabled={isUpdatingStatus === order.id}
                              onClick={() => handleStatusChange(order.id!, 'Accepted')}
                              className="flex-1 sm:flex-initial py-2 px-3.5 rounded-full bg-[#7A8E68] hover:bg-[#687C57] text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs disabled:opacity-50 min-h-[36px]"
                              id={`btn-accept-order-${order.id}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>قبول (Accept)</span>
                            </button>
                            <button
                              type="button"
                              disabled={isUpdatingStatus === order.id}
                              onClick={() => handleStatusChange(order.id!, 'Rejected')}
                              className="flex-1 sm:flex-initial py-2 px-3.5 rounded-full bg-[#F8BBD0] hover:bg-[#F06292] text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs disabled:opacity-50 min-h-[36px]"
                              id={`btn-reject-order-${order.id}`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رفض (Reject)</span>
                            </button>
                          </>
                        )}

                        {/* Status Select Dropdown for Changing to Any Status */}
                        <select
                          value={currentStatus}
                          disabled={isUpdatingStatus === order.id}
                          onChange={(e) => handleStatusChange(order.id!, e.target.value as OrderStatus)}
                          className="w-full sm:w-auto py-2 px-3 rounded-full text-xs font-bold bg-white border border-[#D7E7C8] text-[#445B32] focus:outline-none focus:border-[#7A8E68] cursor-pointer min-h-[36px]"
                          id={`select-status-${order.id}`}
                        >
                          <option value="New">تغيير الحالة: New</option>
                          <option value="Accepted">Accepted (تم القبول)</option>
                          <option value="Preparing">Preparing (قيد التحضير)</option>
                          <option value="Ready">Ready (جاهز)</option>
                          <option value="Completed">Completed (مكتمل)</option>
                          <option value="Rejected">Rejected (مرفوض)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRODUCT MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6" id="dashboard-products-section">
          {/* Top Bar for Products */}
          <div className="flex items-center justify-between">
            <h3 className="font-marhey text-lg font-bold text-[#445B32]">
              منتجات المتجر في Firebase ({firestoreProducts.length})
            </h3>

            <button
              type="button"
              onClick={() => setIsAddProductOpen(true)}
              className="py-2.5 px-5 bg-[#7A8E68] hover:bg-[#687C57] text-white rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
              id="btn-add-product"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة منتج جديد</span>
            </button>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="products-management-list">
            {firestoreProducts.map((product) => (
              <div
                key={product.id}
                className="bg-[#FFFDF9]/95 rounded-3xl p-5 border-2 border-[#D7E7C8] vintage-card-shadow flex flex-col justify-between space-y-4"
                id={`product-manage-${product.id}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-marhey font-bold text-base text-[#445B32]">
                      {product.name}
                    </h4>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                        product.available
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {product.available ? 'متوفر' : 'غير متوفر'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>
                      السعر الحالي:{' '}
                      <strong className="font-marhey text-base text-[#7A8E68]">
                        {product.price} ﷼
                      </strong>
                    </p>
                    <p>
                      التصنيف:{' '}
                      <span className="font-medium text-gray-700">
                        {product.category === 'drinks'
                          ? 'مشروبات'
                          : product.category === 'milk_options'
                          ? 'خيارات الحليب'
                          : 'إضافات'}
                      </span>
                      {product.size && ` • حجم ${product.size === 'large' ? 'كبير' : 'عادي'}`}
                    </p>
                  </div>
                </div>

                {/* Actions: Edit Price/Name, Toggle Availability, Delete */}
                <div className="pt-3 border-t border-[#F1F8E9] flex items-center justify-between gap-2">
                  {/* Availability Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleProductAvailability(product)}
                    className="py-1.5 px-3 rounded-full text-xs font-bold border border-[#D7E7C8] bg-white text-[#445B32] hover:bg-[#F2F7EC] transition-all cursor-pointer"
                  >
                    {product.available ? 'تعطيل التوفر' : 'تفعيل التوفر'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...product })}
                      className="p-2 rounded-xl bg-white border border-[#D7E7C8] text-[#7A8E68] hover:bg-[#F2F7EC] transition-all cursor-pointer"
                      title="تعديل السعر والاسم"
                      id={`btn-edit-prod-${product.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                      className="p-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="حذف المنتج"
                      id={`btn-delete-prod-${product.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: ORDER DETAILS MODAL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" id="order-details-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-[#334628]/35 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#FFFDF9] rounded-3xl sm:rounded-[36px] p-4 sm:p-8 shadow-2xl border-4 border-[#D7E7C8] z-10 max-h-[90vh] overflow-y-auto space-y-4 sm:space-y-6"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 p-2 text-gray-400 hover:text-[#5D6D4E] hover:bg-[#F1F8E9] rounded-full transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="text-center pb-2.5 sm:pb-3 border-b border-[#D7E7C8]/60 pt-1">
                <h3 className="font-marhey text-lg sm:text-2xl font-bold text-[#445B32] mb-1">
                  تفاصيل الطلب #{selectedOrder.id?.slice(0, 8)}
                </h3>
                <p className="text-xs text-gray-500">
                  {new Date(selectedOrder.createdTimestamp).toLocaleString('ar-SA', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </p>
              </div>

              {/* Customer Information */}
              <div className="bg-[#F1F8E9] p-3.5 sm:p-4 rounded-2xl border border-[#D7E7C8] space-y-1.5 text-xs text-gray-700">
                <span className="font-bold text-[#445B32] block mb-1">بيانات العميل:</span>
                <p>
                  <strong>الاسم الكامل:</strong> {selectedOrder.customerFullName}
                </p>
                {selectedOrder.customerEmail && (
                  <p className="break-all">
                    <strong>البريد الإلكتروني:</strong>{' '}
                    <span dir="ltr" className="font-mono text-gray-600">{selectedOrder.customerEmail}</span>
                  </p>
                )}
                <p>
                  <strong>طريقة الدفع:</strong> <span className="font-bold text-[#445B32]">Cash (الدفع نقداً عند الاستلام)</span>
                </p>
              </div>

              {/* Ordered Products Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#445B32] block">المنتجات المطلوبة:</span>
                <div className="bg-white rounded-2xl border border-[#D7E7C8] overflow-hidden divide-y divide-gray-100 text-xs">
                  {selectedOrder.productsOrdered.map((item, idx) => (
                    <div key={idx} className="p-3 sm:p-3.5 space-y-1">
                      <div className="flex justify-between items-center font-bold text-[#445B32]">
                        <span>{item.quantity}× {item.productName}</span>
                        <span className="text-[#7A8E68]">{item.totalItemPrice} ﷼</span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex justify-between">
                        <span>سعر المشروب الفردي: {item.unitPrice} ﷼</span>
                      </div>
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="pt-1 text-[11px] text-gray-600 space-y-0.5">
                          <span className="font-medium text-[#556F43]">الإضافات المختارة:</span>
                          <div className="flex flex-wrap gap-1">
                            {item.selectedAddons.map((a, aIdx) => (
                              <span key={aIdx} className="bg-[#F1F8E9] px-2 py-0.5 rounded-md border border-[#D7E7C8]">
                                {a.name} ({a.price === 0 ? 'Free' : `${a.price} ﷼`})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-center bg-[#F1F8E9] p-3.5 sm:p-4 rounded-2xl border border-[#D7E7C8]">
                <span className="font-bold text-[#445B32] text-xs sm:text-sm">الإجمالي الكلي:</span>
                <span className="font-marhey text-xl sm:text-2xl font-bold text-[#7A8E68]">
                  {selectedOrder.totalPrice} ﷼
                </span>
              </div>

              {/* Change Status Directly from Details */}
              <div className="space-y-2 pt-2 border-t border-[#D7E7C8]/60">
                <label className="block text-xs font-bold text-[#445B32]">
                  تعديل حالة الطلب في Firebase:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 text-xs font-bold">
                  {(['New', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Rejected'] as OrderStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(selectedOrder.id!, status)}
                      className={`py-2 px-1 rounded-xl border transition-all text-center cursor-pointer min-h-[36px] ${
                        selectedOrder.orderStatus === status
                          ? 'bg-[#445B32] text-white border-[#445B32] shadow-xs'
                          : 'bg-white text-gray-700 border-[#D7E7C8] hover:bg-[#F2F7EC]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete Order Action Inside Details Modal */}
              <div className="pt-3 border-t border-[#D7E7C8]/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(selectedOrder)}
                  className="py-2 px-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  id="btn-delete-order-modal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف هذا الطلب نهائياً</span>
                </button>
                <span className="text-[11px] text-gray-400 font-mono" dir="ltr">#{selectedOrder.id?.slice(0, 8)}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" id="edit-product-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="fixed inset-0 bg-[#334628]/35 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl sm:rounded-[36px] p-5 sm:p-8 shadow-2xl border-4 border-[#D7E7C8] z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 p-2 text-gray-400 hover:text-[#5D6D4E] rounded-full cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-marhey text-lg sm:text-xl font-bold text-[#445B32] text-center mb-3 sm:mb-4 pt-1">
                تعديل المنتج في Firebase
              </h3>

              <form onSubmit={handleSaveProductEdit} className="space-y-3.5 sm:space-y-4 text-xs font-bold text-[#445B32]">
                <div>
                  <label className="block mb-1.5">اسم المنتج:</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required
                    className="w-full py-2.5 px-3.5 bg-white border border-[#D7E7C8] rounded-xl text-base sm:text-sm text-[#3A4E2D] font-normal focus:outline-none focus:border-[#7A8E68]"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">السعر بالريال السعودي (SAR):</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    required
                    className="w-full py-2.5 px-3.5 bg-white border border-[#D7E7C8] rounded-xl text-base sm:text-sm text-[#3A4E2D] font-normal focus:outline-none focus:border-[#7A8E68]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="edit-available-checkbox"
                    checked={editingProduct.available}
                    onChange={(e) => setEditingProduct({ ...editingProduct, available: e.target.checked })}
                    className="w-4 h-4 accent-[#7A8E68] cursor-pointer"
                  />
                  <label htmlFor="edit-available-checkbox" className="cursor-pointer text-xs">
                    المنتج متوفر للطلب (Available)
                  </label>
                </div>

                <div className="pt-2 sm:pt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="flex-1 py-3 bg-[#7A8E68] hover:bg-[#687C57] text-white rounded-full font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {isSavingProduct ? 'جاري الحفظ...' : 'حفظ التعديلات في Firebase'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="py-3 px-4 sm:px-5 bg-white border border-[#D7E7C8] text-gray-600 rounded-full font-bold text-xs sm:text-sm cursor-pointer min-h-[44px]"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ADD PRODUCT MODAL */}
      <AnimatePresence>
        {isAddProductOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" id="add-product-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddProductOpen(false)}
              className="fixed inset-0 bg-[#334628]/35 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl sm:rounded-[36px] p-5 sm:p-8 shadow-2xl border-4 border-[#D7E7C8] z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsAddProductOpen(false)}
                className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 p-2 text-gray-400 hover:text-[#5D6D4E] rounded-full cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-marhey text-lg sm:text-xl font-bold text-[#445B32] text-center mb-3 sm:mb-4 pt-1">
                إضافة منتج جديد إلى Firebase
              </h3>

              <form onSubmit={handleCreateProduct} className="space-y-3.5 sm:space-y-4 text-xs font-bold text-[#445B32]">
                <div>
                  <label className="block mb-1.5">اسم المنتج:</label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="مثال: ماتشا لاتيه خاص"
                    required
                    className="w-full py-2.5 px-3.5 bg-white border border-[#D7E7C8] rounded-xl text-base sm:text-sm text-[#3A4E2D] font-normal focus:outline-none focus:border-[#7A8E68]"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">السعر بالريال السعودي (SAR):</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="25"
                    required
                    className="w-full py-2.5 px-3.5 bg-white border border-[#D7E7C8] rounded-xl text-base sm:text-sm text-[#3A4E2D] font-normal focus:outline-none focus:border-[#7A8E68]"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">التصنيف:</label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value as any)}
                    className="w-full py-2.5 px-3.5 bg-white border border-[#D7E7C8] rounded-xl text-base sm:text-sm text-[#3A4E2D] font-normal focus:outline-none focus:border-[#7A8E68]"
                  >
                    <option value="drinks">مشروبات (drinks)</option>
                    <option value="milk_options">خيارات الحليب (milk_options)</option>
                    <option value="add_ons">إضافات (add_ons)</option>
                  </select>
                </div>

                {newProductCategory === 'drinks' && (
                  <div>
                    <label className="block mb-1.5">الحجم:</label>
                    <select
                      value={newProductSize}
                      onChange={(e) => setNewProductSize(e.target.value as any)}
                      className="w-full py-2.5 px-3.5 bg-white border border-[#D7E7C8] rounded-xl text-base sm:text-sm text-[#3A4E2D] font-normal focus:outline-none focus:border-[#7A8E68]"
                    >
                      <option value="regular">عادي (regular)</option>
                      <option value="large">كبير (large)</option>
                    </select>
                  </div>
                )}

                <div className="pt-2 sm:pt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="flex-1 py-3 bg-[#7A8E68] hover:bg-[#687C57] text-white rounded-full font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {isSavingProduct ? 'جاري الإضافة...' : 'إضافة المنتج إلى Firebase'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddProductOpen(false)}
                    className="py-3 px-4 sm:px-5 bg-white border border-[#D7E7C8] text-gray-600 rounded-full font-bold text-xs sm:text-sm cursor-pointer min-h-[44px]"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: CONFIRM DELETE ALL ORDERS */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" id="delete-all-orders-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingAllOrders && setShowDeleteAllModal(false)}
              className="fixed inset-0 bg-[#334628]/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-rose-200 z-10 space-y-4 text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border-2 border-rose-200">
                <Trash2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-marhey text-xl font-bold text-rose-900 mb-2">
                  تأكيد حذف جميع الطلبات
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف كافة الطلبات ({orders.length} طلب) نهائياً من المتجر؟
                </p>
                <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                  ⚠️ تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه أبداً، وسيتم مسح كافة سجلات الطلبات بالكامل من قاعدة بيانات Firebase.
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row-reverse gap-2 sm:gap-3">
                <button
                  type="button"
                  disabled={isDeletingAllOrders}
                  onClick={handleConfirmDeleteAllOrders}
                  className="flex-1 py-3 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                  id="confirm-delete-all-orders-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingAllOrders ? 'جاري حذف جميع الطلبات...' : 'نعم، حذف جميع الطلبات نهائياً'}</span>
                </button>
                <button
                  type="button"
                  disabled={isDeletingAllOrders}
                  onClick={() => setShowDeleteAllModal(false)}
                  className="py-3 px-5 rounded-full bg-white border border-[#D7E7C8] text-gray-700 hover:bg-[#F2F7EC] font-bold text-sm cursor-pointer transition-all min-h-[44px]"
                  id="cancel-delete-all-orders-btn"
                >
                  إلغاء التراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: CONFIRM DELETE SINGLE ORDER */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" id="delete-single-order-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingOrder && setOrderToDelete(null)}
              className="fixed inset-0 bg-[#334628]/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#FFFDF9] rounded-3xl p-6 shadow-2xl border-4 border-rose-200 z-10 space-y-4 text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-marhey text-lg font-bold text-rose-900 mb-1">
                  حذف الطلب #{orderToDelete.id?.slice(0, 8)}
                </h3>
                <p className="text-xs text-gray-600">
                  هل أنت متأكد من حذف هذا الطلب للعميل <strong>{orderToDelete.customerFullName}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  disabled={isDeletingOrder === orderToDelete.id}
                  onClick={handleConfirmDeleteSingleOrder}
                  className="flex-1 py-2.5 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 min-h-[40px]"
                  id="confirm-delete-single-order-btn"
                >
                  {isDeletingOrder === orderToDelete.id ? 'جاري الحذف...' : 'حذف الطلب نهائياً'}
                </button>
                <button
                  type="button"
                  disabled={isDeletingOrder === orderToDelete.id}
                  onClick={() => setOrderToDelete(null)}
                  className="py-2.5 px-4 rounded-full bg-white border border-[#D7E7C8] text-gray-700 hover:bg-[#F2F7EC] font-bold text-xs cursor-pointer min-h-[40px]"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: CONFIRM DELETE PRODUCT */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" id="delete-product-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="fixed inset-0 bg-[#334628]/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#FFFDF9] rounded-3xl p-6 shadow-2xl border-4 border-rose-200 z-10 space-y-4 text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-marhey text-lg font-bold text-rose-900 mb-1">
                  حذف المنتج
                </h3>
                <p className="text-xs text-gray-600">
                  هل أنت متأكد من حذف المنتج "{productToDelete.name}" نهائياً من قاعدة البيانات؟
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  onClick={handleConfirmDeleteProduct}
                  className="flex-1 py-2.5 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer min-h-[40px]"
                >
                  حذف المنتج
                </button>
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="py-2.5 px-4 rounded-full bg-white border border-[#D7E7C8] text-gray-700 hover:bg-[#F2F7EC] font-bold text-xs cursor-pointer min-h-[40px]"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
