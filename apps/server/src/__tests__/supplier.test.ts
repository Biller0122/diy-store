import { Supplier, SupplierStatus } from '../plugins/supplier/supplier.entity';
import { SupplierProduct } from '../plugins/supplier/supplier-product.entity';
import { SupplierService } from '../plugins/supplier/supplier.service';
import { createMockRepository } from './test-repo';
import { verifyToken } from '../utils/auth';

function createService() {
  const repo = createMockRepository<Supplier>();
  const productRepo = createMockRepository<SupplierProduct>();
  return { repo, productRepo, supplierService: new SupplierService(repo as never, productRepo as never) };
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

  describe('supplier products', () => {
    test('creates product for supplier', async () => {
      const { supplierService } = createService();
      const supplier = await supplierService.registerSupplier({ ownerName: 'Батболд', email: 'supplier@example.com' });
      const product = await supplierService.createSupplierProduct({
        supplierId: String(supplier.id),
        name: 'Цахилгаан дрилл',
        price: 120000,
        stock: 7,
        image: 'data:image/png;base64,test',
      });

      expect(product.name).toBe('Цахилгаан дрилл');
      expect(product.stock).toBe(7);
      expect(product.supplierId).toBe(String(supplier.id));
    });

    test('lists products from same database repository', async () => {
      const { supplierService } = createService();
      const supplier = await supplierService.registerSupplier({ ownerName: 'Батболд', email: 'supplier@example.com' });
      await supplierService.createSupplierProduct({
        supplierId: String(supplier.id),
        name: 'Будгийн сойз',
        price: 15000,
        stock: 3,
      });

      const result = await supplierService.getSupplierProducts(String(supplier.id));
      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe('Будгийн сойз');
    });
  });

  describe('supplier auth token', () => {
    test('wrong OTP persists attempts and caps after five tries', async () => {
      const originalOtpMockMode = process.env.OTP_MOCK_MODE;
      process.env.OTP_MOCK_MODE = 'true';
      const { supplierService } = createService();
      try {
        await supplierService.registerSupplier({ ownerName: 'Батболд', email: 'supplier@example.com' });

        await expect(supplierService.verifyOTP({ email: 'supplier@example.com', otp: '0000' })).rejects.toThrow('Код буруу');
        let supplier = await supplierService.getSupplierByEmail('supplier@example.com');
        expect(supplier?.otpAttempts).toBe(1);

        for (let i = 0; i < 4; i++) {
          await expect(supplierService.verifyOTP({ email: 'supplier@example.com', otp: '0000' })).rejects.toThrow('Код буруу');
        }

        supplier = await supplierService.getSupplierByEmail('supplier@example.com');
        expect(supplier?.otpAttempts).toBe(5);
        await expect(supplierService.verifyOTP({ email: 'supplier@example.com', otp: '1234' })).rejects.toThrow('Олон удаа буруу');
      } finally {
        if (originalOtpMockMode === undefined) delete process.env.OTP_MOCK_MODE;
        else process.env.OTP_MOCK_MODE = originalOtpMockMode;
      }
    });

    test('expired OTP is rejected before attempts are counted', async () => {
      const originalOtpMockMode = process.env.OTP_MOCK_MODE;
      process.env.OTP_MOCK_MODE = 'true';
      const { supplierService } = createService();
      try {
        const supplier = await supplierService.registerSupplier({ ownerName: 'Батболд', email: 'supplier@example.com' });
        supplier.otpExpiresAt = new Date(Date.now() - 1000);

        await expect(supplierService.verifyOTP({ email: 'supplier@example.com', otp: '0000' })).rejects.toThrow('Кодын хугацаа');
        expect(supplier.otpAttempts).toBe(0);
      } finally {
        if (originalOtpMockMode === undefined) delete process.env.OTP_MOCK_MODE;
        else process.env.OTP_MOCK_MODE = originalOtpMockMode;
      }
    });

    test('verified OTP returns signed supplier role token', async () => {
      const originalOtpMockMode = process.env.OTP_MOCK_MODE;
      process.env.OTP_MOCK_MODE = 'true';
      const { supplierService } = createService();
      try {
        await supplierService.registerSupplier({ ownerName: 'Батболд', email: 'supplier@example.com' });

        const result = await supplierService.verifyOTP({ email: 'supplier@example.com', otp: '1234' });
        const decoded = verifyToken(result.token);

        expect(decoded.role).toBe('SUPPLIER');
        expect(decoded.id).toBe(String(result.supplier.id));
      } finally {
        if (originalOtpMockMode === undefined) delete process.env.OTP_MOCK_MODE;
        else process.env.OTP_MOCK_MODE = originalOtpMockMode;
      }
    });
  });
});
