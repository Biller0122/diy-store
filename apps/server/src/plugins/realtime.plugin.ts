import { createServer } from 'http';
import { Server } from 'socket.io';
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import {
  deleteJsonState,
  listJsonState,
  publishJsonMessage,
  setJsonState,
  subscribeJsonMessages,
} from '../services/redis-state.service';

type DriverLocationPayload = {
  orderId?: string;
  driverId: string;
  lat: number;
  lng: number;
};

type OrderStatusPayload = {
  orderId: string;
  status: string;
};

type DriverOrderDecisionPayload = {
  driverId: string;
  orderId: string;
};

type DriverOnlinePayload = string | {
  driverId?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  rating?: number;
  lat?: number;
  lng?: number;
};

type DeliveryRequestPayload = {
  driverId: string;
  orderId: string;
  orderNumber: string;
  fee: number;
  pickupStops: Array<{ supplierId: string; name: string; district: string }>;
  dropoff: { district: string; khoroo?: string };
};

type DriverAssignedPayload = {
  orderId: string;
  orderNumber: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehiclePlate: string;
    rating: number;
  };
  estimatedMinutes: number;
};

type RealtimeBridgeMessage = {
  room: string;
  event: string;
  payload: unknown;
};

const REALTIME_EVENTS_CHANNEL = 'diy:realtime:events';

// Track which drivers are currently online and their last known location
interface OnlineDriverInfo {
  id: string;
  lat: number;
  lng: number;
  socketId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  rating?: number;
}

const onlineDrivers = new Map<string, OnlineDriverInfo>();
const ONLINE_DRIVER_TTL_SECONDS = 120;
let driverOfferHandlers: {
  accept?: (payload: DriverOrderDecisionPayload) => boolean;
  reject?: (payload: DriverOrderDecisionPayload) => boolean;
} = {};

export function getOnlineDrivers(): Map<string, OnlineDriverInfo> {
  return onlineDrivers;
}

export async function getOnlineDriversSnapshot(): Promise<OnlineDriverInfo[]> {
  const persisted = await listJsonState<OnlineDriverInfo>('diy:realtime:drivers:*');
  return persisted && persisted.length > 0 ? persisted : Array.from(onlineDrivers.values());
}

export function getOnlineDriverIds(): string[] {
  return Array.from(onlineDrivers.keys());
}

async function persistOnlineDriver(driver: OnlineDriverInfo) {
  await setJsonState(`diy:realtime:drivers:${driver.id}`, driver, ONLINE_DRIVER_TTL_SECONDS);
}

async function removePersistedOnlineDriver(driverId: string) {
  await deleteJsonState(`diy:realtime:drivers:${driverId}`);
}

let _io: Server | null = null;
let realtimeServerStarted = false;
let realtimeBridgeStarted = false;

const ROOM_ID_RE = /^[A-Za-z0-9:_-]{1,80}$/;

function validRoomId(value: unknown): value is string {
  return typeof value === 'string' && ROOM_ID_RE.test(value);
}

function validCoordinates(lat: unknown, lng: unknown) {
  return typeof lat === 'number'
    && typeof lng === 'number'
    && Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;
}

export function getIO(): Server | null {
  return _io;
}

export function emitToDriver(driverId: string, event: string, payload: unknown) {
  emitToRoom(`driver:${driverId}`, event, payload);
}

export function emitToOrder(orderId: string, event: string, payload: unknown) {
  emitToRoom(`order:${orderId}`, event, payload);
}

export function emitToCustomer(customerId: string, event: string, payload: unknown) {
  emitToRoom(`customer:${customerId}`, event, payload);
}

export function registerDriverOfferHandlers(handlers: typeof driverOfferHandlers) {
  driverOfferHandlers = handlers;
}

export function handleDriverOfferDecision(type: 'accept' | 'reject', payload: DriverOrderDecisionPayload): boolean {
  return driverOfferHandlers[type]?.(payload) ?? false;
}

function emitToRoom(room: string, event: string, payload: unknown) {
  if (_io) {
    _io.to(room).emit(event, payload);
    return;
  }

  void publishJsonMessage(REALTIME_EVENTS_CHANNEL, { room, event, payload });
}

async function forwardDriverDecision(type: 'accept' | 'reject', payload: DriverOrderDecisionPayload): Promise<boolean> {
  const localResult = handleDriverOfferDecision(type, payload);
  if (localResult) return true;

  const webhookUrl = process.env.REALTIME_DECISION_WEBHOOK_URL;
  if (!webhookUrl) return false;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.REALTIME_WEBHOOK_SECRET ? { 'x-realtime-secret': process.env.REALTIME_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({ type, ...payload }),
    });
    if (!response.ok) return false;
    const result = await response.json() as { ok?: boolean };
    return result.ok === true;
  } catch (err) {
    console.warn('[realtime] driver decision webhook failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

async function startRealtimeBridge(io: Server) {
  if (realtimeBridgeStarted) return;
  realtimeBridgeStarted = true;

  const subscribed = await subscribeJsonMessages<RealtimeBridgeMessage>(REALTIME_EVENTS_CHANNEL, (message) => {
    if (!validRoomId(message.room) || typeof message.event !== 'string') return;
    io.to(message.room).emit(message.event, message.payload);
  });
  if (subscribed) {
    console.log('[realtime] Redis event bridge subscribed');
  }
}

export function startRealtimeServer() {
  if (realtimeServerStarted) return;
  realtimeServerStarted = true;

  const port = Number(process.env.SOCKET_PORT || 3002);
  const allowedOrigins = (process.env.SOCKET_CORS_ORIGINS || process.env.STOREFRONT_URL || 'http://localhost:3000,http://localhost:3002')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
    },
  });
  _io = io;
  void startRealtimeBridge(io);

  io.on('connection', (socket) => {
    // Track which driverIds this socket owns (for cleanup on disconnect)
    const socketDriverIds = new Set<string>();

    // ─── Room joins ─────────────────────────────────────────────
    socket.on('order:join', (orderId: string) => {
      if (validRoomId(orderId)) socket.join(`order:${orderId}`);
    });

    socket.on('driver:join', (driverId: string) => {
      if (validRoomId(driverId)) {
        socket.join(`driver:${driverId}`);
        socketDriverIds.add(driverId);
      }
    });

    socket.on('customer:join', (customerId: string) => {
      if (validRoomId(customerId)) socket.join(`customer:${customerId}`);
    });

    // ─── Driver location ─────────────────────────────────────────
    socket.on('driver:location', (payload: DriverLocationPayload) => {
      if (!validRoomId(payload?.driverId) || !validCoordinates(payload?.lat, payload?.lng)) return;
      // Update online driver's known location
      const existing = onlineDrivers.get(payload.driverId);
      if (existing) {
        existing.lat = payload.lat;
        existing.lng = payload.lng;
        void persistOnlineDriver(existing);
      }

      if (validRoomId(payload.orderId)) {
        io.to(`order:${payload.orderId}`).emit('driver:location', payload);
      }
      io.to(`driver:${payload.driverId}`).emit('driver:location', payload);
    });

    // ─── Order status ─────────────────────────────────────────────
    socket.on('order:status', (payload: OrderStatusPayload) => {
      if (!validRoomId(payload?.orderId) || typeof payload?.status !== 'string') return;
      io.to(`order:${payload.orderId}`).emit('order:status', payload);
    });

    socket.on('driver:accept_order', async (payload: DriverOrderDecisionPayload) => {
      if (!validRoomId(payload?.driverId) || !validRoomId(payload?.orderId)) return;
      const accepted = await forwardDriverDecision('accept', payload);
      if (!accepted) return;
      io.to(`driver:${payload.driverId}`).emit('driver:order_accepted', payload);
      io.to(`order:${payload.orderId}`).emit('order:status', { orderId: payload.orderId, status: 'ACCEPTED' });
    });

    socket.on('driver:reject_order', async (payload: DriverOrderDecisionPayload) => {
      if (!validRoomId(payload?.driverId) || !validRoomId(payload?.orderId)) return;
      const rejected = await forwardDriverDecision('reject', payload);
      if (!rejected) return;
      io.to(`driver:${payload.driverId}`).emit('driver:order_rejected', payload);
      io.to(`order:${payload.orderId}`).emit('order:status', { orderId: payload.orderId, status: 'REJECTED' });
    });

    // ─── Driver online / offline ──────────────────────────────────
    socket.on('driver:online', (payload: DriverOnlinePayload) => {
      const driverId = typeof payload === 'string' ? payload : payload.driverId ?? payload.id;
      if (!validRoomId(driverId)) return;
      console.log('[realtime] driver online', driverId);
      socketDriverIds.add(driverId);
      socket.join(`driver:${driverId}`);
      // Register as online with default UB center coords
      const driverInfo = {
        id: driverId,
        lat: typeof payload === 'string' ? 47.9185 : payload.lat ?? 47.9185,
        lng: typeof payload === 'string' ? 106.917 : payload.lng ?? 106.917,
        socketId: socket.id,
        firstName: typeof payload === 'string' ? undefined : payload.firstName,
        lastName: typeof payload === 'string' ? undefined : payload.lastName,
        phone: typeof payload === 'string' ? undefined : payload.phone,
        vehicleType: typeof payload === 'string' ? undefined : payload.vehicleType,
        vehiclePlate: typeof payload === 'string' ? undefined : payload.vehiclePlate,
        rating: typeof payload === 'string' ? undefined : payload.rating,
      };
      onlineDrivers.set(driverId, driverInfo);
      void persistOnlineDriver(driverInfo);
      io.emit('driver:online', { driverId, isOnline: true });
    });

    socket.on('driver:offline', (driverId: string) => {
      if (!validRoomId(driverId)) return;
      console.log('[realtime] driver offline', driverId);
      onlineDrivers.delete(driverId);
      void removePersistedOnlineDriver(driverId);
      socketDriverIds.delete(driverId);
      io.emit('driver:offline', { driverId, isOnline: false });
    });

    // ─── Cleanup on disconnect ────────────────────────────────────
    socket.on('disconnect', () => {
      socketDriverIds.forEach((driverId) => {
        onlineDrivers.delete(driverId);
        void removePersistedOnlineDriver(driverId);
        console.log('[realtime] driver disconnected, removed from online:', driverId);
      });
    });
  });

  httpServer.listen(port, () => {
    console.log(`✅ Realtime socket server started on :${port}`);
  });
}

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class RealtimePlugin {}
