import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';

// Initialize only if not already initialized
if (!admin.getApps().length) {
  try {
    if (fs.existsSync('./firebase-service-account.json')) {
      const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf-8'));
      admin.initializeApp({
        credential: admin.cert(serviceAccount),
        projectId: 'auto-parts-market-place-20312'
      });
      console.log("Firebase Admin initialized for notifications");
    } else {
      admin.initializeApp();
      console.log("Firebase Admin initialized with default credentials");
    }
  } catch (err) {
    console.warn("Failed to initialize Firebase Admin:", err);
  }
}

export const sendChatNotification = async (req: any, res: any) => {
  try {
    const { senderId, senderName, receiverId, text, chatId, partTitle, partImageUrl } = req.body || {};
    
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ error: "Missing parameters" });
    }
    
    if (!admin.getApps().length) {
      return res.json({ status: "Admin not initialized, client-side Firestore handling active" });
    }

    const db = getFirestore();
    
    // Check receiver FCM token
    const userDoc = await db.collection("users").doc(receiverId).get().catch(() => null);
    if (!userDoc || !userDoc.exists) {
      return res.json({ status: "Receiver not found or no FCM needed" });
    }
    
    const fcmToken = userDoc.data()?.fcmToken;
    if (!fcmToken) {
      return res.json({ status: "No FCM token for user" });
    }
    
    // Send FCM High Priority Push with Explicit Sound & Android Channel
    const payload = {
      token: fcmToken,
      notification: {
        title: senderName ? `Message from ${senderName}` : "New message",
        body: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        imageUrl: partImageUrl || undefined,
      },
      data: {
        screen: "ChatRoom",
        chatRoomId: chatId || "",
        chatId: chatId || "",
        title: senderName || "New Message",
        body: text.substring(0, 100),
        partTitle: partTitle || "",
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      },
      android: {
        priority: "high" as const,
        ttl: 3600 * 1000,
        notification: {
          sound: "default",
          channelId: "auto_parts_alerts_v2",
          priority: "max" as const,
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: "public" as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await getMessaging().send(payload);
    console.log("[FCM Server] Notification sent successfully:", response);
    return res.json({ status: "Sent successfully", messageId: response });
  } catch (err: any) {
    console.warn("FCM Send Warning:", err?.message || err);
    return res.json({ status: "Handled", warning: err?.message });
  }
};
