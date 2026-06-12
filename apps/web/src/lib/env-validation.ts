type EnvValidationOptions = {
  mode?: string;
  env?: NodeJS.ProcessEnv;
};

const REQUIRED_PRODUCTION_ENV = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SOCKET_URL',
] as const;

const RECOMMENDED_PRODUCTION_ENV = [
  'STRAPI_API_TOKEN',
  'NEXT_PUBLIC_ALGOLIA_APP_ID',
  'NEXT_PUBLIC_ALGOLIA_SEARCH_KEY',
  'NEXT_PUBLIC_ALGOLIA_INDEX_NAME',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
] as const;

export function validateWebEnv(options: EnvValidationOptions = {}) {
  const env = options.env ?? process.env;
  const mode = options.mode ?? env.NODE_ENV;
  if (mode !== 'production') return;

  const missingRequired = REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]);
  if (missingRequired.length > 0) {
    const message = `Missing required production env: ${missingRequired.join(', ')}`;
    if (env.STRICT_WEB_ENV === 'true') {
      throw new Error(message);
    }
    console.warn(`[env] ${message}`);
  }

  const missingRecommended = [
    ...RECOMMENDED_PRODUCTION_ENV.filter((key) => !env[key]),
    !env.CLEANUP_SERVICE_URL && !env.GPU_SERVICE_URL ? 'CLEANUP_SERVICE_URL or GPU_SERVICE_URL' : '',
  ].filter(Boolean);
  if (missingRecommended.length > 0) {
    console.warn(`[env] Missing recommended production env: ${missingRecommended.join(', ')}`);
  }
}
