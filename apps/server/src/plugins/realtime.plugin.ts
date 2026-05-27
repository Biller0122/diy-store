import { createServer } from 'http';
import { Server } from 'socket.io';

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

// Track which drivers are currently online and their last known location
interface OnlineDriverInfo {
  id: string;
  lat: number;
  lng: number;
  socketId: string;
}

const onlineDrivers = new Map<string, OnlineDriverInfo>();

export function getOnlineDrivers(): Map<string, OnlineDriverInfo> {
  return onlineDrivers;
}

export function getOnlineDriverIds(): string[] {
  return Array.from(onlineDrivers.keys());
}

let _io: Server | null = null;
let realtimeServerStarted = false;

export function getIO(): Server | null {
  return _io;
}

export function emitToDriver(driverId: string, event: string, payload: unknown) {
  _io?.to(`driver:${driverId}`).emit(event, payload);
}

export function emitToOrder(orderId: string, event: string, payload: unknown) {
  _io?.to(`order:${orderId}`).emit(event, payload);
}

export function emitToCustomer(customerId: string, event: string, payload: unknown) {
  _io?.to(`customer:${customerId}`).emit(event, payload);
}

export function startRealtimeServer() {
  if (realtimeServerStarted) return;
  realtimeServerStarted = true;

  const port = Number(process.env.SOCKET_PORT || 3002);
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  _io = io;

  io.on('connection', (socket) => {
    // Track which driverIds this socket owns (for cleanup on disconnect)
    const socketDriverIds = new Set<string>();

    // ─── Room joins ─────────────────────────────────────────────
    socket.on('order:join', (orderId: string) => {
      if (orderId) socket.join(`order:${orderId}`);
    });

    socket.on('driver:join', (driverId: string) => {
      if (driverId) {
        socket.join(`driver:${driverId}`);
        socketDriverIds.add(driverId);
      }
    });

    socket.on('customer:join', (customerId: string) => {
      if (customerId) socket.join(`customer:${customerId}`);
    });

    // ─── Driver location ─────────────────────────────────────────
    socket.on('driver:location', (payload: DriverLocationPayload) => {
      // Update online driver's known location
      const existing = onlineDrivers.get(payload.driverId);
      if (existing) {
        existing.lat = payload.lat;
        existing.lng = payload.lng;
      }

      if (payload.orderId) {
        io.to(`order:${payload.orderId}`).emit('driver:location', payload);
      }
      io.to(`driver:${payload.driverId}`).emit('driver:location', payload);
    });

    // ─── Order status ─────────────────────────────────────────────
    socket.on('order:status', (payload: OrderStatusPayload) => {
      io.to(`order:${payload.orderId}`).emit('order:status', payload);
    });

    // ─── Delivery request (server → driver) ──────────────────────
    socket.on('delivery:request', (payload: DeliveryRequestPayload) => {
      io.to(`driver:${payload.driverId}`).emit('delivery:request', payload);
    });

    // ─── Driver assigned (server → customer order room) ──────────
    socket.on('order:driver_assigned', (payload: DriverAssignedPayload) => {
      io.to(`order:${payload.orderId}`).emit('order:driver_assigned', payload);
    });

    // ─── Driver online / offline ──────────────────────────────────
    socket.on('driver:online', (driverId: string) => {
      if (!driverId) return;
      console.log('[realtime] driver online', driverId);
      socketDriverIds.add(driverId);
      socket.join(`driver:${driverId}`);
      // Register as online with default UB center coords
      onlineDrivers.set(driverId, {
        id: driverId,
        lat: 47.9185,
        lng: 106.917,
        socketId: socket.id,
      });
      io.emit('driver:online', { driverId, isOnline: true });
    });

    socket.on('driver:offline', (driverId: string) => {
      if (!driverId) return;
      console.log('[realtime] driver offline', driverId);
      onlineDrivers.delete(driverId);
      socketDriverIds.delete(driverId);
      io.emit('driver:offline', { driverId, isOnline: false });
    });

    // ─── Cleanup on disconnect ────────────────────────────────────
    socket.on('disconnect', () => {
      socketDriverIds.forEach((driverId) => {
        onlineDrivers.delete(driverId);
        console.log('[realtime] driver disconnected, removed from online:', driverId);
      });
    });
  });

  httpServer.listen(port, () => {
    console.log(`✅ Realtime socket server started on :${port}`);
  });
}
