import { PluginCommonModule, Product, VendurePlugin } from '@vendure/core';
import { EventBus } from '@vendure/core';
import { ProductEvent } from '@vendure/core';
import { OnApplicationBootstrap, Inject } from '@nestjs/common';
import { algoliasearch, type Algoliasearch } from 'algoliasearch';

// ─── Mock mode ────────────────────────────────────────────────

function isMockMode(): boolean {
  return !process.env.ALGOLIA_APP_ID || process.env.ALGOLIA_MOCK_MODE === 'true';
}

// ─── Index schema ─────────────────────────────────────────────

export interface AlgoliaProductRecord {
  objectID: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  brand: string;
  category: string;
  categorySlug: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  isPickupAvailable: boolean;
  isDeliveryAvailable: boolean;
  imageUrl: string;
  tags: string[];
}

// ─── Algolia service ──────────────────────────────────────────

export class AlgoliaService implements OnApplicationBootstrap {
  private client: Algoliasearch | null = null;
  private indexName = process.env.ALGOLIA_INDEX_NAME ?? 'diy_products';

  constructor(private eventBus: EventBus) {}

  onApplicationBootstrap() {
    if (isMockMode()) {
      console.log('[Algolia] Mock mode — skipping sync (set ALGOLIA_APP_ID + ALGOLIA_ADMIN_KEY to enable)');
      return;
    }

    this.client = algoliasearch(
      process.env.ALGOLIA_APP_ID!,
      process.env.ALGOLIA_ADMIN_KEY!,
    );

    this.configureIndex();
    this.subscribeToEvents();
  }

  private async configureIndex() {
    if (!this.client) return;

    await this.client.setSettings({
      indexName: this.indexName,
      indexSettings: {
        searchableAttributes: ['name', 'brand', 'category', 'tags', 'description'],
        attributesForFaceting: ['brand', 'category', 'filterOnly(inStock)', 'filterOnly(isPickupAvailable)', 'price'],
        customRanking: ['desc(rating)', 'desc(reviewCount)'],
        typoTolerance: 'true' as any,
        minWordSizefor1Typo: 4,
        minWordSizefor2Typos: 8,
      },
    });

    console.log(`[Algolia] Index "${this.indexName}" configured`);
  }

  private subscribeToEvents() {
    this.eventBus.ofType(ProductEvent).subscribe(async (event) => {
      if (event.type === 'deleted') {
        await this.deleteProduct(event.product.id.toString());
      } else {
        await this.upsertProduct(event.product);
      }
    });
  }

  async upsertProduct(product: Product & { variants?: any[]; collections?: any[] }) {
    if (!this.client) return;
    const record = this.toRecord(product);
    await this.client.saveObject({ indexName: this.indexName, body: record });
    console.log(`[Algolia] Upserted product: ${product.name}`);
  }

  async deleteProduct(productId: string) {
    if (!this.client) return;
    await this.client.deleteObject({ indexName: this.indexName, objectID: productId });
    console.log(`[Algolia] Deleted product: ${productId}`);
  }

  async bulkUpsert(products: (Product & { variants?: any[]; collections?: any[] })[]) {
    if (!this.client) {
      console.log('[Algolia] Mock mode — skipping bulk sync');
      return;
    }
    const records = products.map((p) => this.toRecord(p));
    await this.client.saveObjects({ indexName: this.indexName, objects: records as unknown as Record<string, unknown>[] });
    console.log(`[Algolia] Bulk upserted ${records.length} products`);
  }

  private toRecord(product: Product & { variants?: any[]; collections?: any[] }): AlgoliaProductRecord {
    const variant     = product.variants?.[0];
    const collection  = product.collections?.[0];
    const imageAsset  = (product as any).featuredAsset;

    return {
      objectID:            product.id.toString(),
      name:                product.name,
      slug:                product.slug,
      description:         product.description ?? '',
      price:               variant?.priceWithTax ?? variant?.price ?? 0,
      salePrice:           null,
      brand:               (product as any).customFields?.brand ?? '',
      category:            collection?.name ?? '',
      categorySlug:        collection?.slug ?? '',
      rating:              (product as any).customFields?.rating ?? 0,
      reviewCount:         (product as any).customFields?.reviewCount ?? 0,
      inStock:             variant?.stockLevel !== 'OUT_OF_STOCK',
      isPickupAvailable:   true,
      isDeliveryAvailable: true,
      imageUrl:            imageAsset?.preview ?? '',
      tags:                ((product as any).facetValues ?? []).map((fv: any) => fv.name),
    };
  }
}

// ─── Vendure plugin ───────────────────────────────────────────

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [AlgoliaService],
})
export class AlgoliaPlugin {}
