/* eslint-disable no-restricted-globals */
// Firebase Cloud Messaging Service Worker for Jay’s Matcha
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBbRCZT_W2wlt6seZeLoOFAqsseOF-6AcM",
  authDomain: "velvety-wave-gghtt.firebaseapp.com",
  projectId: "velvety-wave-gghtt",
  storageBucket: "velvety-wave-gghtt.firebasestorage.app",
  messagingSenderId: "24788356926",
  appId: "1:24788356926:web:6f104b21c5f4fa22a5266f"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const title = payload.notification?.title || payload.data?.title || 'New Order';
  const body = payload.notification?.body || payload.data?.body || 'A new order has been received.';
  const orderId = payload.data?.orderId || payload.notification?.data?.orderId;

  const options = {
    body: body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: orderId ? `order-${orderId}` : 'new-order',
    renotify: true,
    data: {
      url: '/?tab=dashboard' + (orderId ? `&orderId=${encodeURIComponent(orderId)}` : ''),
      orderId: orderId,
    },
  };

  return self.registration.showNotification(title, options);
});

// Generic push handler fallback
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.notification?.title || data.title || 'New Order';
    const body = data.notification?.body || data.body || 'A new order has been received.';
    const orderId = data.data?.orderId || data.orderId;

    const options = {
      body: body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: orderId ? `order-${orderId}` : 'new-order',
      renotify: true,
      data: {
        url: '/?tab=dashboard' + (orderId ? `&orderId=${encodeURIComponent(orderId)}` : ''),
        orderId: orderId,
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Fallback if not json
    event.waitUntil(
      self.registration.showNotification('New Order', {
        body: 'A new order has been received.',
        icon: '/favicon.svg',
        data: { url: '/?tab=dashboard' },
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const orderId = event.notification.data?.orderId;
  const targetUrl = new URL(event.notification.data?.url || '/?tab=dashboard', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and post a message
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            orderId: orderId,
          });
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
