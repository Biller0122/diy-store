import { validateWebEnv } from '@/lib/env-validation';

describe('validateWebEnv', () => {
  test('warns in production when required public endpoints are missing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => validateWebEnv({ mode: 'production', env: {} as NodeJS.ProcessEnv })).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('NEXT_PUBLIC_API_URL'));
    warn.mockRestore();
  });

  test('throws in strict production mode when required public endpoints are missing', () => {
    expect(() =>
      validateWebEnv({
        mode: 'production',
        env: { STRICT_WEB_ENV: 'true' } as unknown as NodeJS.ProcessEnv,
      }),
    ).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  test('does not throw outside production', () => {
    expect(() => validateWebEnv({ mode: 'development', env: {} as NodeJS.ProcessEnv })).not.toThrow();
  });

  test('accepts required production endpoints', () => {
    expect(() =>
      validateWebEnv({
        mode: 'production',
        env: {
          NEXT_PUBLIC_API_URL: 'https://shoptool.mn',
          NEXT_PUBLIC_SOCKET_URL: 'https://shoptool.mn',
          CLEANUP_SERVICE_URL: 'https://cleanup.shoptool.mn',
          GPU_SERVICE_URL: 'https://gpu.shoptool.mn',
          STRAPI_API_TOKEN: 'token',
          NEXT_PUBLIC_ALGOLIA_APP_ID: 'app',
          NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: 'key',
          NEXT_PUBLIC_ALGOLIA_INDEX_NAME: 'diy_products',
          NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'google',
        } as unknown as NodeJS.ProcessEnv,
      }),
    ).not.toThrow();
  });
});
