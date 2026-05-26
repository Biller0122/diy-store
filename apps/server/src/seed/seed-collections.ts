import {
  bootstrap,
  CollectionService,
  LanguageCode,
  RequestContextService,
} from '@vendure/core';
import { config } from '../vendure-config';
import { TOP_CATEGORIES } from './categories';

async function seedCollections() {
  console.log('🌱 Seeding Vendure collections...\n');

  const app = await bootstrap(config);
  const collectionService = app.get(CollectionService);
  const ctx = await app.get(RequestContextService).create({ apiType: 'admin' });

  // Fetch existing slugs so the script is idempotent
  const existing = await collectionService.findAll(ctx, { take: 200, skip: 0 });
  const existingSlugs = new Set(
    existing.items.flatMap((c) =>
      c.translations.map((t) => t.slug),
    ),
  );

  let created = 0;
  let skipped = 0;

  for (const cat of TOP_CATEGORIES) {
    if (existingSlugs.has(cat.slug)) {
      console.log(`⏭  Skipped (exists): ${cat.icon}  ${cat.name}`);
      skipped++;
      continue;
    }

    await collectionService.create(ctx, {
      isPrivate: false,
      // No parentId → Vendure places it under the root collection
      filters: [],
      inheritFilters: false,
      customFields: { icon: cat.icon },
      translations: [
        {
          languageCode: LanguageCode.mn,
          name: cat.name,
          slug: cat.slug,
          description: '',
          customFields: { icon: cat.icon },
        },
        {
          languageCode: LanguageCode.en,
          name: cat.name,   // English translations can be updated later
          slug: cat.slug,
          description: '',
          customFields: { icon: cat.icon },
        },
      ],
    });

    console.log(`✅ Created: ${cat.icon}  ${cat.name}  (/${cat.slug})`);
    created++;
  }

  console.log(`\n🏁 Done — ${created} created, ${skipped} skipped`);
  await app.close();
  process.exit(0);
}

seedCollections().catch((err) => {
  console.error('\n❌ Seed failed:', err.message ?? err);
  process.exit(1);
});
