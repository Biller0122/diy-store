import 'dotenv/config';
import { DataSource } from 'typeorm';
import { config } from './vendure-config';
import { DeliveryRequest } from './plugins/delivery/delivery-request.entity';
import { startRealtimeServer } from './plugins/realtime.plugin';

async function main() {
  const dataSource = new DataSource({
    ...(config.dbConnectionOptions as any),
    synchronize: false,
    entities: [DeliveryRequest],
  });
  await dataSource.initialize();

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

main().catch((err) => {
  console.error('Failed to start realtime server', err);
  process.exit(1);
});
