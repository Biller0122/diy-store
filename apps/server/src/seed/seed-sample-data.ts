import {
  bootstrap,
  ChannelService,
  CollectionService,
  CountryService,
  JobQueueService,
  LanguageCode,
  ProductService,
  ProductVariantService,
  RequestContextService,
  SearchService,
  TaxCategoryService,
  TaxRateService,
  ZoneService,
} from '@vendure/core';
import { CurrencyCode, GlobalFlag } from '@vendure/common/lib/generated-types';
import { DataSource, Repository } from 'typeorm';
import { config } from '../vendure-config';
import { Driver } from '../plugins/driver/driver.entity';
import { HomepageBanner } from '../plugins/cms/homepage-banner.entity';
import { Supplier } from '../plugins/supplier/supplier.entity';
import { SupplierProduct } from '../plugins/supplier/supplier-product.entity';
import { SAMPLE_BANNERS, SAMPLE_DRIVERS, SAMPLE_PRODUCTS, SAMPLE_SUPPLIERS } from './sample-data';
import { seedCollections } from './seed-collections';

function bySlug<T extends { slug: string }>(items: T[]) {
  return new Map(items.map((item) => [item.slug, item]));
}

async function upsertSupplier(repo: Repository<Supplier>, input: (typeof SAMPLE_SUPPLIERS)[number]) {
  const existing = await repo.findOne({ where: { slug: input.slug } });
  const supplier = repo.create({
    ...(existing ?? {}),
    businessName: input.businessName,
    slug: input.slug,
    logo: input.logo,
    description: input.description,
    ownerName: input.ownerName,
    phone: input.phone,
    email: input.email,
    address: input.address,
    district: input.district,
    lat: input.lat,
    lng: input.lng,
    commissionRate: 10,
    status: input.status,
    rating: input.rating,
    reviewCount: input.reviewCount,
    pickupEnabled: true,
    deliveryEnabled: true,
    statusHistory: existing?.statusHistory ?? [{ status: input.status, at: new Date().toISOString() }],
  });
  return repo.save(supplier);
}

async function upsertSupplierProduct(
  repo: Repository<SupplierProduct>,
  input: (typeof SAMPLE_PRODUCTS)[number],
  supplierId: string,
) {
  const existing = await repo.findOne({ where: { slug: input.slug } });
  const product = repo.create({
    ...(existing ?? {}),
    supplierId,
    name: input.name,
    slug: input.slug,
    description: `${input.name} - ${input.unit}`,
    category: input.category,
    image: input.image,
    price: input.price,
    originalPrice: input.originalPrice ?? null,
    stock: input.stock,
    enabled: input.enabled,
  });
  return repo.save(product);
}

async function seedVendureProduct(
  productService: ProductService,
  variantService: ProductVariantService,
  collectionService: CollectionService,
  ctx: Awaited<ReturnType<RequestContextService['create']>>,
  input: (typeof SAMPLE_PRODUCTS)[number],
) {
  let product = await productService.findOneBySlug(ctx, input.slug, ['variants']);
  if (!product) {
    product = await productService.create(ctx, {
      enabled: input.enabled,
      translations: [
        {
          languageCode: LanguageCode.mn,
          name: input.name,
          slug: input.slug,
          description: `${input.name} - ${input.unit}`,
          customFields: {
            avgRating: input.rating,
            reviewCount: input.reviewCount,
          },
        },
        {
          languageCode: LanguageCode.en,
          name: input.name,
          slug: input.slug,
          description: `${input.name} - ${input.unit}`,
          customFields: {
            avgRating: input.rating,
            reviewCount: input.reviewCount,
          },
        },
      ],
      customFields: {
        avgRating: input.rating,
        reviewCount: input.reviewCount,
      },
    } as any);
  } else {
    await productService.update(ctx, {
      id: product.id,
      enabled: input.enabled,
      translations: [
        {
          id: product.translations?.find((t) => t.languageCode === LanguageCode.mn)?.id,
          languageCode: LanguageCode.mn,
          name: input.name,
          slug: input.slug,
          description: `${input.name} - ${input.unit}`,
          customFields: {
            avgRating: input.rating,
            reviewCount: input.reviewCount,
          },
        },
        {
          id: product.translations?.find((t) => t.languageCode === LanguageCode.en)?.id,
          languageCode: LanguageCode.en,
          name: input.name,
          slug: input.slug,
          description: `${input.name} - ${input.unit}`,
          customFields: {
            avgRating: input.rating,
            reviewCount: input.reviewCount,
          },
        },
      ],
      customFields: {
        avgRating: input.rating,
        reviewCount: input.reviewCount,
      },
    } as any);
    product = await productService.findOneBySlug(ctx, input.slug, ['variants']);
  }

  const sku = `DIY-${input.slug}`;
  const variant = product?.variants?.find((item) => item.sku === sku);
  if (variant) {
    await variantService.update(ctx, [{
      id: variant.id,
      enabled: input.enabled,
      sku,
      price: input.price,
      stockOnHand: input.stock,
      trackInventory: GlobalFlag.TRUE,
      translations: [
        { languageCode: LanguageCode.mn, name: input.name },
        { languageCode: LanguageCode.en, name: input.name },
      ],
    } as any]);
  } else if (product) {
    await variantService.create(ctx, [{
      productId: product.id,
      enabled: input.enabled,
      sku,
      price: input.price,
      stockOnHand: input.stock,
      trackInventory: GlobalFlag.TRUE,
      prices: [{ currencyCode: CurrencyCode.MNT, price: input.price }],
      translations: [
        { languageCode: LanguageCode.mn, name: input.name },
        { languageCode: LanguageCode.en, name: input.name },
      ],
    } as any]);
  }

  const refreshed = await productService.findOneBySlug(ctx, input.slug, ['variants']);
  const collection = await collectionService.findOneBySlug(ctx, input.category, ['productVariants']);
  const productVariant = refreshed?.variants?.[0];
  if (collection && productVariant) {
    const existing = collection.productVariants ?? [];
    if (!existing.some((item) => String(item.id) === String(productVariant.id))) {
      collection.productVariants = [...existing, productVariant as any];
      await (collectionService as any).connection.getRepository(ctx, (collection as any).constructor).save(collection);
    }
  }
}

async function ensureTaxDefaults(
  app: Awaited<ReturnType<typeof bootstrap>>,
  ctx: Awaited<ReturnType<RequestContextService['create']>>,
) {
  const countryService = app.get(CountryService);
  const zoneService = app.get(ZoneService);
  const taxCategoryService = app.get(TaxCategoryService);
  const taxRateService = app.get(TaxRateService);
  const channelService = app.get(ChannelService);
  const dataSource = app.get(DataSource);

  let country = await countryService.findOneByCode(ctx, 'MN').catch(() => undefined);
  if (!country) {
    country = await countryService.create(ctx, {
      code: 'MN',
      enabled: true,
      translations: [
        { languageCode: LanguageCode.mn, name: 'Монгол' },
        { languageCode: LanguageCode.en, name: 'Mongolia' },
      ],
    });
  }

  const zones = await zoneService.findAll(ctx, { take: 100 });
  let zone = zones.items.find((item) => item.name === 'Mongolia');
  if (!zone) {
    zone = await zoneService.create(ctx, {
      name: 'Mongolia',
      memberIds: [country.id],
    });
  }

  const taxCategories = await taxCategoryService.findAll(ctx, { take: 100 });
  let taxCategory = taxCategories.items.find((item) => item.name === 'Standard Tax');
  if (!taxCategory) {
    taxCategory = await taxCategoryService.create(ctx, {
      name: 'Standard Tax',
      isDefault: true,
    });
  }

  const taxRates = await taxRateService.findAll(ctx, { take: 100 });
  const hasTaxRate = taxRates.items.some((item) => item.name === 'Mongolia 0% VAT');
  if (!hasTaxRate) {
    await taxRateService.create(ctx, {
      name: 'Mongolia 0% VAT',
      enabled: true,
      value: 0,
      categoryId: taxCategory.id,
      zoneId: zone.id,
    });
  }

  const defaultChannel = await channelService.getDefaultChannel(ctx);
  await channelService.update(ctx, {
    id: defaultChannel.id,
    code: defaultChannel.code,
    token: defaultChannel.token,
    defaultLanguageCode: LanguageCode.mn,
    availableLanguageCodes: [LanguageCode.mn, LanguageCode.en],
    defaultCurrencyCode: CurrencyCode.MNT,
    availableCurrencyCodes: [CurrencyCode.MNT, CurrencyCode.USD],
    defaultTaxZoneId: zone.id,
    defaultShippingZoneId: zone.id,
    pricesIncludeTax: false,
  } as any);

  await dataSource.query(
    'update channel set "defaultTaxZoneId" = $1, "defaultShippingZoneId" = $1 where id = $2',
    [zone.id, defaultChannel.id],
  );
  await dataSource.query(
    'update tax_category set "isDefault" = true where id = $1',
    [taxCategory.id],
  );
}

async function attachDefaultZonesToContext(
  app: Awaited<ReturnType<typeof bootstrap>>,
  ctx: Awaited<ReturnType<RequestContextService['create']>>,
) {
  const zones = await app.get(ZoneService).findAll(ctx, { take: 10 });
  const zone = zones.items.find((item) => item.name === 'Mongolia') ?? zones.items[0];
  if (zone) {
    (ctx.channel as any).defaultTaxZone = zone;
    (ctx.channel as any).defaultShippingZone = zone;
  }
}

async function seedDrivers(repo: Repository<Driver>) {
  for (const input of SAMPLE_DRIVERS) {
    const existing = await repo.findOne({ where: { phone: input.phone } });
    await repo.save(repo.create({
      ...(existing ?? {}),
      ...input,
      emailAddress: existing?.emailAddress ?? null,
      passwordHash: existing?.passwordHash ?? null,
      vehicleModel: existing?.vehicleModel ?? null,
      bankName: existing?.bankName ?? null,
      bankAccount: existing?.bankAccount ?? null,
      todayEarnings: existing?.todayEarnings ?? 0,
      totalEarnings: existing?.totalEarnings ?? 0,
      otpCode: null,
      otpExpiresAt: null,
    }));
  }
}

async function seedBanners(repo: Repository<HomepageBanner>) {
  for (const input of SAMPLE_BANNERS) {
    const existing = await repo.findOne({ where: { title: input.title } });
    await repo.save(repo.create({ ...(existing ?? {}), ...input }));
  }
}

async function seedSampleData() {
  console.log('Seeding DIY Store sample data...');

  const app = await bootstrap(config);
  await app.get(JobQueueService).start();
  const requestContextService = app.get(RequestContextService);
  const channelService = app.get(ChannelService);
  let ctx = await requestContextService.create({ apiType: 'admin' });
  const defaultChannel = await channelService.getDefaultChannel(ctx);

  await channelService.update(ctx, {
    id: defaultChannel.id,
    code: '__default_channel__',
    token: defaultChannel.token,
    defaultLanguageCode: LanguageCode.mn,
    availableLanguageCodes: [LanguageCode.mn, LanguageCode.en],
    defaultCurrencyCode: CurrencyCode.MNT,
    availableCurrencyCodes: [CurrencyCode.MNT, CurrencyCode.USD],
    pricesIncludeTax: false,
  } as any);

  await ensureTaxDefaults(app, ctx);
  ctx = await requestContextService.create({ apiType: 'admin' });
  await attachDefaultZonesToContext(app, ctx);

  await seedCollections(app);

  const dataSource = app.get(DataSource);
  const supplierRepo = dataSource.getRepository(Supplier);
  const supplierProductRepo = dataSource.getRepository(SupplierProduct);
  const driverRepo = dataSource.getRepository(Driver);
  const bannerRepo = dataSource.getRepository(HomepageBanner);

  const savedSuppliers = new Map<string, Supplier>();
  for (const supplier of SAMPLE_SUPPLIERS) {
    savedSuppliers.set(supplier.key, await upsertSupplier(supplierRepo, supplier));
  }

  for (const product of SAMPLE_PRODUCTS) {
    const supplier = savedSuppliers.get(product.supplierKey);
    if (!supplier) continue;
    await upsertSupplierProduct(supplierProductRepo, product, String(supplier.id));
  }

  const productService = app.get(ProductService);
  const variantService = app.get(ProductVariantService);
  const collectionService = app.get(CollectionService);
  for (const product of SAMPLE_PRODUCTS) {
    await seedVendureProduct(productService, variantService, collectionService, ctx, product);
  }

  for (const [key, supplier] of savedSuppliers) {
    const productCount = SAMPLE_PRODUCTS.filter((product) => product.supplierKey === key).length;
    await supplierRepo.update(supplier.id, { productCount });
  }

  await seedDrivers(driverRepo);
  await seedBanners(bannerRepo);

  const searchService = app.get(SearchService);
  await searchService.reindex(ctx);

  const suppliers = await supplierRepo.count();
  const supplierProducts = await supplierProductRepo.count();
  const drivers = await driverRepo.count();
  const banners = await bannerRepo.count();
  console.log(`Done. Suppliers=${suppliers}, supplierProducts=${supplierProducts}, drivers=${drivers}, banners=${banners}`);
  await app.close();
  process.exit(0);
}

seedSampleData().catch((err) => {
  console.error('Sample data seed failed:', err);
  process.exit(1);
});
