'use client';

import { use } from 'react';
import ProductForm from '../../product-form';
import { MOCK_PRODUCTS } from '@/lib/admin-data';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = MOCK_PRODUCTS.find((item) => item.id === id);
  return <ProductForm product={product} />;
}
