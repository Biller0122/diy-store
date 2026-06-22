import { create } from 'zustand';
import { acceptDeliveryApi, completeDeliveryWithCodeApi, getActiveDeliveryApi, rejectDeliveryApi, updateDeliveryPickupStopApi, updateDeliveryStatusApi, type ActiveDeliveryResult } from '../api/client';
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
  driverLocation: DriverLocation | null;
  isOnline: boolean;
  setOnline: () => void;
  setOffline: () => void;
  setIncomingOrder: (order: ActiveOrder | null) => void;
  acceptOrder: (driverId: string, order?: ActiveOrder) => Promise<void>;
  rejectOrder: (driverId: string, order?: ActiveOrder) => Promise<void>;
  updateStatus: (driverId: string, status?: OrderStatus) => Promise<void>;
  completeWithCode: (driverId: string, code: string) => Promise<void>;
  refreshActiveOrder: (driverId: string) => Promise<void>;
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

function mapBackendStatus(status: string): OrderStatus {
  if (status === 'ACCEPTED') return 'DRIVER_ASSIGNED';
  if (status === 'IN_PROGRESS') return 'ON_THE_WAY';
  if (status === 'COMPLETED') return 'DELIVERED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'REQUESTED';
}

function normalizeBackendOrder(delivery: ActiveDeliveryResult): ActiveOrder {
  return normalizeOrder({
    id: delivery.id,
    orderId: delivery.id,
    orderNumber: delivery.orderNumber ?? delivery.orderId,
    customerName: delivery.customerName ?? 'Хэрэглэгч',
    customerPhone: delivery.customerPhone ?? '',
    customerDistrict: delivery.dropoffAddress.split(',')[0]?.trim() ?? 'Улаанбаатар',
    dropoffAddress: delivery.dropoffAddress,
    dropoffLat: delivery.dropoffLat,
    dropoffLng: delivery.dropoffLng,
    distance: delivery.distance,
    estimatedDuration: delivery.estimatedDuration,
    fee: delivery.proposedFee,
    status: mapBackendStatus(delivery.status),
    currentStop: delivery.status === 'IN_PROGRESS' ? Math.max(0, delivery.pickupStops.length - 1) : 0,
    pickupStops: delivery.pickupStops.map((stop) => ({
      supplierId: stop.supplierId,
      supplierName: stop.supplierName,
      district: stop.district ?? '',
      address: stop.address,
      phone: stop.phone ?? undefined,
      lat: stop.lat,
      lng: stop.lng,
      status: stop.status === 'PICKED_UP' ? 'PICKED_UP' : stop.status === 'ARRIVED' ? 'ARRIVED' : 'PENDING',
      items: delivery.orderItems
        .filter((item) => item.supplierId === stop.supplierId)
        .map((item) => ({ name: item.name, qty: item.qty })),
    })),
  });
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  activeOrder: null,
  incomingOrder: null,
  currentStop: 0,
  driverLocation: null,
  isOnline: false,

  setOnline: () => set({ isOnline: true }),
  setOffline: () => set({ isOnline: false, incomingOrder: null }),
  setIncomingOrder: (order) => set({ incomingOrder: order ? normalizeOrder(order) : null }),

  acceptOrder: async (driverId, orderInput) => {
    const pending = orderInput ?? get().incomingOrder;
    if (!pending) return;
    const order = normalizeOrder(pending);
    socketService.emitAcceptOrder(driverId, order.orderId);
    await acceptDeliveryApi(driverId, order.orderId);
    set({ activeOrder: { ...order, id: order.orderId, status: 'DRIVER_ASSIGNED', currentStop: 0 }, incomingOrder: null, currentStop: 0 });
  },

  rejectOrder: async (driverId, orderInput) => {
    const order = orderInput ?? get().incomingOrder;
    if (order) {
      socketService.emitRejectOrder(driverId, order.orderId);
      await rejectDeliveryApi(driverId, order.orderId);
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

    if (activeOrder.status === 'DRIVER_ASSIGNED' && nextStatus === 'DRIVER_AT_STORE') {
      socketService.emitStatusUpdate(activeOrder.orderId, 'IN_PROGRESS');
      await updateDeliveryStatusApi(activeOrder.id, 'IN_PROGRESS');
      if (nextStops[stopIndex]) {
        await updateDeliveryPickupStopApi(activeOrder.id, nextStops[stopIndex].supplierId, 'ARRIVED');
      }
    }

    if (activeOrder.status === 'DRIVER_AT_STORE' && nextStops[stopIndex]?.status === 'PICKED_UP') {
      await updateDeliveryPickupStopApi(activeOrder.id, nextStops[stopIndex].supplierId, 'PICKED_UP');
    }

    if (nextStatus === 'DELIVERED') {
      set({ activeOrder: null, currentStop: 0 });
      return;
    }

    set({
      activeOrder: { ...activeOrder, status: nextStatus, pickupStops: nextStops, currentStop: nextCurrentStop },
      currentStop: nextCurrentStop,
    });
  },

  completeWithCode: async (driverId, code) => {
    const activeOrder = get().activeOrder;
    if (!activeOrder) return;
    const normalizedCode = code.replace(/\D/g, '');
    if (normalizedCode.length !== 6) throw new Error('6 оронтой буулгах код оруулна уу');
    await completeDeliveryWithCodeApi(activeOrder.id, driverId, normalizedCode);
    socketService.emitStatusUpdate(activeOrder.orderId, 'COMPLETED');
    set({ activeOrder: null, currentStop: 0 });
  },

  refreshActiveOrder: async (driverId) => {
    const data = await getActiveDeliveryApi(driverId);
    const delivery = data.activeDeliveriesForDriver?.[0];
    set({
      activeOrder: delivery ? normalizeBackendOrder(delivery) : null,
      currentStop: delivery?.status === 'IN_PROGRESS' ? Math.max(0, delivery.pickupStops.length - 1) : 0,
    });
  },

  setDriverLocation: (location) => set({ driverLocation: location }),
  clearActiveOrder: () => set({ activeOrder: null, currentStop: 0 }),
}));
