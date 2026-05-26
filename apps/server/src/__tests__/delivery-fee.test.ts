import { calculateDeliveryFee, haversineDistance } from '../services/delivery-fee.service';

describe('DeliveryFeeService', () => {
  describe('haversineDistance', () => {
    test('same location returns 0', () => {
      expect(haversineDistance(47.9184, 106.9257, 47.9184, 106.9257)).toBe(0);
    });

    test('Bayanzurkh to Sukhbaatar correct distance', () => {
      const dist = haversineDistance(47.9184, 106.9917, 47.9138, 106.9092);
      expect(dist).toBeGreaterThan(5);
      expect(dist).toBeLessThan(10);
    });

    test('UB to Nalaikh is ~30km', () => {
      const dist = haversineDistance(47.9184, 106.9257, 47.7573, 107.2631);
      expect(dist).toBeGreaterThan(25);
      expect(dist).toBeLessThan(35);
    });
  });

  describe('calculateDeliveryFee', () => {
    test('base fee is always included', () => {
      const result = calculateDeliveryFee([{ lat: 47.9200, lng: 106.9300 }], { lat: 47.9184, lng: 106.9257 }, 5);
      expect(result.fee).toBeGreaterThanOrEqual(300_000);
      expect(result.breakdown.baseFee).toBe(300_000);
    });

    test('longer distance increases fee', () => {
      const near = calculateDeliveryFee([{ lat: 47.9200, lng: 106.9300 }], { lat: 47.9184, lng: 106.9257 }, 5);
      const far = calculateDeliveryFee([{ lat: 47.9600, lng: 106.9700 }], { lat: 47.9184, lng: 106.9257 }, 5);
      expect(far.fee).toBeGreaterThan(near.fee);
      expect(far.breakdown.distanceFee).toBeGreaterThan(near.breakdown.distanceFee);
    });

    test('2 suppliers adds one multi-stop fee', () => {
      const result = calculateDeliveryFee(
        [
          { lat: 47.9200, lng: 106.9300 },
          { lat: 47.9300, lng: 106.9400 },
        ],
        { lat: 47.9184, lng: 106.9257 },
        5,
      );
      expect(result.breakdown.multiStopFee).toBe(100_000);
    });

    test('3 suppliers adds correct multi-stop fee', () => {
      const result = calculateDeliveryFee(
        [
          { lat: 47.9200, lng: 106.9300 },
          { lat: 47.9300, lng: 106.9400 },
          { lat: 47.9400, lng: 106.9500 },
        ],
        { lat: 47.9184, lng: 106.9257 },
        5,
      );
      expect(result.breakdown.multiStopFee).toBe(200_000);
    });

    test('heavy items over 50kg add weight fee', () => {
      const light = calculateDeliveryFee([{ lat: 47.9200, lng: 106.9300 }], { lat: 47.9184, lng: 106.9257 }, 5);
      const heavy = calculateDeliveryFee([{ lat: 47.9200, lng: 106.9300 }], { lat: 47.9184, lng: 106.9257 }, 60);
      expect(heavy.breakdown.weightFee).toBe(200_000);
      expect(heavy.fee).toBeGreaterThan(light.fee);
    });

    test('total fee rounds to nearest 500 minor unit block', () => {
      const result = calculateDeliveryFee([{ lat: 47.9500, lng: 106.9700 }], { lat: 47.9184, lng: 106.9257 }, 5);
      expect(result.fee % 50_000).toBe(0);
    });
  });
});
