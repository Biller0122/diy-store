import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { SHOP_API_URL } from '../api/client';
import { MOCK_ORDER } from '../data/mock';
import { useDeliveryStore } from '../store/delivery';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupDriverNotifications(driverId?: string) {
  if (!Device.isDevice) return null;
  const existing = await Notifications.getPermissionsAsync() as { status?: string; granted?: boolean };
  const finalStatus = existing.granted || existing.status === 'granted'
    ? existing
    : await Notifications.requestPermissionsAsync() as { status?: string; granted?: boolean };
  if (!finalStatus.granted && finalStatus.status !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  fetch(SHOP_API_URL.replace('/shop-api', '/api/device-token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, role: 'driver', driverId }),
  }).catch(() => {});
  return token;
}

export function installNotificationListeners() {
  const received = Notifications.addNotificationReceivedListener((notification) => {
    const type = notification.request.content.data?.type;
    if (type === 'NEW_ORDER_REQUEST') useDeliveryStore.getState().setIncomingOrder(MOCK_ORDER);
    if (type === 'ORDER_CANCELLED') useDeliveryStore.getState().clearActiveOrder();
  });
  const response = Notifications.addNotificationResponseReceivedListener((response) => {
    const type = response.notification.request.content.data?.type;
    if (type === 'NEW_ORDER_REQUEST') useDeliveryStore.getState().setIncomingOrder(MOCK_ORDER);
    if (type === 'ORDER_CANCELLED') useDeliveryStore.getState().clearActiveOrder();
  });
  return () => {
    received.remove();
    response.remove();
  };
}
