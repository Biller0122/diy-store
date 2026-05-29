import { create } from 'zustand';
import { acceptDeliveryApi, rejectDeliveryApi, updateOrderStatusApi } from '../api/client';
import { MOCK_ORDER } from '../data/mock';
import { socketService } from '../services/socket';

export type StopStatus = 'PENDING' | 'ARRIVED' | 'PICKED_UP';
export type OrderStatus = 'REQUESTED' | 'DRIVER_ASSIGNED' | 'DRIVER_AT_STORE' | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';

export type PickupStop = {
  supplierId: string;
  supplierName: string;
  district: string;
  address: string;
  phone?: string;
  items: Array<{ name: string; qty: number }>;
  lat: number;
  lng: number;
  status: StopStatus;
};

export type ActiveOrder = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerDistrict: string;
  customerKhoroo?: string;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  distance: number;
  estimatedDuration: number;
  fee: number;
  status: OrderStatus;
  currentStop: number;
  deliveryNote?: string;
  pickupStops: PickupStop[];
};

type DriverLocation = { lat: number; lng: number; heading?: number | null };

type DeliveryState = {
  activeOrder: ActiveOrder | null;
  incomingOrder: ActiveOrder | null;
  currentStop: number;
  driverLocation: DriverLocation;
  isOnline: boolean;
  setOnline: () => void;
  setOffline: () => void;
  setIncomingOrder: (order: ActiveOrder | null) => void;
  acceptOrder: (driverId: string, order?: ActiveOrder) => Promise<void>;
  rejectOrder: (driverId: string, order?: ActiveOrder) => Promise<void>;
  updateStatus: (driverId: string, status?: OrderStatus) => Promise<void>;
  setDriverLocation: (location: DriverLocation) => void;
  clearActiveOrder: () => void;
};

function normalizeOrder(order: ActiveOrder): ActiveOrder {
  return {
    ...order,
    orderNumber: order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`,
    pickupStops: order.pickupStops.map((stop) => ({ ...stop, status: stop.status ?? 'PENDING' })),
  };
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  activeOrder: null,
  incomingOrder: null,
  currentStop: 0,
  driverLocation: { lat: 47.9189, lng: 106.9176, heading: 0 },
  isOnline: false,

  setOnline: () => set({ isOnline: true }),
  setOffline: () => set({ isOnline: false, incomingOrder: null }),
  setIncomingOrder: (order) => set({ incomingOrder: order ? normalizeOrder(order) : null }),

  acceptOrder: async (driverId, orderInput) => {
    const order = normalizeOrder(orderInput ?? get().incomingOrder ?? MOCK_ORDER);
    socketService.emitAcceptOrder(driverId, order.orderId);
    acceptDeliveryApi(driverId, order.orderId).catch(() => {});
    set({ activeOrder: { ...order, status: 'DRIVER_ASSIGNED', currentStop: 0 }, incomingOrder: null, currentStop: 0 });
  },

  rejectOrder: async (driverId, orderInput) => {
    const order = orderInput ?? get().incomingOrder;
    if (order) {
      socketService.emitRejectOrder(driverId, order.orderId);
      rejectDeliveryApi(driverId, order.orderId).catch(() => {});
    }
    set({ incomingOrder: null });
  },

  updateStatus: async (driverId, requestedStatus) => {
    const activeOrder = get().activeOrder;
    if (!activeOrder) return;
    const stopIndex = activeOrder.currentStop;
    const nextStops = [...activeOrder.pickupStops];
    let nextStatus: OrderStatus = requestedStatus ?? activeOrder.status;
    let nextCurrentStop = stopIndex;

    if (!requestedStatus) {
      if (activeOrder.status === 'DRIVER_ASSIGNED') {
        nextStatus = 'DRIVER_AT_STORE';
        nextStops[stopIndex] = { ...nextStops[stopIndex], status: 'ARRIVED' };
      } else if (activeOrder.status === 'DRIVER_AT_STORE') {
        nextStops[stopIndex] = { ...nextStops[stopIndex], status: 'PICKED_UP' };
        if (stopIndex < nextStops.length - 1) {
          nextCurrentStop = stopIndex + 1;
          nextStatus = 'DRIVER_ASSIGNED';
        } else {
          nextStatus = 'ON_THE_WAY';
        }
      } else if (activeOrder.status === 'ON_THE_WAY') {
        nextStatus = 'DELIVERED';
      }
    }

    socketService.emitStatusUpdate(activeOrder.orderId, nextStatus);
    updateOrderStatusApi(driverId, activeOrder.orderId, nextStatus).catch(() => {});

    if (nextStatus === 'DELIVERED') {
      set({ activeOrder: null, currentStop: 0 });
      return;
    }

    set({
      activeOrder: { ...activeOrder, status: nextStatus, pickupStops: nextStops, currentStop: nextCurrentStop },
      currentStop: nextCurrentStop,
    });
  },

  setDriverLocation: (location) => set({ driverLocation: location }),
  clearActiveOrder: () => set({ activeOrder: null, currentStop: 0 }),
}));
