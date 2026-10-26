import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Addon, CartItem, UserProfile } from './types.ts';
import { REGULAR_PRODUCTS, SPECIAL_PRODUCTS, AVAILABLE_ADDONS } from './data/products.ts';
import { Navbar } from './components/Navbar.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { AddonModal } from './components/AddonModal.tsx';
import { CartView } from './components/CartView.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { CustomerOrdersView } from './components/CustomerOrdersView.tsx';
import { PrivacyPolicyView } from './components/PrivacyPolicyView.tsx';
import { StoreOwnerDashboard } from './components/StoreOwnerDashboard.tsx';
import { DaisyFlower, Butterfly, CuteBow } from './components/Decorations.tsx';
import {
  auth,
  getUserProfile,
  subscribeToProducts,
  FirestoreProductDoc,
  isStoreOwner,
  subscribeToCustomerOrders,
} from './firebase.ts';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  // Navigation: 'home' | 'cart' | 'orders' | 'privacy' | 'dashboard'
  const [activeTab, setActiveTab] = useState<'home' | 'cart' | 'orders' | 'privacy' | 'dashboard'>('home');
  const [customerOrdersCount, setCustomerOrdersCount] = useState<number>(0);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);

  // Handle URL deep-linking and Service Worker notification clicks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'dashboard') {
      setActiveTab('dashboard');
      if (params.get('orderId')) {
        setFocusedOrderId(params.get('orderId'));
      }
    }

    if ('serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NOTIFICATION_CLICK') {
          setActiveTab('dashboard');
          if (event.data.orderId) {
            setFocusedOrderId(event.data.orderId);
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, []);

  // Products category: 'regular' ("ماتشا عادية") or 'special' ("ماتشا سبيشال")
  const [productCategory, setProductCategory] = useState<'regular' | 'special'>('regular');

  // Real products loaded dynamically from Firestore
  const [firestoreProducts, setFirestoreProducts] = useState<FirestoreProductDoc[]>([]);

  // Addon modal state
  const [selectedProductForAddon, setSelectedProductForAddon] = useState<Product | null>(null);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);

  // Login modal state & user state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [initialShowFullName, setInitialShowFullName] = useState(false);

  // Subscribe to real products from Firestore in real-time
  useEffect(() => {
    const unsubscribeProducts = subscribeToProducts((prods) => {
      setFirestoreProducts(prods);
    });
    return () => unsubscribeProducts();
  }, []);

  // Sync auth state with Firebase Authentication and Firestore profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile && profile.fullName && profile.fullName.trim().length > 0) {
            setCurrentUser(profile);
            setPendingUid(null);
            setPendingEmail(null);
            setInitialShowFullName(false);
            // Store Owner Login Behavior: Immediately redirect to Store Owner Dashboard
            if (isStoreOwner(profile)) {
              setActiveTab('dashboard');
            }
          } else {
            // Logged in with Google, but first account setup (full name not yet in Firestore)
            setCurrentUser(null);
            setPendingUid(firebaseUser.uid);
            setPendingEmail(firebaseUser.email || '');
            setInitialShowFullName(true);
            setIsLoginModalOpen(true);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setCurrentUser(null);
        setPendingUid(null);
        setPendingEmail(null);
        setInitialShowFullName(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real customer orders count for the customer badge
  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setCustomerOrdersCount(0);
      return;
    }
    const unsubscribe = subscribeToCustomerOrders(
      currentUser.uid,
      (orders) => {
        setCustomerOrdersCount(orders.length);
      },
      (err) => console.log('Customer orders count sync:', err)
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Cart items state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Open addon customization modal for a product
  const handleAddToCartClick = (product: Product) => {
    setSelectedProductForAddon(product);
    setIsAddonModalOpen(true);
  };

  // Confirm addition from AddonModal
  const handleConfirmAddToCart = (product: Product, selectedAddons: Addon[]) => {
    const addonsSum = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = product.basePrice + addonsSum;

    // Create unique key for item + addon combination
    const sortedAddonIds = [...selectedAddons].map((a) => a.id).sort().join('|');
    const existingIndex = cartItems.findIndex(
      (item) =>
        item.product.id === product.id &&
        [...item.selectedAddons].map((a) => a.id).sort().join('|') === sortedAddonIds
    );

    if (existingIndex > -1) {
      // Increment quantity
      setCartItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalPrice: (item.quantity + 1) * unitPrice,
              }
            : item
        )
      );
    } else {
      // Add new cart item
      const newItem: CartItem = {
        cartItemId: `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product,
        selectedAddons,
        quantity: 1,
        totalPrice: unitPrice,
      };
      setCartItems((prev) => [...prev, newItem]);
    }
  };

  // Quantity updates
  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const addonsSum = item.selectedAddons.reduce((sum, a) => sum + a.price, 0);
            const unitPrice = item.product.basePrice + addonsSum;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * unitPrice,
            };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  // Remove item
  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Dynamic products reading names and prices from Firestore
  const regularProducts = useMemo<Product[]>(() => {
    const drinks = firestoreProducts.filter(
      (p) => p.category === 'drinks' && (p.type === 'classic' || p.type === 'cloudy')
    );

    if (drinks.length > 0) {
      const order = [
        drinks.find((p) => p.type === 'classic' && p.size === 'regular'),
        drinks.find((p) => p.type === 'cloudy' && p.size === 'regular'),
        drinks.find((p) => p.type === 'classic' && p.size === 'large'),
        drinks.find((p) => p.type === 'cloudy' && p.size === 'large'),
      ].filter((p): p is FirestoreProductDoc => Boolean(p));

      return order.map((fp) => ({
        id: fp.id,
        name: fp.name,
        category: 'regular' as const,
        basePrice: fp.price,
        size: (fp.size || 'regular') as 'regular' | 'large',
        type: (fp.type || 'classic') as 'classic' | 'cloudy',
        available: fp.available,
      }));
    }

    return REGULAR_PRODUCTS;
  }, [firestoreProducts]);

  const specialProducts = useMemo<Product[]>(() => {
    const drinks = firestoreProducts.filter(
      (p) => p.category === 'drinks' && (p.type === 'mango' || p.type === 'strawberry')
    );

    if (drinks.length > 0) {
      const order = [
        drinks.find((p) => p.type === 'mango' && p.size === 'regular'),
        drinks.find((p) => p.type === 'strawberry' && p.size === 'regular'),
        drinks.find((p) => p.type === 'mango' && p.size === 'large'),
        drinks.find((p) => p.type === 'strawberry' && p.size === 'large'),
      ].filter((p): p is FirestoreProductDoc => Boolean(p));

      return order.map((fp) => ({
        id: fp.id,
        name: fp.name,
        category: 'special' as const,
        basePrice: fp.price,
        size: (fp.size || 'regular') as 'regular' | 'large',
        type: (fp.type || 'mango') as 'mango' | 'strawberry',
        available: fp.available,
      }));
    }

    return SPECIAL_PRODUCTS;
  }, [firestoreProducts]);

  // Real add-ons and milk options from Firestore
  const firestoreAddons = useMemo<Addon[]>(() => {
    const custom = firestoreProducts
      .filter((p) => p.category === 'milk_options' || p.category === 'add_ons');

    if (custom.length > 0) {
      // Sort Milk first, then Foam
      const sorted = [
        ...custom.filter((p) => p.category === 'milk_options'),
        ...custom.filter((p) => p.category === 'add_ons'),
      ];
      return sorted.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category === 'milk_options' ? 'Milk' : 'Foam',
      }));
    }
    return AVAILABLE_ADDONS;
  }, [firestoreProducts]);

  const displayedProducts = productCategory === 'regular' ? regularProducts : specialProducts;

  // Direct URL Protection & Role-based Routing:
  // - Store Owner (role = "store_owner"): IMMEDIATELY redirect to Store Owner Dashboard.
  //   Never show customer homepage, product browsing, cart, checkout, or customer navigation.
  //   If a store owner manually opens customer pages while signed in, redirect them back to the Store Owner Dashboard.
  // - Customer (role = "customer" or unauthenticated): Keep customer experience, deny access to Store Owner Dashboard.
  useEffect(() => {
    if (isStoreOwner(currentUser)) {
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      }
    } else {
      if (activeTab === 'dashboard') {
        setActiveTab('home');
      }
    }
  }, [activeTab, currentUser]);

  return (
    <div className="min-h-screen bg-vintage-gingham flex flex-col relative selection:bg-[#E8F0DC] selection:text-[#2B3B20]">
      {/* Top Navigation with "تسجيل الدخول" on top right */}
      <Navbar
        onOpenLogin={() => setIsLoginModalOpen(true)}
        currentUser={currentUser}
        userEmail={currentUser?.email || null}
        onOpenDashboard={() => {
          setActiveTab('dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-2.5 sm:px-6 py-4 sm:py-10">
        <AnimatePresence mode="wait">
          {activeTab === 'home' ? (
            <motion.div
              key="home-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5 sm:space-y-10 pb-24"
              id="home-page-container"
            >
              {/* Hero Section */}
              <div className="text-center pt-1 sm:pt-4 relative" id="hero-section">
                {/* Decorative vintage elements */}
                <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                  <DaisyFlower className="w-4 h-4 sm:w-6 sm:h-6" petalColor="#FFE6EE" centerColor="#F9E79F" />
                  <CuteBow className="w-5 h-5 sm:w-7 sm:h-7 text-[#F4ACB7]" />
                  <DaisyFlower className="w-4 h-4 sm:w-6 sm:h-6" petalColor="#FFE6EE" centerColor="#F9E79F" />
                </div>

                {/* العبارة الكبيرة والأنيقة في المنتصف: "ماتشا صنعت بحب" */}
                <h1
                  className="font-marhey text-2xl sm:text-5xl lg:text-6xl text-[#445B32] font-bold tracking-normal leading-tight"
                  id="hero-title"
                >
                  ماتشا صنعت بحب
                </h1>

                {/* وتحتها مباشرة: "التوصيل فقط في أبها وخميس مشيط" */}
                <p
                  className="mt-1.5 sm:mt-3 text-xs sm:text-base font-bold text-[#E05355] tracking-wide"
                  id="hero-subtitle-delivery"
                >
                  التوصيل فقط في أبها وخميس مشيط
                </p>
              </div>

              {/* Products Section */}
              <div className="space-y-4 sm:space-y-7" id="products-section">
                {/* Two options side by side: "ماتشا عادية" and "ماتشا سبيشال" */}
                <div className="flex justify-center gap-2 sm:gap-4" id="product-category-tabs">
                  {/* 1. ماتشا عادية */}
                  <button
                    type="button"
                    onClick={() => setProductCategory('regular')}
                    className={`px-4 sm:px-9 py-2 sm:py-3 rounded-full font-marhey text-xs sm:text-base font-bold transition-all cursor-pointer border-2 min-h-[38px] ${
                      productCategory === 'regular'
                        ? 'bg-[#7A8E68] text-white border-[#5F734E] shadow-sm'
                        : 'bg-[#FFFDF9]/90 text-[#445B32] border-[#D7E7C8] hover:bg-[#F2F7EC]'
                    }`}
                    id="tab-matcha-regular"
                  >
                    ماتشا عادية
                  </button>

                  {/* 2. ماتشا سبيشال */}
                  <button
                    type="button"
                    onClick={() => setProductCategory('special')}
                    className={`px-4 sm:px-9 py-2 sm:py-3 rounded-full font-marhey text-xs sm:text-base font-bold transition-all cursor-pointer border-2 min-h-[38px] ${
                      productCategory === 'special'
                        ? 'bg-[#7A8E68] text-white border-[#5F734E] shadow-sm'
                        : 'bg-[#FFFDF9]/90 text-[#445B32] border-[#D7E7C8] hover:bg-[#F2F7EC]'
                    }`}
                    id="tab-matcha-special"
                  >
                    ماتشا سبيشال
                  </button>
                </div>

                {/* Products Grid: وضع الجوال: في قسم "ماتشا عادية" تظهر المنتجات الـ 4 كلها معاً، وفي قسم "ماتشا سبيشال" تظهر المنتجات الـ 4 كلها معاً (grid-cols-2) */}
                <motion.div
                  key={productCategory}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6"
                  id="products-grid"
                >
                  {displayedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCartClick={handleAddToCartClick}
                    />
                  ))}
                </motion.div>
              </div>

              {/* Two-Column Footer at the very bottom of the Home page */}
              <footer
                className="pt-8 sm:pt-10 pb-4 border-t border-[#D7E7C8]/70 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6"
                id="home-page-footer"
              >
                {/* RIGHT SIDE: سياسة الخصوصية */}
                <div className="text-center sm:text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('privacy');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs sm:text-sm font-bold text-[#7A8E68] hover:text-[#445B32] underline underline-offset-4 decoration-[#D7E7C8] hover:decoration-[#7A8E68] transition-all cursor-pointer py-1"
                    id="link-privacy-policy"
                  >
                    سياسة الخصوصية
                  </button>
                </div>

                {/* LEFT SIDE: Developer & Contact Information */}
                <div
                  className="text-center sm:text-left text-xs text-gray-700 leading-relaxed"
                  id="home-footer-developer"
                >
                  <p className="font-bold text-[#445B32] text-xs sm:text-sm mb-1">
                    تم إنشاء وتطوير موقع Jays Matcha عن طريق عبدالله عسيري
                  </p>
                  <a
                    href="mailto:abdullah.apps.16@gmail.com"
                    className="font-bold text-[#7A8E68] hover:text-[#445B32] hover:underline transition-colors inline-block py-0.5"
                    dir="ltr"
                  >
                    abdullah.apps.16@gmail.com
                  </a>
                </div>
              </footer>
            </motion.div>
          ) : activeTab === 'cart' ? (
            /* Cart Page View */
            <motion.div
              key="cart-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <CartView
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onGoToHome={() => setActiveTab('home')}
                currentUser={currentUser}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onClearCart={() => setCartItems([])}
              />
            </motion.div>
          ) : activeTab === 'orders' ? (
            /* Customer Orders Page View */
            <motion.div
              key="orders-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <CustomerOrdersView
                currentUser={currentUser}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onGoToHome={() => {
                  setActiveTab('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          ) : activeTab === 'privacy' ? (
            /* Dedicated Privacy Policy Page View */
            <motion.div
              key="privacy-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PrivacyPolicyView
                onBack={() => {
                  setActiveTab('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          ) : (
            /* Protected Store Owner Dashboard View */
            <motion.div
              key="dashboard-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <StoreOwnerDashboard
                currentUser={currentUser}
                firestoreProducts={firestoreProducts}
                focusedOrderId={focusedOrderId}
                onBackToStore={() => {
                  // Direct URL Protection: Store owner remains on Dashboard
                  setActiveTab('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add-on Customization Modal */}
      <AddonModal
        product={selectedProductForAddon}
        isOpen={isAddonModalOpen}
        onClose={() => {
          setIsAddonModalOpen(false);
          setSelectedProductForAddon(null);
        }}
        onConfirmAddToCart={handleConfirmAddToCart}
        availableAddons={firestoreAddons}
      />

      {/* Login Modal with Google Authentication and Full Name setup */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setInitialShowFullName(false);
        }}
        currentUser={currentUser}
        onOpenDashboard={() => {
          setActiveTab('dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLoginSuccess={(profile) => {
          setCurrentUser(profile);
          setPendingUid(null);
          setPendingEmail(null);
          setInitialShowFullName(false);
          if (isStoreOwner(profile)) {
            setActiveTab('dashboard');
          }
        }}
        onLogout={() => {
          setCurrentUser(null);
          setPendingUid(null);
          setPendingEmail(null);
          setInitialShowFullName(false);
          setActiveTab('home');
        }}
        initialShowFullName={initialShowFullName}
        pendingUid={pendingUid}
        pendingEmail={pendingEmail}
      />

      {/* Fixed Bottom Navigation Bar - ONLY shown for customer browsing (hidden for store owner) */}
      {!isStoreOwner(currentUser) && (
        <BottomNav
          activeTab={activeTab === 'cart' ? 'cart' : activeTab === 'orders' ? 'orders' : 'home'}
          onTabChange={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          cartCount={totalCartCount}
          ordersCount={customerOrdersCount}
        />
      )}
    </div>
  );
}
