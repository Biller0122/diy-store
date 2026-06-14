import 'dotenv/config';
import { bootstrap, JobQueueService, runMigrations } from '@vendure/core';
import { DataSource } from 'typeorm';
import { config } from './vendure-config';
import { handleDriverOfferDecision, startRealtimeServer } from './plugins/realtime.plugin';
import { DeliveryRequest } from './plugins/delivery/delivery-request.entity';
import { ensureRuntimeSchema } from './runtime-schema';

function registerRealtimeDecisionWebhook(app: Awaited<ReturnType<typeof bootstrap>>) {
  const httpAdapter = app.getHttpAdapter() as any;
  const httpInstance = httpAdapter.getInstance?.() ?? httpAdapter;
  const handler = (req: any, res: any) => {
    const secret = process.env.REALTIME_WEBHOOK_SECRET;
    if (secret && req.headers?.['x-realtime-secret'] !== secret) {
      res.status(401).json({ ok: false });
      return;
    }

    const { type, driverId, orderId } = req.body ?? {};
    if ((type !== 'accept' && type !== 'reject') || typeof driverId !== 'string' || typeof orderId !== 'string') {
      res.status(400).json({ ok: false });
      return;
    }

    const ok = handleDriverOfferDecision(type, { driverId, orderId });
    res.status(ok ? 200 : 404).json({ ok });
  };

  httpInstance.post('/realtime/driver-decision', handler);
}

bootstrap(config)
  .then(async (app) => {
    const dataSource = app.get(DataSource);
    await ensureRuntimeSchema(dataSource);
    await app.get(JobQueueService).start();
    registerRealtimeDecisionWebhook(app);
    if (process.env.REALTIME_EMBEDDED !== 'false') {
      startRealtimeServer({
        canJoinOrder: async (principal, orderId, trackingToken) => {
          if (principal?.role === 'ADMIN') return true;
          const delivery = await dataSource.getRepository(DeliveryRequest).findOne({
            where: [{ orderId }, { orderNumber: orderId }, { id: orderId as any }],
          });
          if (!delivery) return false;
          if (trackingToken && delivery.trackingToken && trackingToken === delivery.trackingToken) return true;
          if (principal?.role === 'CUSTOMER') return principal.id === String(delivery.customerId);
          if (principal?.role === 'DRIVER') return Boolean(delivery.driverId && principal.id === String(delivery.driverId));
          if (principal?.role === 'SUPPLIER') {
            return Boolean(
              delivery.orderItems?.some((item) => String(item.supplierId) === principal.id) ||
              delivery.pickupStops?.some((stop) => String(stop.supplierId) === principal.id),
            );
          }
          return false;
        },
      });
    }
    console.log('✅ Vendure server started');
    console.log(`   Shop API:  http://localhost:${process.env.PORT || 3001}/shop-api`);
    console.log(`   Admin API: http://localhost:${process.env.PORT || 3001}/admin-api`);
    if (process.env.REALTIME_EMBEDDED !== 'false') {
      console.log(`   Socket:    http://localhost:${process.env.SOCKET_PORT || 3002}`);
    }
  })
  .catch((err) => {
    console.error('❌ Failed to start Vendure server', err);
    process.exit(1);
  });
