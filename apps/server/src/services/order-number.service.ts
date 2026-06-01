import { DataSource, EntityManager } from 'typeorm';
import { DeliveryRequest } from '../plugins/delivery/delivery-request.entity';
import { OrderNumberCounter } from '../plugins/delivery/order-number-counter.entity';

const ORDER_COUNTER_START = 1000;

function parseSequence(orderNumber: string, year: number): number | null {
  const match = orderNumber.match(new RegExp(`^DIY-${year}-(\\d{5,})$`));
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

async function findExistingMaxSequence(manager: EntityManager, year: number): Promise<number> {
  const prefix = `DIY-${year}-%`;
  const rows = await manager
    .getRepository(DeliveryRequest)
    .createQueryBuilder('request')
    .select('request.orderNumber', 'orderNumber')
    .where('request.orderNumber LIKE :prefix', { prefix })
    .getRawMany<{ orderNumber?: string }>();

  return rows.reduce((max, row) => {
    const sequence = row.orderNumber ? parseSequence(row.orderNumber, year) : null;
    return sequence && sequence > max ? sequence : max;
  }, ORDER_COUNTER_START);
}

export async function generateOrderNumber(dataSource: DataSource, now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const supportsPessimisticLock = !['sqlite', 'better-sqlite3'].includes(String(dataSource.options.type));
  const next = await dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(OrderNumberCounter);
    let counter = await repo.findOne(
      supportsPessimisticLock
        ? { where: { year }, lock: { mode: 'pessimistic_write' } }
        : { where: { year } },
    );

    if (!counter) {
      const existingMax = await findExistingMaxSequence(manager, year);
      counter = repo.create({ year, value: existingMax });
    }

    counter.value += 1;
    await repo.save(counter);
    return counter.value;
  });

  return `DIY-${year}-${String(next).padStart(5, '0')}`;
}
