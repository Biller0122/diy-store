import { Supplier, SupplierStatus } from '../plugins/supplier/supplier.entity';
import { SupplierService } from '../plugins/supplier/supplier.service';
import { createMockRepository } from './test-repo';

function createService() {
  const repo = createMockRepository<Supplier>();
  return { repo, supplierService: new SupplierService(repo as never) };
}

describe('SupplierService', () => {
  describe('registerSupplier', () => {
    test('creates supplier with PENDING_VERIFICATION status', async () => {
      const { supplierService } = createService();
      const result = await supplierService.registerSupplier({ ownerName: 'Батболд', email: 'supplier@example.com' });
      expect(result.status).toBe(SupplierStatus.PENDING_VERIFICATION);
      expect(result.email).toBe('supplier@example.com');
    });

    test('duplicate email returns error', async () => {
      const { supplierService } = createService();
      await supplierService.registerSupplier({ ownerName: 'Батболд', email: 'supplier@example.com' });
      await expect(supplierService.registerSupplier({ ownerName: 'Дорж', email: 'supplier@example.com' })).rejects.toThrow('бүртгэлтэй');
    });

    test('invalid email returns error', async () => {
      const { supplierService } = createService();
      await expect(supplierService.registerSupplier({ ownerName: 'Батболд', email: 'bad-email' })).rejects.toThrow();
    });

    test('empty name returns error', async () => {
      const { supplierService } = createService();
      await expect(supplierService.registerSupplier({ ownerName: '', email: 'supplier@example.com' })).rejects.toThrow();
    });
  });

  describe('updateSupplierStatus', () => {
    test('admin can approve supplier', async () => {
      const { supplierService } = createService();
      const supplier = await supplierService.registerSupplier({ ownerName: 'Батболд', email: 'supplier@example.com' });
      await supplierService.updateSupplierStatus(String(supplier.id), SupplierStatus.ACTIVE);
      const updated = await supplierService.getSupplierById(String(supplier.id));
      expect(updated?.status).toBe(SupplierStatus.ACTIVE);
    });

    test('admin can suspend supplier', async () => {
      const { supplierService } = createService();
      const supplier = await supplierService.registerSupplier({ ownerName: 'Батболд', email: 'supplier@example.com' });
      await supplierService.updateSupplierStatus(String(supplier.id), SupplierStatus.SUSPENDED);
      const updated = await supplierService.getSupplierById(String(supplier.id));
      expect(updated?.status).toBe(SupplierStatus.SUSPENDED);
    });
  });
});
