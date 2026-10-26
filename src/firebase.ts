import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocFromServer,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  query,
  writeBatch,
  where,
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';
import { CustomerOrder, OrderStatus, Product, UserProfile } from './types.ts';

// Structured Firebase Authentication domain configuration:
// - Defaults to the working Firebase authDomain: "velvety-wave-gghtt.firebaseapp.com" (from firebase-applet-config.json)
// - Supports custom domain override via VITE_FIREBASE_AUTH_DOMAIN when the store's custom domain is connected
const authDomain =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN) ||
  firebaseConfig.authDomain ||
  'velvety-wave-gghtt.firebaseapp.com';

const app = initializeApp({
  ...firebaseConfig,
  authDomain,
});

// CRITICAL: The app will break without specifying the firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const STORE_OWNER_EMAILS = ['abodas20111@gmail.com', 'fjralmazny@gmail.com'];

export function isStoreOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return STORE_OWNER_EMAILS.includes(email.trim().toLowerCase());
}

export function isStoreOwner(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'store_owner' || isStoreOwnerEmail(user.email);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const userEmail = data.email || '';
      const isOwner = data.role === 'store_owner' || isStoreOwnerEmail(userEmail);
      return {
        uid: data.uid || uid,
        fullName: data.fullName || '',
        email: userEmail,
        role: isOwner ? 'store_owner' : 'customer',
        createdAt: data.createdAt,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveUserProfile(uid: string, fullName: string, email: string): Promise<UserProfile> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const cleanEmail = email.trim();
    const isOwner = isStoreOwnerEmail(cleanEmail);
    const data: UserProfile = {
      uid,
      fullName: fullName.trim(),
      email: cleanEmail,
      role: isOwner ? 'store_owner' : 'customer',
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// --- Real Products in Firestore ---
export interface FirestoreProductDoc {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  available: boolean;
  category: 'drinks' | 'milk_options' | 'add_ons' | 'regular' | 'special';
  size?: 'regular' | 'large';
  type?: 'classic' | 'cloudy' | 'mango' | 'strawberry';
}

/**
 * Subscribes to real products collection in Firestore.
 * Provides real-time updates for product names, prices, descriptions, images, and availability.
 */
export function subscribeToProducts(
  onUpdate: (products: FirestoreProductDoc[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'products';
  const q = query(collection(db, path));
  return onSnapshot(
    q,
    (snapshot) => {
      const prods: FirestoreProductDoc[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        prods.push({
          id: docSnap.id,
          name: data.name || '',
          description: data.description || '',
          price: typeof data.price === 'number' ? data.price : Number(data.price) || 0,
          image: data.image || '',
          available: data.available !== false,
          category: data.category || 'drinks',
          size: data.size,
          type: data.type,
        });
      });
      onUpdate(prods);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

/**
 * Update an existing product in Firestore (Store Owner).
 */
export async function updateProductInFirestore(
  productId: string,
  updates: Partial<Omit<FirestoreProductDoc, 'id'>>
): Promise<void> {
  const path = `products/${productId}`;
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Add a new product to Firestore (Store Owner).
 */
export async function addProductToFirestore(
  product: Omit<FirestoreProductDoc, 'id'>
): Promise<string> {
  const path = 'products';
  try {
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, {
      name: product.name.trim(),
      price: Number(product.price),
      available: product.available !== false,
      category: product.category,
      size: product.size || null,
      type: product.type || null,
      description: product.description || '',
      image: product.image || '',
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Delete a product from Firestore (Store Owner).
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Creates a real customer order in Firestore.
 * Requires authenticated user UID and full name.
 */
export async function createCustomerOrder(
  order: Omit<CustomerOrder, 'id'>
): Promise<string> {
  const path = 'orders';
  try {
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, {
      customerUid: order.customerUid,
      customerFullName: order.customerFullName,
      customerEmail: order.customerEmail || '',
      productsOrdered: order.productsOrdered,
      quantities: order.quantities,
      totalPrice: order.totalPrice,
      orderStatus: order.orderStatus || 'New',
      paymentStatus: order.paymentStatus || 'cash_on_delivery',
      paymentMethod: order.paymentMethod || 'cash',
      fulfillmentMethod: order.fulfillmentMethod || 'delivery',
      createdTimestamp: order.createdTimestamp,
    });

    // Securely trigger server-side push notification to store owner devices
    try {
      fetch('/api/notify-new-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: docRef.id,
          totalPrice: order.totalPrice,
          customerFullName: order.customerFullName,
        }),
      }).catch((e) => console.log('Server notification dispatch error:', e));
    } catch {
      // Non-blocking
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Subscribes to real-time orders for the Store Owner.
 */
export function subscribeToStoreOrders(
  onUpdate: (orders: CustomerOrder[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'orders';
  const q = query(collection(db, path));
  return onSnapshot(
    q,
    (snapshot) => {
      const ordersList: CustomerOrder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        ordersList.push({
          id: docSnap.id,
          customerUid: data.customerUid,
          customerFullName: data.customerFullName || '',
          customerEmail: data.customerEmail || '',
          productsOrdered: data.productsOrdered || [],
          quantities: data.quantities || 0,
          totalPrice: data.totalPrice || 0,
          orderStatus: data.orderStatus || 'New',
          paymentStatus: data.paymentStatus || 'cash_on_delivery',
          paymentMethod: data.paymentMethod || 'cash',
          fulfillmentMethod: data.fulfillmentMethod || 'delivery',
          createdTimestamp: data.createdTimestamp || new Date().toISOString(),
        });
      });
      // Sort newest first
      ordersList.sort((a, b) => {
        return new Date(b.createdTimestamp).getTime() - new Date(a.createdTimestamp).getTime();
      });
      onUpdate(ordersList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribes to real-time orders for a specific authenticated customer.
 * Directly listens to changes from Firestore and maps live order status.
 */
export function subscribeToCustomerOrders(
  customerUid: string,
  onUpdate: (orders: CustomerOrder[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const path = 'orders';
  try {
    const q = query(
      collection(db, path),
      where('customerUid', '==', customerUid)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const ordersList: CustomerOrder[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          ordersList.push({
            id: docSnap.id,
            customerUid: data.customerUid,
            customerFullName: data.customerFullName || '',
            customerEmail: data.customerEmail || '',
            productsOrdered: data.productsOrdered || [],
            quantities: data.quantities || 0,
            totalPrice: data.totalPrice || 0,
            orderStatus: data.orderStatus || 'New',
            paymentStatus: data.paymentStatus || 'cash_on_delivery',
            paymentMethod: data.paymentMethod || 'cash',
            fulfillmentMethod: data.fulfillmentMethod || 'delivery',
            createdTimestamp: data.createdTimestamp || new Date().toISOString(),
          });
        });

        // Sort newest first
        ordersList.sort((a, b) => {
          return new Date(b.createdTimestamp).getTime() - new Date(a.createdTimestamp).getTime();
        });

        onUpdate(ordersList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    if (onError) onError(error);
    return () => {};
  }
}

/**
 * Updates an order's status in Firestore (Store Owner).
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      orderStatus: newStatus,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Deletes a single order from Firestore (Store Owner only).
 */
export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    const docRef = doc(db, 'orders', orderId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Deletes all orders from the Firestore orders collection (Store Owner only).
 */
export async function deleteAllOrdersFromFirestore(orders?: CustomerOrder[]): Promise<void> {
  const path = 'orders';
  try {
    let orderIds: string[] = [];
    if (orders && orders.length > 0) {
      orderIds = orders.filter((o) => !!o.id).map((o) => o.id!);
    } else {
      const snap = await getDocs(collection(db, 'orders'));
      orderIds = snap.docs.map((d) => d.id);
    }

    if (orderIds.length === 0) return;

    // Use writeBatch (chunked into batches of 400 for safety against Firestore limits)
    const chunkSize = 400;
    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'orders', id));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// --- Firebase Cloud Messaging (FCM) Web Push Notifications ---

let messagingInstance: Messaging | null = null;

/**
 * Initializes and returns the Firebase Messaging instance if supported in current browser/environment.
 */
export async function getFcmMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('FCM is not supported in this browser or environment:', err);
    return null;
  }
}

/**
 * Convert base64 VAPID public key string to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers a standard Web Push subscription for the Store Owner:
 * - Only users with role: 'store_owner' can register
 * - Uses standard VAPID key pair via backend & environment variables
 * - Saves subscription securely in Firestore under `store_owner_subscriptions`
 * - Supports multiple devices per store owner
 * - Syncs subscription with backend server for dispatching push notifications
 */
export async function registerStoreOwnerPushSubscription(user: UserProfile): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  // Security: Only store_owner accounts can register
  if (!user || user.role !== 'store_owner') {
    return null;
  }

  try {
    // 1. Retrieve Public VAPID Key from environment or backend
    let publicVapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      try {
        const resp = await fetch('/api/vapid-public-key');
        if (resp.ok) {
          const data = await resp.json();
          publicVapidKey = data.publicKey;
        }
      } catch (e) {
        console.warn('[Web Push] Could not fetch public key from /api/vapid-public-key:', e);
      }
    }

    if (!publicVapidKey) {
      console.warn('[Web Push] Public VAPID key not available');
      return null;
    }

    // 2. Ensure Service Worker is registered
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    // 3. Obtain or renew Web Push Subscription
    let subscription = await swReg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });
    }

    const subJson = subscription.toJSON();

    // 4. Save subscription securely in Firestore under `store_owner_subscriptions`
    // Deterministic safe document ID from uid + hashed endpoint to support multiple devices
    try {
      const endpointHash = btoa(subscription.endpoint).replace(/[^a-zA-Z0-9_-]/g, '').slice(-32);
      const docId = `${user.uid}_${endpointHash}`;
      const docRef = doc(db, 'store_owner_subscriptions', docId);
      await setDoc(
        docRef,
        {
          uid: user.uid,
          endpoint: subscription.endpoint,
          keys: subJson.keys || null,
          subscriptionJson: JSON.stringify(subJson),
          updatedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('[Web Push] Firestore subscription persistence notice:', fsErr);
    }

    // 5. Register subscription with the backend server
    try {
      await fetch('/api/store-owner/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          role: user.role,
          subscription: subJson,
        }),
      });
    } catch (srvErr) {
      console.warn('[Web Push] Server subscription sync notice:', srvErr);
    }

    return subscription;
  } catch (err) {
    console.error('[Web Push] Error registering Web Push subscription:', err);
    return null;
  }
}

/**
 * Stores store-owner's FCM device token securely in Firestore.
 * Supports multiple devices/tokens for the same store-owner account.
 */
export async function saveStoreOwnerFcmToken(uid: string, token: string): Promise<void> {
  const path = 'store_owner_tokens';
  try {
    // Generate a deterministic safe document ID from uid + token ending
    const sanitizedSuffix = token.replace(/[^a-zA-Z0-9]/g, '').slice(-28);
    const docId = `${uid}_${sanitizedSuffix}`;
    const docRef = doc(db, path, docId);
    await setDoc(
      docRef,
      {
        token,
        uid,
        updatedAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Requests FCM registration token for the Store Owner and saves it to Firestore.
 */
export async function registerStoreOwnerFcmToken(uid: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  try {
    const messaging = await getFcmMessaging();
    if (!messaging) return null;

    // Ensure service worker is registered
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
    }

    const rawVapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;
    const vapidKey = rawVapidKey && rawVapidKey.trim() !== '' ? rawVapidKey.trim() : undefined;
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      await saveStoreOwnerFcmToken(uid, token);
      return token;
    }
    return null;
  } catch (err) {
    console.warn('Could not register FCM token:', err);
    return null;
  }
}

/**
 * Subscribes to foreground push notifications for the Store Owner.
 */
export function onForegroundFcmMessage(callback: (payload: any) => void): (() => void) | null {
  if (typeof window === 'undefined') return null;
  let unsubscribeFn: (() => void) | null = null;
  getFcmMessaging()
    .then((messaging) => {
      if (messaging) {
        unsubscribeFn = onMessage(messaging, callback);
      }
    })
    .catch(() => {});

  return () => {
    if (unsubscribeFn) unsubscribeFn();
  };
}
