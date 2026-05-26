import { calculateCommission, canTransition, splitOrderBySupplier } from '../utils/order';

describe('OrderService', () => {
  describe('splitOrderBySupplier', () => {
    test('single supplier creates 1 sub-order', () => {
      const subOrders = splitOrderBySupplier({
        items: [
          { productId: '1', supplierId: 'sup1', qty: 2, price: 5000 },
          { productId: '2', supplierId: 'sup1', qty: 1, price: 3000 },
        ],
      });
      expect(subOrders).toHaveLength(1);
      expect(subOrders[0].supplierId).toBe('sup1');
      expect(subOrders[0].items).toHaveLength(2);
    });

    test('2 suppliers creates 2 sub-orders', () => {
      const subOrders = splitOrderBySupplier({
        items: [
          { productId: '1', supplierId: 'sup1', qty: 1, price: 5000 },
          { productId: '2', supplierId: 'sup2', qty: 1, price: 3000 },
        ],
      });
      expect(subOrders).toHaveLength(2);
    });

    test('sub-order total calculates correctly', () => {
      const subOrders = splitOrderBySupplier({
        items: [
          { productId: '1', supplierId: 'sup1', qty: 2, price: 5000 },
          { productId: '2', supplierId: 'sup1', qty: 3, price: 2000 },
        ],
      });
      expect(subOrders[0].subtotal).toBe(16000);
    });
  });

  describe('calculateCommission', () => {
    test('10% commission calculated correctly', () => {
      const result = calculateCommission(100000);
      expect(result.commission).toBe(10000);
      expect(result.supplierPayout).toBe(90000);
    });

    test('commission rounds correctly', () => {
      const result = calculateCommission(99999);
      expect(result.commission + result.supplierPayout).toBe(99999);
    });
  });

  describe('orderStatusTransitions', () => {
    test('PENDING can move to PAYMENT_CONFIRMED', () => expect(canTransition('PENDING', 'PAYMENT_CONFIRMED')).toBe(true));
    test('PENDING cannot skip to DELIVERED', () => expect(canTransition('PENDING', 'DELIVERED')).toBe(false));
    test('DELIVERED cannot go back to PENDING', () => expect(canTransition('DELIVERED', 'PENDING')).toBe(false));
    test('CANCELLED is terminal state', () => {
      expect(canTransition('CANCELLED', 'PENDING')).toBe(false);
      expect(canTransition('CANCELLED', 'DELIVERED')).toBe(false);
    });
  });
});
