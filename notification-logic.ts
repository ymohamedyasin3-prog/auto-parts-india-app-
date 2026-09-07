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
    
    // Send FCM push
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
        title: senderName || "New Message",
        body: text.substring(0, 100),
        partTitle: partTitle || ""
      },
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
    };

    await getMessaging().send(payload);
    return res.json({ status: "Sent successfully" });
  } catch (err: any) {
    console.warn("FCM Send Warning:", err?.message || err);
    return res.json({ status: "Handled", warning: err?.message });
  }
};
