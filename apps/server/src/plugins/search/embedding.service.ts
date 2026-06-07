import { Injectable } from '@nestjs/common';
import { TransactionalConnection } from '@vendure/core';

type VoyageEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
    index?: number;
  }>;
};

type ClaudeMessageResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

type ProductForEmbedding = {
  id: string;
  name: string;
  description: string;
  category: string;
  brand?: string;
};

type ProductRow = {
  id: string | number;
  name: string | null;
  description: string | null;
  category: string | null;
  brand: string | null;
};

export type SemanticSearchItem = {
  id: string;
  variantId: string | null;
  name: string;
  slug: string;
  description: string;
  category: string | null;
  image: string | null;
  price: number;
  supplierId: string | null;
  source: 'catalog' | 'supplier';
  score: number;
};

@Injectable()
export class EmbeddingService {
  constructor(private readonly connection: TransactionalConnection) {}

  async createEmbedding(text: string, inputType: 'document' | 'query' = 'document'): Promise<number[]> {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
      throw new Error('VOYAGE_API_KEY is not configured');
    }

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [text],
        model: process.env.EMBEDDING_MODEL || 'voyage-3.5',
        input_type: inputType,
        output_dimension: Number(process.env.EMBEDDING_DIMENSIONS || 1024),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Voyage embeddings failed with HTTP ${response.status}: ${body.slice(0, 300)}`);
    }

    const data = (await response.json()) as VoyageEmbeddingResponse;
    const embedding = data.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Voyage response did not include an embedding array');
    }

    return embedding;
  }

  async indexProduct(product: ProductForEmbedding): Promise<void> {
    try {
      const text = this.productText(product);
      const embedding = await this.createEmbedding(text, 'document');

      await this.connection.rawConnection.query(
        'UPDATE product_translation SET embedding = $1::vector WHERE "baseId" = $2',
        [this.toVectorLiteral(embedding), product.id],
      );
    } catch (error) {
      console.error(`[Embedding] Failed to index product ${product.id}`, error);
    }
  }

  async indexSupplierProductById(productId: string): Promise<void> {
    try {
      const rows = await this.connection.rawConnection.query(
        `
          SELECT
            id,
            name,
            description,
            category,
            '' AS brand
          FROM supplier_product
          WHERE id = $1
          LIMIT 1
        `,
        [productId],
      ) as ProductRow[];

      const product = rows[0] ? this.toProductForEmbedding(rows[0]) : null;
      if (!product) return;

      const embedding = await this.createEmbedding(this.productText(product), 'document');
      await this.connection.rawConnection.query(
        'UPDATE supplier_product SET embedding = $1::vector WHERE id = $2',
        [this.toVectorLiteral(embedding), product.id],
      );
    } catch (error) {
      console.error(`[Embedding] Failed to index supplier product ${productId}`, error);
    }
  }

  async indexProductById(productId: string): Promise<void> {
    try {
      const product = await this.findProductForEmbedding(productId);
      if (!product) {
        console.warn(`[Embedding] Product ${productId} not found; skipping`);
        return;
      }
      await this.indexProduct(product);
    } catch (error) {
      console.error(`[Embedding] Failed to load product ${productId}`, error);
    }
  }

  async indexProductByVariantId(variantId: string): Promise<void> {
    try {
      const rows = await this.connection.rawConnection.query(
        'SELECT "productId" AS "productId" FROM product_variant WHERE id = $1 LIMIT 1',
        [variantId],
      ) as Array<{ productId: string | number | null }>;

      const productId = rows[0]?.productId;
      if (productId == null) {
        console.warn(`[Embedding] Product variant ${variantId} has no productId; skipping`);
        return;
      }

      await this.indexProductById(String(productId));
    } catch (error) {
      console.error(`[Embedding] Failed to load product variant ${variantId}`, error);
    }
  }

  async indexAllProducts(): Promise<{ success: number; failed: number }> {
    const batchSize = 50;
    let success = 0;
    let failed = 0;

    while (true) {
      const rows = await this.findUnindexedProducts(batchSize);
      if (rows.length === 0) break;

      for (const product of rows) {
        await this.indexProduct(product);
        if (await this.hasProductEmbedding(product.id)) {
          success += 1;
        } else {
          failed += 1;
        }
      }

      console.log(`[Embedding] Indexed catalog products: success=${success} failed=${failed}`);
    }

    while (true) {
      const rows = await this.findUnindexedSupplierProducts(batchSize);
      if (rows.length === 0) break;

      for (const product of rows) {
        await this.indexSupplierProductById(product.id);
        if (await this.hasSupplierProductEmbedding(product.id)) {
          success += 1;
        } else {
          failed += 1;
        }
      }

      console.log(`[Embedding] Indexed all products: success=${success} failed=${failed}`);
    }

    return { success, failed };
  }

  async semanticSearch(query: string, take = 20): Promise<{ items: SemanticSearchItem[]; total: number }> {
    const trimmed = query.trim();
    if (!trimmed) return { items: [], total: 0 };

    const limit = Math.max(1, Math.min(take, 50));
    const intents = await this.parseSearchIntents(trimmed);
    if (intents.length > 1) {
      const perIntentTake = Math.max(3, Math.ceil(limit / intents.length));
      const groups = await Promise.all(intents.map((intent) => this.searchSingleIntent(intent, perIntentTake)));
      const seen = new Set<string>();
      const items = groups
        .flat()
        .sort((a, b) => b.score - a.score)
        .filter((item) => {
          const key = `${item.source}:${item.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, limit);

      return { items, total: items.length };
    }

    const items = await this.searchSingleIntent(trimmed, limit);
    return { items, total: items.length };
  }

  private async parseSearchIntents(query: string): Promise<string[]> {
    const fallback = this.splitSimpleIntents(query);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || query.length < 8 || fallback.length > 1) return fallback;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.CLAUDE_QUERY_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 160,
          system: 'You split Mongolian DIY store search queries into separate product search intents. Return only compact JSON.',
          messages: [{
            role: 'user',
            content: `Query: "${query}"\nReturn JSON exactly like {"intents":["цагаан будаг","обой"]}. Keep 1 to 5 short intents.`,
          }],
        }),
      });

      if (!response.ok) return fallback;

      const data = (await response.json()) as ClaudeMessageResponse;
      const text = data.content?.find((part) => part.type === 'text' && part.text)?.text ?? '';
      const parsed = JSON.parse(text) as { intents?: unknown };
      if (!Array.isArray(parsed.intents)) return fallback;

      const intents = parsed.intents
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0)
        .slice(0, 5);

      return intents.length > 0 ? intents : fallback;
    } catch {
      return fallback;
    }
  }

  private splitSimpleIntents(query: string): string[] {
    const parts = query
      .split(/[,;]|(?:\s+болон\s+)|(?:\s+ба\s+)/i)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 5);

    return parts.length > 0 ? parts : [query];
  }

  private async searchSingleIntent(query: string, take: number): Promise<SemanticSearchItem[]> {
    const queryEmbedding = await this.createEmbedding(query, 'query');
    const vector = this.toVectorLiteral(queryEmbedding);
    const minScore = Number(process.env.SEMANTIC_SEARCH_MIN_SCORE || 0.45);

    const rows = await this.connection.rawConnection.query(
      `
        WITH catalog_results AS (
          SELECT
            p.id::text AS id,
            pv.id::text AS "variantId",
            pt.name AS name,
            pt.slug AS slug,
            COALESCE(pt.description, '') AS description,
            COALESCE(ct.name, '') AS category,
            a.preview AS image,
            COALESCE(pvp.price, 0) AS price,
            NULL::text AS "supplierId",
            'catalog' AS source,
            1 - (pt.embedding <=> $1::vector) AS score
          FROM product_translation pt
          JOIN product p ON p.id = pt."baseId"
          LEFT JOIN product_variant pv ON pv."productId" = p.id
          LEFT JOIN product_variant_price pvp ON pvp."variantId" = pv.id
          LEFT JOIN asset a ON a.id = p."featuredAssetId"
          LEFT JOIN collection_product_variants_product_variant cpv ON cpv."productVariantId" = pv.id
          LEFT JOIN collection_translation ct ON ct."baseId" = cpv."collectionId"
          WHERE pt.embedding IS NOT NULL
          ORDER BY pt.embedding <=> $1::vector
          LIMIT $2
        ),
        supplier_results AS (
          SELECT
            sp.id::text AS id,
            sp.id::text AS "variantId",
            sp.name AS name,
            sp.slug AS slug,
            COALESCE(sp.description, '') AS description,
            COALESCE(sp.category, '') AS category,
            sp.image AS image,
            sp.price AS price,
            sp."supplierId" AS "supplierId",
            'supplier' AS source,
            1 - (sp.embedding <=> $1::vector) AS score
          FROM supplier_product sp
          WHERE sp.embedding IS NOT NULL
            AND sp.enabled = true
          ORDER BY sp.embedding <=> $1::vector
          LIMIT $2
        )
        SELECT *
        FROM (
          SELECT * FROM catalog_results
          UNION ALL
          SELECT * FROM supplier_results
        ) combined
        WHERE score >= $3
        ORDER BY score DESC
        LIMIT $2
      `,
      [vector, take, minScore],
    ) as Array<SemanticSearchItem & { score: string | number; price: string | number }>;

    return rows.map((row) => ({
      ...row,
      price: Number(row.price ?? 0),
      score: Number(row.score ?? 0),
    }));
  }

  private async findProductForEmbedding(productId: string): Promise<ProductForEmbedding | null> {
    const rows = await this.connection.rawConnection.query(
      `
        SELECT
          pt."baseId" AS id,
          pt.name AS name,
          pt.description AS description,
          COALESCE((
            SELECT ct.name
            FROM product_variant pv
            JOIN collection_product_variants_product_variant cpv ON cpv."productVariantId" = pv.id
            JOIN collection_translation ct ON ct."baseId" = cpv."collectionId"
            WHERE pv."productId" = pt."baseId"
            ORDER BY ct.id ASC
            LIMIT 1
          ), '') AS category,
          '' AS brand
        FROM product_translation pt
        WHERE pt."baseId" = $1
        ORDER BY pt.id ASC
        LIMIT 1
      `,
      [productId],
    ) as ProductRow[];

    return rows[0] ? this.toProductForEmbedding(rows[0]) : null;
  }

  private async findUnindexedProducts(limit: number): Promise<ProductForEmbedding[]> {
    const rows = await this.connection.rawConnection.query(
      `
        SELECT
          pt."baseId" AS id,
          pt.name AS name,
          pt.description AS description,
          COALESCE((
            SELECT ct.name
            FROM product_variant pv
            JOIN collection_product_variants_product_variant cpv ON cpv."productVariantId" = pv.id
            JOIN collection_translation ct ON ct."baseId" = cpv."collectionId"
            WHERE pv."productId" = pt."baseId"
            ORDER BY ct.id ASC
            LIMIT 1
          ), '') AS category,
          '' AS brand
        FROM product_translation pt
        WHERE pt.embedding IS NULL
        ORDER BY pt.id ASC
        LIMIT $1
      `,
      [limit],
    ) as ProductRow[];

    return rows.map((row) => this.toProductForEmbedding(row));
  }

  private async findUnindexedSupplierProducts(limit: number): Promise<ProductForEmbedding[]> {
    const rows = await this.connection.rawConnection.query(
      `
        SELECT
          id,
          name,
          description,
          category,
          '' AS brand
        FROM supplier_product
        WHERE embedding IS NULL
        ORDER BY id ASC
        LIMIT $1
      `,
      [limit],
    ) as ProductRow[];

    return rows.map((row) => this.toProductForEmbedding(row));
  }

  private async hasProductEmbedding(productId: string): Promise<boolean> {
    const rows = await this.connection.rawConnection.query(
      'SELECT embedding IS NOT NULL AS indexed FROM product_translation WHERE "baseId" = $1 LIMIT 1',
      [productId],
    ) as Array<{ indexed: boolean }>;

    return rows[0]?.indexed === true;
  }

  private async hasSupplierProductEmbedding(productId: string): Promise<boolean> {
    const rows = await this.connection.rawConnection.query(
      'SELECT embedding IS NOT NULL AS indexed FROM supplier_product WHERE id = $1 LIMIT 1',
      [productId],
    ) as Array<{ indexed: boolean }>;

    return rows[0]?.indexed === true;
  }

  private toProductForEmbedding(row: ProductRow): ProductForEmbedding {
    return {
      id: String(row.id),
      name: row.name ?? '',
      description: row.description ?? '',
      category: row.category ?? '',
      brand: row.brand ?? '',
    };
  }

  private productText(product: ProductForEmbedding): string {
    return `${product.name} ${product.description} ${product.category} ${product.brand ?? ''}`.trim();
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
}
