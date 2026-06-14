import {
  calcSubtotal,
  calcTotal,
  getSupplierGroups,
  type CartItem,
  useCartStore,
} from '@/lib/cart-store';

const mockProduct: Omit<CartItem, 'id'> = {
  productId: 'p1',
  variantId: 'v1',
  name: 'Алх',
  slug: 'hammer',
  image: null,
  price: 10000,
  currencyCode: 'MNT',
  qty: 1,
  mode: 'delivery',
  storeId: null,
  sku: 'HAM-1',
  supplierId: 'sup1',
  supplierName: 'Нийлүүлэгч 1',
  supplierSlug: 'sup1',
};

const mockProduct2: Omit<CartItem, 'id'> = {
  ...mockProduct,
  productId: 'p2',
  variantId: 'v2',
  name: 'Будаг',
  slug: 'paint',
  price: 5000,
};

describe('CartStore', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      promo: null,
      customerAddress: null,
      deliveryFee: 550000,
      feeBreakdown: null,
    });
  });

  test('addItem adds product to cart', () => {
    useCartStore.getState().addItem(mockProduct);
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(getSupplierGroups(state.items)).toHaveLength(1);
  });

  test('addItem uses collision-resistant row ids', () => {
    const randomUUID = jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValueOnce('00000000-0000-4000-8000-000000000001').mockReturnValueOnce('00000000-0000-4000-8000-000000000002');
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().addItem({ ...mockProduct2, variantId: 'v2' });
    const ids = useCartStore.getState().items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'v1-00000000-0000-4000-8000-000000000001',
      'v2-00000000-0000-4000-8000-000000000002',
    ]);
    randomUUID.mockRestore();
  });

  test('addItem same product increases qty', () => {
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().addItem(mockProduct);
    expect(useCartStore.getState().items[0].qty).toBe(2);
  });

  test('addItem and updateQty do not exceed stock', () => {
    useCartStore.getState().addItem({ ...mockProduct, qty: 2, stock: 3 });
    useCartStore.getState().addItem({ ...mockProduct, qty: 2, stock: 3 });
    const item = useCartStore.getState().items[0];
    expect(item.qty).toBe(2);

    useCartStore.getState().updateQty(item.id, 10);
    expect(useCartStore.getState().items[0].qty).toBe(3);
  });

  test('products from different suppliers create separate groups', () => {
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().addItem({ ...mockProduct2, supplierId: 'sup2', supplierName: 'Нийлүүлэгч 2' });
    expect(getSupplierGroups(useCartStore.getState().items)).toHaveLength(2);
  });

  test('removeItem removes product from cart', () => {
    useCartStore.getState().addItem(mockProduct);
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().removeItem(id);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  test('removeItem last product in group removes group', () => {
    useCartStore.getState().addItem(mockProduct);
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().removeItem(id);
    expect(getSupplierGroups(useCartStore.getState().items)).toHaveLength(0);
  });

  test('updateQty changes quantity correctly', () => {
    useCartStore.getState().addItem(mockProduct);
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().updateQty(id, 5);
    expect(useCartStore.getState().items[0].qty).toBe(5);
  });

  test('subtotal calculates correctly', () => {
    useCartStore.getState().addItem({ ...mockProduct, price: 10000 });
    useCartStore.getState().addItem({ ...mockProduct2, price: 5000 });
    expect(calcSubtotal(useCartStore.getState().items)).toBe(15000);
  });

  test('clearCart empties everything', () => {
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().clearCart();
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(calcSubtotal(state.items)).toBe(0);
  });

  test('calcTotal ignores client-only promo discounts', () => {
    const items = [{ ...mockProduct, id: 'row-1', price: 10000, qty: 2 }];
    expect(calcTotal(items, { code: 'DIY10', discountPct: 10, label: '10%' }, 3000)).toBe(23000);
  });
});
