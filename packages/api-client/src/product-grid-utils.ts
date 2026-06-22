export type ProductImageAnalysis = {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  confidence?: number;
};

export type AnalyzeProductImageOptions = {
  endpoint: string;
  category?: string;
  mode?: 'multipart' | 'json';
};

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export function makeProductSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeProductPrice(value: string) {
  return Number(value.replace(/[^\d]/g, ''));
}

export function onlyProductDigits(value: string) {
  return value.replace(/[^\d]/g, '');
}

export function isSupportedProductImage(file: File) {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

export function csvFieldValue(record: Record<string, unknown>, keys: string[]) {
  const normalized = keys.map((key) => key.trim().toLowerCase());
  for (const [key, value] of Object.entries(record)) {
    if (normalized.includes(key.trim().toLowerCase())) return value == null ? '' : String(value);
  }
  return '';
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Зураг уншихад алдаа гарлаа'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

export async function fileToBase64Payload(file: File): Promise<{ data: string; mediaType: string }> {
  const dataUrl = await fileToDataUrl(file);
  const [prefix, data] = dataUrl.split(',');
  const mediaType = prefix.match(/data:([^;]+)/)?.[1] ?? file.type ?? 'image/jpeg';
  return { data, mediaType };
}

export async function analyzeProductImage(file: File, options: AnalyzeProductImageOptions): Promise<ProductImageAnalysis> {
  const mode = options.mode ?? 'multipart';
  const init = mode === 'json'
    ? await buildJsonAnalyzeRequest(file, options.category)
    : buildMultipartAnalyzeRequest(file, options.category);
  const response = await fetch(options.endpoint, init);
  if (!response.ok) throw new Error(`AI шинжилгээний алдаа: ${response.status}`);
  return response.json() as Promise<ProductImageAnalysis>;
}

function buildMultipartAnalyzeRequest(file: File, category?: string): RequestInit {
  const formData = new FormData();
  formData.append('image', file);
  if (category) formData.append('category', category);
  return { method: 'POST', body: formData };
}

async function buildJsonAnalyzeRequest(file: File, category?: string): Promise<RequestInit> {
  const { data, mediaType } = await fileToBase64Payload(file);
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: data, mediaType, ...(category ? { category } : {}) }),
  };
}
