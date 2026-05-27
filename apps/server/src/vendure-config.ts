import {
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  LanguageCode,
  VendureConfig,
} from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin';
import path from 'path';
import { qpayPaymentHandler, monpayPaymentHandler } from './plugins/payment';
import { ReviewPlugin } from './plugins/review/review.plugin';
import { SupplierPlugin } from './plugins/supplier/supplier.plugin';
import { DriverPlugin } from './plugins/driver/driver.plugin';

const useSqliteDevDb = process.env.DB_TYPE === 'sqlite' || process.env.DB_TYPE === 'better-sqlite3';

export const config: VendureConfig = {
  apiOptions: {
    port: parseInt(process.env.PORT || '3001'),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    cors: {
      origin: [
        process.env.STOREFRONT_URL || 'http://localhost:3000',
        'http://localhost:3002',
      ],
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
        database: process.env.DB_NAME || 'vendure',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'vendure',
        password: process.env.DB_PASSWORD || 'vendure',
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
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
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
