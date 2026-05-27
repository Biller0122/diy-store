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
  fee: number;
  pickupStops: Array<{ supplierId: string; name: string; district: string }>;
  dropoff: { district: string; khoroo?: string };
};

let realtimeServerStarted = false;

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

  io.on('connection', (socket) => {
    socket.on('order:join', (orderId: string) => {
      if (orderId) socket.join(`order:${orderId}`);
    });

    socket.on('driver:join', (driverId: string) => {
      if (driverId) socket.join(`driver:${driverId}`);
    });

    socket.on('driver:location', (payload: DriverLocationPayload) => {
      console.log('[realtime] driver:location', payload);
      if (payload.orderId) {
        io.to(`order:${payload.orderId}`).emit('driver:location', payload);
      }
      io.to(`driver:${payload.driverId}`).emit('driver:location', payload);
    });

    socket.on('order:status', (payload: OrderStatusPayload) => {
      console.log('[realtime] order:status', payload);
      io.to(`order:${payload.orderId}`).emit('order:status', payload);
    });

    socket.on('delivery:request', (payload: DeliveryRequestPayload) => {
      console.log('[realtime] delivery:request', payload);
      io.to(`driver:${payload.driverId}`).emit('delivery:request', payload);
    });

    socket.on('driver:online', (driverId: string) => {
      console.log('[realtime] driver online', driverId);
      io.emit('driver:online', { driverId, isOnline: true });
    });

    socket.on('driver:offline', (driverId: string) => {
      console.log('[realtime] driver offline', driverId);
      io.emit('driver:offline', { driverId, isOnline: false });
    });
  });

  httpServer.listen(port, () => {
    console.log(`✅ Realtime socket server started on :${port}`);
  });
}
