import * as Location from 'expo-location';
import { updateDriverLocation } from '../api/client';
import { useDeliveryStore } from '../store/delivery';
import { socketService } from './socket';

let subscription: Location.LocationSubscription | null = null;

export async function startLocationTracking(driverId: string, orderId?: string | null) {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') throw new Error('Байршлын зөвшөөрөл шаардлагатай');

  subscription?.remove();
  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,
      distanceInterval: 1,
    },
    (position) => {
      const payload = {
        driverId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading,
        orderId: orderId ?? useDeliveryStore.getState().activeOrder?.orderId ?? null,
      };
      useDeliveryStore.getState().setDriverLocation({ lat: payload.lat, lng: payload.lng, heading: payload.heading });
      socketService.emitLocationUpdate(payload);
      updateDriverLocation(payload.driverId, payload.lat, payload.lng, payload.heading, payload.orderId).catch(() => {});
    },
  );
}

export function stopLocationTracking() {
  subscription?.remove();
  subscription = null;
}
