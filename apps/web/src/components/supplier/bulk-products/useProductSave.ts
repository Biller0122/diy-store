'use client';

import { vendureShopFetch } from '@/lib/vendure';
import type { ProductRow } from './types';

const CREATE_SUPPLIER_PRODUCT_MUTATION = `
  mutation CreateSupplierProduct($input: SupplierProductInput!) {
    createSupplierProduct(input: $input) {
      id
      name
      slug
    }
  }
`;

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toMinorUnits(value: string) {
  return Math.round(Number(value.replace(/[^\d]/g, '')) * 100);
}

function getRequiredErrors(row: ProductRow): Array<'name' | 'price' | 'quantity'> {
  const invalidFields: Array<'name' | 'price' | 'quantity'> = [];
  if (!row.name.trim()) invalidFields.push('name');
  if (toMinorUnits(row.price) <= 0) invalidFields.push('price');
  if (!row.quantity.trim() || Number(row.quantity) < 0) invalidFields.push('quantity');
  return invalidFields;
}

export function useProductSave(
  supplierId: string | undefined,
  updateRow: (id: string, patch: Partial<ProductRow>) => void,
  setProgress: (message: string) => void,
) {
  async function saveProduct(row: ProductRow): Promise<'success' | 'failed'> {
    const invalidFields = getRequiredErrors(row);
    if (!supplierId || invalidFields.length > 0) {
      updateRow(row.id, { status: 'failed', invalidFields });
      return 'failed';
    }

    try {
      await vendureShopFetch(CREATE_SUPPLIER_PRODUCT_MUTATION, {
        input: {
          supplierId,
          name: row.name.trim(),
          slug: `${toSlug(row.name)}-${Date.now()}`,
          image: row.image,
          price: toMinorUnits(row.price),
          stock: Number(row.quantity) || 0,
          category: row.category.trim(),
          description: row.unit.trim(),
          enabled: true,
        },
      });
      updateRow(row.id, { status: 'saved', invalidFields: [] });
      return 'success';
    } catch (error) {
      console.error('[BulkProductGrid] Бараа хадгалахад алдаа гарлаа', error);
      updateRow(row.id, { status: 'failed' });
      return 'failed';
    }
  }

  async function saveBulk(rows: ProductRow[]): Promise<{ success: number; failed: number }> {
    let completed = 0;
    let success = 0;
    let failed = 0;

    await Promise.all(rows.map(async (row) => {
      const result = await saveProduct(row);
      completed += 1;
      if (result === 'success') success += 1;
      else failed += 1;
      setProgress(`${completed}/${rows.length} хадгалж байна...`);
    }));

    setProgress('');
    return { success, failed };
  }

  return { saveProduct, saveBulk };
}
