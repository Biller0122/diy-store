/**
 * Run after first `npm run dev` to seed the Mongolian default channel,
 * currency (MNT), and locale (mn).
 *
 * Usage: npx ts-node src/populate.ts
 */
import { bootstrap } from '@vendure/core';
import { config } from './vendure-config';

bootstrap(config)
  .then(async (app) => {
    const { ChannelService, RequestContextService } = await import('@vendure/core');

    const channelService = app.get(ChannelService);
    const requestContextService = app.get(RequestContextService);

    const ctx = await requestContextService.create({ apiType: 'admin' });

    const defaultChannel = await channelService.getDefaultChannel(ctx);

    await channelService.update(ctx, {
      id: defaultChannel.id,
      code: '__default_channel__',
      token: defaultChannel.token,
      defaultLanguageCode: 'mn' as any,
      availableLanguageCodes: ['mn' as any, 'en' as any],
      defaultCurrencyCode: 'MNT' as any,
      availableCurrencyCodes: ['MNT' as any, 'USD' as any],
      pricesIncludeTax: false,
    });

    console.log('✅ Default channel updated: language=mn, currency=MNT');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Populate failed:', err);
    process.exit(1);
  });
