import {
  bootstrap,
  CollectionService,
  ID,
  LanguageCode,
  RequestContextService,
} from '@vendure/core';
import { config } from '../vendure-config';
import { CATEGORY_TREE, SeedCategory } from './categories';

async function seedCollections() {
  console.log('🌱 Seeding Vendure collections...\n');

  const app = await bootstrap(config);
  const collectionService = app.get(CollectionService);
  const ctx = await app.get(RequestContextService).create({ apiType: 'admin' });

  const existing = await collectionService.findAll(ctx, { take: 500, skip: 0 });
  const existingBySlug = new Map<string, ID>();
  for (const collection of existing.items) {
    for (const translation of collection.translations) {
      existingBySlug.set(translation.slug, collection.id);
    }
    existingBySlug.set(collection.slug, collection.id);
  }

  let created = 0;
  let skipped = 0;

  async function ensureCollection(cat: SeedCategory | Omit<SeedCategory, 'children'>, parentId?: ID) {
    const existingId = existingBySlug.get(cat.slug);
    if (existingId) {
      console.log(`⏭  Skipped (exists): ${cat.icon}  ${cat.name}`);
      skipped++;
      return existingId;
    }

    const saved = await collectionService.create(ctx, {
      isPrivate: false,
      parentId,
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
    existingBySlug.set(cat.slug, saved.id);
    return saved.id;
  }

  for (const category of CATEGORY_TREE) {
    const parentId = await ensureCollection(category);
    for (const child of category.children ?? []) {
      await ensureCollection(child, parentId);
    }
  }

  console.log(`\n🏁 Done — ${created} created, ${skipped} skipped`);
  await app.close();
  process.exit(0);
}

seedCollections().catch((err) => {
  console.error('\n❌ Seed failed:', err.message ?? err);
  process.exit(1);
});
