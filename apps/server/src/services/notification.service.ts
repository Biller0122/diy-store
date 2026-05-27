// FIX 5 — Firebase FCM notification service
// Set FIREBASE_MOCK_MODE=true to use console.log + in-memory store instead of real FCM

const IS_MOCK = process.env.FIREBASE_MOCK_MODE === 'true' || process.env.NODE_ENV !== 'production';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface StoredNotification {
  id: string;
  recipientId: string;
  recipientType: 'driver' | 'customer';
  token?: string;
  payload: NotificationPayload;
  sentAt: Date;
  status: 'sent' | 'mock' | 'failed';
}

// In-memory store for mock mode (and as a fallback log in prod)
const notificationLog: StoredNotification[] = [];

function storeNotification(n: StoredNotification) {
  notificationLog.push(n);
  if (notificationLog.length > 500) notificationLog.shift();
}

function mockId() {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Device token registry ────────────────────────────────────

const deviceTokens = new Map<string, string>(); // recipientId → FCM token

export function storeDeviceToken(recipientId: string, token: string) {
  deviceTokens.set(recipientId, token);
  console.log(`[FCM] device token registered for ${recipientId}`);
}

// ─── Core send function ────────────────────────────────────────

async function sendPushNotification(
  recipientId: string,
  recipientType: 'driver' | 'customer',
  payload: NotificationPayload,
): Promise<void> {
  const token = deviceTokens.get(recipientId);
  const entry: StoredNotification = {
    id: mockId(),
    recipientId,
    recipientType,
    token,
    payload,
    sentAt: new Date(),
    status: IS_MOCK ? 'mock' : 'sent',
  };

  if (IS_MOCK) {
    console.log(`[FCM MOCK] → ${recipientType}:${recipientId}`);
    console.log(`  title: ${payload.title}`);
    console.log(`  body:  ${payload.body}`);
    if (payload.data) console.log(`  data:`, payload.data);
    storeNotification(entry);
    return;
  }

  if (!token) {
    console.warn(`[FCM] no device token for ${recipientType}:${recipientId}`);
    entry.status = 'failed';
    storeNotification(entry);
    return;
  }

  try {
    // Real FCM send — only runs when FIREBASE_MOCK_MODE is not true
    // firebase-admin loaded dynamically; install it in production via: npm i firebase-admin
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin') as {
      initializeApp: (opts: unknown) => unknown;
      credential: { cert: (json: unknown) => unknown };
      messaging: () => { send: (msg: unknown) => Promise<void> };
    };

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '{}');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

    await admin.messaging().send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
    });

    storeNotification(entry);
  } catch (err) {
    console.error('[FCM] send failed:', err);
    entry.status = 'failed';
    storeNotification(entry);
  }
}

// ─── Public API ───────────────────────────────────────────────

export async function sendDriverNewOrderNotification(
  driverId: string,
  orderData: {
    orderId: string;
    orderNumber: string;
    fee: number;
    distance: number;
    pickupCount: number;
    dropoffDistrict: string;
  },
) {
  await sendPushNotification(driverId, 'driver', {
    title: '🚀 Шинэ захиалга ирлээ!',
    body: `${orderData.orderNumber} · ₮${Math.round(orderData.fee / 100).toLocaleString()} · ${orderData.distance.toFixed(1)} км`,
    data: {
      type: 'NEW_ORDER',
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      fee: String(orderData.fee),
    },
  });
}

export async function sendCustomerDriverAssignedNotification(
  customerId: string,
  orderData: {
    orderNumber: string;
    driverName: string;
    driverPhone: string;
    estimatedMinutes: number;
  },
) {
  await sendPushNotification(customerId, 'customer', {
    title: '🏍️ Жолооч олдлоо!',
    body: `${orderData.driverName} таны захиалгыг хүргэх болно. ~${orderData.estimatedMinutes} мин`,
    data: {
      type: 'DRIVER_ASSIGNED',
      orderNumber: orderData.orderNumber,
      driverName: orderData.driverName,
    },
  });
}

export async function sendCustomerStatusNotification(
  customerId: string,
  orderNumber: string,
  status: string,
) {
  const messages: Record<string, { title: string; body: string }> = {
    ACCEPTED:    { title: '✅ Захиалга баталгаажлаа',  body: `${orderNumber} хүргэлт эхэллээ` },
    IN_PROGRESS: { title: '🚚 Хүргэж байна',           body: `${orderNumber} замдаа байна` },
    COMPLETED:   { title: '🎉 Хүргэгдлээ!',            body: `${orderNumber} амжилттай хүргэгдлээ` },
    CANCELLED:   { title: '❌ Захиалга цуцлагдлаа',    body: `${orderNumber} цуцлагдсан` },
  };

  const msg = messages[status];
  if (!msg) return;

  await sendPushNotification(customerId, 'customer', {
    ...msg,
    data: { type: 'ORDER_STATUS', orderNumber, status },
  });
}

export function getNotificationLog(): StoredNotification[] {
  return [...notificationLog].reverse();
}
