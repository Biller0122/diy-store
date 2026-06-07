import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  EventBus,
  PluginCommonModule,
  ProductEvent,
  ProductVariantEvent,
  VendurePlugin,
} from '@vendure/core';
import gql from 'graphql-tag';
import { EmbeddingService } from './embedding.service';
import { SearchResolver } from './search.resolver';

type VariantLike = {
  id?: string | number;
  productId?: string | number;
  product?: {
    id?: string | number;
  };
};

@Injectable()
class SearchEventListener implements OnApplicationBootstrap {
  constructor(
    private readonly eventBus: EventBus,
    private readonly embeddingService: EmbeddingService,
  ) {}

  onApplicationBootstrap(): void {
    if (!process.env.VOYAGE_API_KEY) {
      console.warn('[Embedding] VOYAGE_API_KEY is not configured; product saves will continue without embeddings');
    }

    this.eventBus.ofType(ProductEvent).subscribe((event) => {
      if (event.type !== 'created' && event.type !== 'updated') return;

      this.embeddingService
        .indexProductById(String(event.product.id))
        .catch((error) => console.error(`[Embedding] ProductEvent failed for ${event.product.id}`, error));
    });

    this.eventBus.ofType(ProductVariantEvent).subscribe((event) => {
      if (event.type !== 'created' && event.type !== 'updated') return;

      void this.handleProductVariantEvent(event.variants as VariantLike[]);
    });
  }

  private async handleProductVariantEvent(variants: VariantLike[]): Promise<void> {
    const productIds = new Set<string>();
    const variantIds = new Set<string>();
    for (const variant of variants) {
      const productId = variant.productId ?? variant.product?.id;
      if (productId != null) productIds.add(String(productId));
      if (productId == null && variant.id != null) variantIds.add(String(variant.id));
    }

    for (const productId of productIds) {
      try {
        await this.embeddingService.indexProductById(productId);
      } catch (error) {
        console.error(`[Embedding] ProductVariantEvent failed for product ${productId}`, error);
      }
    }

    for (const variantId of variantIds) {
      try {
        await this.embeddingService.indexProductByVariantId(variantId);
      } catch (error) {
        console.error(`[Embedding] ProductVariantEvent failed for variant ${variantId}`, error);
      }
    }
  }
}

const SEARCH_SCHEMA_EXTENSION = gql`
  type SemanticSearchItem {
    id: ID!
    variantId: ID
    name: String!
    slug: String!
    description: String!
    category: String
    image: String
    price: Int!
    supplierId: String
    source: String!
    score: Float!
  }

  type SemanticSearchResult {
    items: [SemanticSearchItem!]!
    total: Int!
  }

  extend type Query {
    semanticSearch(query: String!, take: Int): SemanticSearchResult!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [EmbeddingService, SearchEventListener, SearchResolver],
  shopApiExtensions: {
    schema: SEARCH_SCHEMA_EXTENSION,
    resolvers: [SearchResolver],
  },
})
export class SearchPlugin {}
