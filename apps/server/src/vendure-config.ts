import {
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  LanguageCode,
  RequestContext,
  VendureConfig,
} from '@vendure/core';
import {
  AssetServerPlugin,
  configureS3AssetStorage,
  HashedAssetNamingStrategy,
} from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin';
import { config as loadEnv } from 'dotenv';
import { json } from 'body-parser';
import path from 'path';
import { qpayPaymentHandler, monpayPaymentHandler } from './plugins/payment';
import { ReviewPlugin } from './plugins/review/review.plugin';
import { SupplierPlugin } from './plugins/supplier/supplier.plugin';
import { DriverPlugin } from './plugins/driver/driver.plugin';
import { DeliveryPlugin } from './plugins/delivery/delivery.plugin';
import { RealtimePlugin } from './plugins/realtime.plugin';
import { AdminStatsPlugin } from './plugins/admin-stats/admin-stats.plugin';
import { DeviceTokenPlugin } from './plugins/device-token/device-token.plugin';
import { CmsPlugin } from './plugins/cms/cms.plugin';
import { SearchPlugin } from './plugins/search/search.plugin';

loadEnv({ path: path.join(__dirname, '../../../.env') });

const useSqliteDevDb = process.env.DB_TYPE === 'sqlite' || process.env.DB_TYPE === 'better-sqlite3';
const vendureDbName = process.env.DB_NAME || process.env.VENDURE_DB_NAME || 'vendure';
const vendureDbUsername = process.env.DB_USERNAME || process.env.VENDURE_DB_USERNAME || 'vendure';
const vendureDbPassword = process.env.DB_PASSWORD || process.env.VENDURE_DB_PASSWORD || 'vendure';
const corsOrigins = [
  process.env.STOREFRONT_URL || 'http://localhost:3000',
  'http://localhost:18080',
  'http://localhost:18081',
  'http://localhost:18082',
  'http://localhost:18083',
  'http://localhost:19006',
  'http://127.0.0.1:18080',
  'http://127.0.0.1:18081',
  'http://127.0.0.1:18082',
  'http://127.0.0.1:18083',
  'http://127.0.0.1:19006',
  'http://localhost:3002',
  ...(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];
const useS3AssetStorage = process.env.ASSET_STORAGE === 's3';
const s3AssetPrefix = (process.env.S3_PREFIX || '').replace(/^\/+|\/+$/g, '');
const assetUrlPrefix = process.env.ASSET_URL_PREFIX
  ? process.env.ASSET_URL_PREFIX.replace(/\/?$/, '/')
  : undefined;

class PrefixedAssetNamingStrategy extends HashedAssetNamingStrategy {
  constructor(private readonly prefix: string) {
    super();
  }

  generateSourceFileName(ctx: RequestContext, originalFileName: string, conflictFileName?: string) {
    return path.posix.join(
      this.prefix,
      super.generateSourceFileName(ctx, originalFileName, conflictFileName),
    );
  }

  generatePreviewFileName(ctx: RequestContext, sourceFileName: string, conflictFileName?: string) {
    return path.posix.join(
      this.prefix,
      super.generatePreviewFileName(ctx, sourceFileName, conflictFileName),
    );
  }
}

function getS3AssetStorageOptions() {
  if (!useS3AssetStorage) return {};

  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('ASSET_STORAGE=s3 requires S3_BUCKET to be set');
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const credentials = accessKeyId && secretAccessKey
    ? { accessKeyId, secretAccessKey }
    : undefined;

  return {
    ...(s3AssetPrefix
      ? { namingStrategy: new PrefixedAssetNamingStrategy(s3AssetPrefix) }
      : {}),
    storageStrategyFactory: configureS3AssetStorage({
      bucket,
      credentials: credentials as any,
      nativeS3Configuration: {
        region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-southeast-1',
        ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
        ...(process.env.S3_FORCE_PATH_STYLE === 'true' ? { forcePathStyle: true } : {}),
      },
    }),
  };
}

export const config: VendureConfig = {
  apiOptions: {
    port: parseInt(process.env.PORT || '3001'),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    middleware: [{
      handler: json({ limit: process.env.API_JSON_LIMIT || '10mb' }),
      route: '*splat',
      beforeListen: true,
    }],
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    requireVerification: false,
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET || 'cookie-secret-change-in-prod',
    },
  },
  dbConnectionOptions: useSqliteDevDb
    ? ({
        type: 'better-sqlite3',
        synchronize: true,
        logging: process.env.NODE_ENV === 'development',
        database: path.join(__dirname, '../vendure-dev.sqlite'),
      } as any)
    : {
        type: 'postgres',
        synchronize: process.env.NODE_ENV !== 'production' || process.env.DB_SYNCHRONIZE === 'true',
        logging: process.env.NODE_ENV === 'development',
        database: vendureDbName,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: vendureDbUsername,
        password: vendureDbPassword,
        ...(process.env.DB_SSL === 'true'
          ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' } }
          : {}),
        migrations: [path.join(__dirname, '../migrations/*.js')],
      },
  paymentOptions: {
    paymentMethodHandlers: [qpayPaymentHandler, monpayPaymentHandler],
  },
  customFields: {
    Collection: [
      {
        name: 'icon',
        type: 'string',
        nullable: true,
        label: [{ languageCode: LanguageCode.en, value: 'Icon (emoji)' }],
      },
    ],
    Product: [
      {
        name: 'avgRating',
        type: 'float',
        defaultValue: 0,
        label: [{ languageCode: LanguageCode.en, value: 'Average rating' }],
      },
      {
        name: 'reviewCount',
        type: 'int',
        defaultValue: 0,
        label: [{ languageCode: LanguageCode.en, value: 'Review count' }],
      },
    ],
  },
  plugins: [
    ReviewPlugin,
    SupplierPlugin,
    DriverPlugin,
    DeliveryPlugin,
    RealtimePlugin,
    AdminStatsPlugin,
    DeviceTokenPlugin,
    CmsPlugin,
    SearchPlugin,
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
      ...(assetUrlPrefix ? { assetUrlPrefix } : {}),
      ...getS3AssetStorageOptions(),
    }),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    EmailPlugin.init({
      devMode: true,
      outputPath: path.join(__dirname, '../static/email/test-emails'),
      route: 'mailbox',
      handlers: defaultEmailHandlers,
      templatePath: path.join(__dirname, '../static/email/templates'),
      ...(process.env.SMTP_HOST
        ? {
            transport: {
              type: 'smtp',
              host: process.env.SMTP_HOST,
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: false,
              auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || '',
              },
            },
          }
        : {}),
      globalTemplateVars: {
        fromAddress: process.env.SMTP_FROM || process.env.EMAIL_FROM || '"DIY Store" <noreply@diy-store.mn>',
        verifyEmailAddressUrl: `${process.env.STOREFRONT_URL || 'http://localhost:3000'}/verify`,
        passwordResetUrl: `${process.env.STOREFRONT_URL || 'http://localhost:3000'}/password-reset`,
        changeEmailAddressUrl: `${process.env.STOREFRONT_URL || 'http://localhost:3000'}/verify-email-address-change`,
      },
    }),
    AdminUiPlugin.init({
      route: 'admin',
      port: 3002,
    }),
  ],
};
