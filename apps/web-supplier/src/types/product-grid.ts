export type ProductStatus = 'new' | 'saved' | 'failed';

export type ProductRow = {
  id: string;
  imageUrl: string;
  imageFile?: File;
  uploadedAssetId?: string;
  name: string;
  price: string;
  quantity: string;
  category: string;
  unit: string;
  status: ProductStatus;
  analyzing: boolean;
  confidence?: number;
  invalidFields?: Array<'name' | 'price' | 'quantity'>;
};
