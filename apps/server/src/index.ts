import 'dotenv/config';
import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';
import { handleDriverOfferDecision, startRealtimeServer } from './plugins/realtime.plugin';

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
  .then((app) => {
    registerRealtimeDecisionWebhook(app);
    if (process.env.REALTIME_EMBEDDED !== 'false') {
      startRealtimeServer();
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
