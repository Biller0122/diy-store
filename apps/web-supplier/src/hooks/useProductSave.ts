import type { ProductRow } from '../types/product-grid';

const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
    }
  }
`;

type SaveStateUpdater = (id: string, patch: Partial<ProductRow>) => void;
type ProgressUpdater = (message: string) => void;

function toMinorUnits(value: string): number {
  return Math.round(Number(value.replace(/[^\d.]/g, '')) * 100);
}

function getRequiredErrors(row: ProductRow): Array<'name' | 'price' | 'quantity'> {
  const invalidFields: Array<'name' | 'price' | 'quantity'> = [];
  if (!row.name.trim()) invalidFields.push('name');
  if (!row.price.trim() || Number(row.price) <= 0) invalidFields.push('price');
  if (!row.quantity.trim() || Number(row.quantity) < 0) invalidFields.push('quantity');
  return invalidFields;
}

export function useProductSave(
  updateRow: SaveStateUpdater,
  setProgress: ProgressUpdater,
) {
  async function saveProduct(row: ProductRow): Promise<'success' | 'failed'> {
    const invalidFields = getRequiredErrors(row);
    if (invalidFields.length > 0) {
      updateRow(row.id, { status: 'failed', invalidFields });
      return 'failed';
    }

    try {
      const response = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: CREATE_PRODUCT_MUTATION,
          variables: {
            input: {
              translations: [{
                languageCode: 'mn',
                name: row.name.trim(),
                slug: `${row.name.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                description: `${row.category} ${row.unit}`.trim(),
              }],
              enabled: true,
              facetValueIds: [],
              featuredAssetId: row.uploadedAssetId,
            },
          },
        }),
      });

      if (!response.ok) throw new Error(`Vendure GraphQL алдаа: ${response.status}`);

      const json = await response.json() as { errors?: Array<{ message: string }> };
      if (json.errors?.length) throw new Error(json.errors[0].message);

      updateRow(row.id, { status: 'saved', invalidFields: [] });
      return 'success';
    } catch (error) {
      console.error('[ProductGrid] Бараа хадгалахад алдаа гарлаа', error);
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
      if (result === 'failed') failed += 1;
      setProgress(`${completed}/${rows.length} хадгалж байна...`);
    }));

    setProgress('');
    return { success, failed };
  }

  return { saveProduct, saveBulk };
}
