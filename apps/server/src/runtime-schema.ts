import { DataSource } from 'typeorm';

// Runtime additive schema guard: columns added here are created on boot via
// ADD COLUMN IF NOT EXISTS (production runs with synchronize/migrations off).
type RuntimeColumn = {
  table: string;
  name: string;
  definition: string;
};

const RUNTIME_COLUMNS: RuntimeColumn[] = [
  {
    table: 'supplier',
    name: 'otpAttempts',
    definition: 'integer NOT NULL DEFAULT 0',
  },
  {
    table: 'driver',
    name: 'otpAttempts',
    definition: 'integer NOT NULL DEFAULT 0',
  },
  {
    table: 'delivery_request',
    name: 'trackingToken',
    definition: "character varying NOT NULL DEFAULT ''",
  },
];

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function ensureRuntimeSchema(dataSource: DataSource) {
  if (dataSource.options.type !== 'postgres') return;

  for (const column of RUNTIME_COLUMNS) {
    await dataSource.query(
      `ALTER TABLE ${quoteIdentifier(column.table)} ADD COLUMN IF NOT EXISTS ${quoteIdentifier(column.name)} ${column.definition}`,
    );
  }

  await ensureEmbeddingSchema(dataSource);
}

/**
 * pgvector embedding columns/indexes for semantic search. These are NOT TypeORM
 * entity columns, so `synchronize` would drop them — re-create them on every boot
 * (idempotent via IF NOT EXISTS) so semantic search self-heals after any schema
 * drift. Each statement is isolated so a missing privilege/extension never aborts
 * boot.
 */
async function ensureEmbeddingSchema(dataSource: DataSource) {
  const statements = [
    'CREATE EXTENSION IF NOT EXISTS vector',
    'ALTER TABLE product_translation ADD COLUMN IF NOT EXISTS embedding vector(1024)',
    'ALTER TABLE supplier_product ADD COLUMN IF NOT EXISTS embedding vector(1024)',
    'CREATE INDEX IF NOT EXISTS product_translation_embedding_idx ON product_translation USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)',
    'CREATE INDEX IF NOT EXISTS supplier_product_embedding_idx ON supplier_product USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)',
  ];
  for (const sql of statements) {
    try {
      await dataSource.query(sql);
    } catch (error) {
      console.error('[runtime-schema] embedding setup step skipped:', sql, (error as Error)?.message ?? error);
    }
  }
}
