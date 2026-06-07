import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.join(process.cwd(), '../../.env.local') });
loadEnv();

async function main(): Promise<void> {
  const { bootstrap } = await import('@vendure/core');
  const { config } = await import('../vendure-config');
  const { EmbeddingService } = await import('../plugins/search/embedding.service');

  const app = await bootstrap(config);
  const embeddingService = app.get(EmbeddingService);
  const result = await embeddingService.indexAllProducts();

  console.log(`✅ Reindex complete: ${result.success} success, ${result.failed} failed`);
  await app.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Reindex failed', error);
  process.exit(1);
});
