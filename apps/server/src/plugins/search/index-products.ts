import 'dotenv/config';
import { bootstrap } from '@vendure/core';
import { config } from '../../vendure-config';
import { EmbeddingService } from './embedding.service';

async function main() {
  const app = await bootstrap(config);
  try {
    const result = await app.get(EmbeddingService).indexAllProducts();
    console.log(`[Embedding] Backfill complete: success=${result.success} failed=${result.failed}`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('[Embedding] Backfill failed', error);
  process.exit(1);
});
