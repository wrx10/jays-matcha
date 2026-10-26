const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Cloud Function triggered whenever a NEW customer order is created in Firestore.
 * Securely sends Firebase Cloud Messaging (FCM) web push notifications to all registered store owners.
 */
exports.notifyStoreOwnerOnNewOrder = onDocumentCreated(
  {
    document: "orders/{orderId}",
    database: "ai-studio-jaysmatcha-c787c6da-76b1-46ce-b97f-1fa997796283",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No order data found.");
      return null;
    }

    const orderId = event.params.orderId;
    const orderData = snap.data();

    console.log(`Processing new order notification for order: ${orderId}`);

    try {
      const db = admin.firestore();
      // Fetch all store owner FCM registration tokens
      const tokensSnap = await db.collection("store_owner_tokens").get();
      if (tokensSnap.empty) {
        console.log("No store owner FCM tokens registered in store_owner_tokens collection.");
        return null;
      }

      const tokens = [];
      const tokenDocs = [];
      tokensSnap.forEach((doc) => {
        const data = doc.data();
        if (data.token && typeof data.token === "string") {
          tokens.push(data.token);
          tokenDocs.push({ id: doc.id, token: data.token });
        }
      });

      if (tokens.length === 0) {
        console.log("No valid FCM tokens found.");
        return null;
      }

      // Exact notification title and body as requested
      const payload = {
        notification: {
          title: "New Order",
          body: "A new order has been received.",
        },
        data: {
          orderId: String(orderId),
          url: `/?tab=dashboard&orderId=${orderId}`,
        },
        webpush: {
          notification: {
            title: "New Order",
            body: "A new order has been received.",
            icon: "/favicon.svg",
            badge: "/favicon.svg",
            tag: `order-${orderId}`,
            renotify: true,
          },
          fcmOptions: {
            link: `/?tab=dashboard&orderId=${orderId}`,
          },
        },
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log(`Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed.`);

      // Clean up invalid or expired tokens
      if (response.failureCount > 0) {
        const staleTokenDeletions = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (
              errCode === "messaging/invalid-registration-token" ||
              errCode === "messaging/registration-token-not-registered"
            ) {
              const staleDocId = tokenDocs[idx]?.id;
              if (staleDocId) {
                console.log(`Removing expired token: ${staleDocId}`);
                staleTokenDeletions.push(db.collection("store_owner_tokens").doc(staleDocId).delete());
              }
            }
          }
        });
        if (staleTokenDeletions.length > 0) {
          await Promise.all(staleTokenDeletions);
        }
      }

      return { success: true, count: response.successCount };
    } catch (error) {
      console.error("Error sending FCM notification for new order:", error);
      return null;
    }
  }
);
