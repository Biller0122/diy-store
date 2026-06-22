import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/app/config';
import type { Driver } from '../api/client';
import { ActiveOrder } from '../store/delivery';

type OrderPayload = {
  orderId?: string;
  orderNumber?: string;
  fee?: number;
  distance?: number;
  estimatedMinutes?: number;
  pickupStops?: Array<{
    supplierId?: string;
    name?: string;
    supplierName?: string;
    district?: string;
    address?: string;
    phone?: string;
    lat?: number;
    lng?: number;
    items?: Array<{ name: string; qty: number }>;
  }>;
  dropoff?: {
    district?: string;
    khoroo?: string;
    address?: string;
    customerName?: string;
    customerPhone?: string;
    lat?: number;
    lng?: number;
  };
};

function toOrder(payload: OrderPayload): ActiveOrder {
  const dropoff = payload.dropoff ?? {};
  return {
    id: payload.orderId ?? `req-${Date.now()}`,
    orderId: payload.orderId ?? `ORD-${Date.now()}`,
    orderNumber: payload.orderNumber ?? '#DIY-2024-00001',
    customerName: dropoff.customerName ?? 'Хэрэглэгч',
    customerPhone: dropoff.customerPhone ?? '',
    customerDistrict: dropoff.district ?? 'Улаанбаатар',
    customerKhoroo: dropoff.khoroo,
    dropoffAddress: dropoff.address ?? `${dropoff.district ?? 'Улаанбаатар'}${dropoff.khoroo ? `, ${dropoff.khoroo}` : ''}`,
    dropoffLat: dropoff.lat ?? 47.9268,
    dropoffLng: dropoff.lng ?? 106.9145,
    distance: payload.distance ?? 4.2,
    estimatedDuration: payload.estimatedMinutes ?? 25,
    fee: payload.fee ?? 8500,
    status: 'REQUESTED',
    currentStop: 0,
    pickupStops: (payload.pickupStops ?? []).map((stop, index) => ({
      supplierId: stop.supplierId ?? `supplier-${index}`,
      supplierName: stop.supplierName ?? stop.name ?? 'Нийлүүлэгч',
      district: stop.district ?? 'Баянзүрх',
      address: stop.address ?? '',
      phone: stop.phone,
      lat: stop.lat ?? 47.92,
      lng: stop.lng ?? 106.93,
      items: stop.items ?? [],
      status: 'PENDING',
    })),
  };
}

class SocketService {
  private socket: Socket | null = null;
  private driverId: string | null = null;
  private driver: Driver | null = null;
  private token: string | null = null;
  private onOrderRequest: ((order: ActiveOrder) => void) | null = null;
  private onConnectionChange: ((status: { connected: boolean; message: string }) => void) | null = null;

  setConnectionListener(listener: ((status: { connected: boolean; message: string }) => void) | null) {
    this.onConnectionChange = listener;
  }

  connect(driverId: string, onOrderRequest: (order: ActiveOrder) => void, driver?: Driver | null, token?: string | null) {
    this.driverId = driverId;
    this.driver = driver ?? null;
    this.token = token ?? null;
    this.onOrderRequest = onOrderRequest;
    if (this.socket?.connected) {
      this.joinDriverRoom();
      this.onConnectionChange?.({ connected: true, message: 'Socket холбогдсон' });
      return;
    }
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: this.token ? { token: this.token } : undefined,
      extraHeaders: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    this.socket.on('connect', () => {
      this.joinDriverRoom();
      this.onConnectionChange?.({ connected: true, message: 'Socket холбогдсон' });
    });
    this.socket.on('disconnect', (reason) => {
      this.onConnectionChange?.({ connected: false, message: `Socket тасарлаа: ${reason}` });
    });
    this.socket.on('connect_error', (error) => {
      this.onConnectionChange?.({ connected: false, message: error.message || 'Socket холбогдсонгүй' });
    });
    this.socket.io.on('reconnect_attempt', () => {
      this.onConnectionChange?.({ connected: false, message: 'Socket дахин холбогдож байна...' });
    });
    this.socket.io.on('reconnect', () => {
      this.joinDriverRoom();
      this.onConnectionChange?.({ connected: true, message: 'Socket дахин холбогдлоо' });
    });
    this.socket.on('order:new_request', (payload: OrderPayload) => this.onOrderRequest?.(toOrder(payload)));
    this.socket.on('delivery:request', (payload: OrderPayload) => this.onOrderRequest?.(toOrder(payload)));
  }

  private joinDriverRoom() {
    if (!this.socket || !this.driverId) return;
    this.socket.emit('driver:join', this.driverId);
    this.socket.emit('join', `driver:${this.driverId}`);
    this.socket.emit('driver:online', {
      driverId: this.driverId,
      firstName: this.driver?.firstName,
      lastName: this.driver?.lastName,
      phone: this.driver?.phone,
      vehicleType: this.driver?.vehicleType,
      vehiclePlate: this.driver?.vehiclePlate,
      rating: this.driver?.rating,
    });
  }

  disconnect() {
    if (this.driverId) this.socket?.emit('driver:offline', this.driverId);
    this.socket?.disconnect();
    this.socket = null;
    this.driverId = null;
    this.driver = null;
    this.token = null;
    this.onConnectionChange?.({ connected: false, message: 'Socket салгагдсан' });
  }

  emitAcceptOrder(driverId: string, orderId: string) {
    this.socket?.emit('driver:accept_order', { driverId, orderId });
  }

  emitRejectOrder(driverId: string, orderId: string) {
    this.socket?.emit('driver:reject_order', { driverId, orderId });
  }

  emitLocationUpdate(payload: { driverId: string; lat: number; lng: number; heading?: number | null; orderId?: string | null }) {
    this.socket?.emit('driver:location', payload);
  }

  emitStatusUpdate(orderId: string, status: string) {
    this.socket?.emit('order:status', { orderId, status });
  }
}

export const socketService = new SocketService();
