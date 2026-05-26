/**
 * Bulk sync all products to Algolia.
 * Run: npm run sync-algolia
 */
import 'dotenv/config';
import { algoliasearch } from 'algoliasearch';

const VENDURE_API = process.env.VENDURE_SHOP_API ?? 'http://localhost:3001/shop-api';
const INDEX_NAME  = process.env.ALGOLIA_INDEX_NAME ?? 'diy_products';

async function vendureFetch<T>(query: string, variables?: object): Promise<T> {
  const res = await fetch(VENDURE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as { errors?: unknown; data: T };
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const ALL_PRODUCTS_QUERY = `
  query AllProducts($skip: Int!) {
    products(options: { take: 100, skip: $skip }) {
      totalItems
      items {
        id name slug description
        featuredAsset { preview }
        variants {
          id price priceWithTax stockLevel
          options { name }
        }
        collections { id name slug }
        facetValues { id name facet { name } }
        customFields
      }
    }
  }
`;

async function getAllProducts() {
  const all: any[] = [];
  let skip = 0;

  while (true) {
    const data = await vendureFetch<{ products: { totalItems: number; items: any[] } }>(
      ALL_PRODUCTS_QUERY,
      { skip },
    );

    const items = data.products.items;
    all.push(...items);

    const pct = Math.round((all.length / data.products.totalItems) * 100);
    process.stdout.write(`\r[Algolia Sync] Fetched ${all.length}/${data.products.totalItems} products (${pct}%)`);

    if (all.length >= data.products.totalItems) break;
    skip += 100;
  }

  process.stdout.write('\n');
  return all;
}

function toRecord(product: any) {
  const variant    = product.variants?.[0];
  const collection = product.collections?.[0];

  return {
    objectID:            product.id.toString(),
    name:                product.name,
    slug:                product.slug,
    description:         product.description ?? '',
    price:               variant?.priceWithTax ?? variant?.price ?? 0,
    salePrice:           null,
    brand:               product.customFields?.brand ?? '',
    category:            collection?.name ?? '',
    categorySlug:        collection?.slug ?? '',
    rating:              product.customFields?.rating ?? 0,
    reviewCount:         product.customFields?.reviewCount ?? 0,
    inStock:             variant?.stockLevel !== 'OUT_OF_STOCK',
    isPickupAvailable:   true,
    isDeliveryAvailable: true,
    imageUrl:            product.featuredAsset?.preview ?? '',
    tags:                (product.facetValues ?? []).map((fv: any) => fv.name),
  };
}

async function main() {
  if (!process.env.ALGOLIA_APP_ID) {
    console.log('[Algolia] Mock mode — ALGOLIA_APP_ID not set, skipping sync');
    return;
  }

  console.log(`[Algolia Sync] Starting sync to index "${INDEX_NAME}"`);
  console.log(`[Algolia Sync] Vendure API: ${VENDURE_API}`);

  const client = algoliasearch(process.env.ALGOLIA_APP_ID!, process.env.ALGOLIA_ADMIN_KEY!);

  // Configure index settings
  await client.setSettings({
    indexName: INDEX_NAME,
    indexSettings: {
      searchableAttributes: ['name', 'brand', 'category', 'tags', 'description'],
      attributesForFaceting: ['brand', 'category', 'filterOnly(inStock)', 'filterOnly(isPickupAvailable)', 'price'],
      customRanking: ['desc(rating)', 'desc(reviewCount)'],
      typoTolerance: 'true' as any,
    },
  });

  console.log('[Algolia Sync] Index settings configured');

  const products = await getAllProducts();
  const records  = products.map(toRecord);

  // Upload in batches of 250
  const BATCH = 250;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await client.saveObjects({ indexName: INDEX_NAME, objects: batch });
    const pct = Math.round(Math.min((i + BATCH) / records.length, 1) * 100);
    process.stdout.write(`\r[Algolia Sync] Uploaded ${Math.min(i + BATCH, records.length)}/${records.length} records (${pct}%)`);
  }

  process.stdout.write('\n');
  console.log(`[Algolia Sync] ✓ Done — ${records.length} products synced to "${INDEX_NAME}"`);
}

main().catch((err) => {
  console.error('[Algolia Sync] Error:', err);
  process.exit(1);
});
