# Project Handoff

All Claude and Codex sessions must read this file before editing and update it before finishing.

## Fixed Decisions

- Vendure connects only to AWS RDS. Local PostgreSQL is forbidden, including fallback use.
- Work is tested locally before release.
- Commit, push, PR, and deploy require explicit user approval after local verification.
- Existing uncommitted files may belong to another agent and must not be reverted.

## Runtime Snapshot

- Branch: `dev`
- Base commit: `1eb9ab9`
- Local web: `http://localhost:18080`
- Local web currently uses the AWS RDS-backed `https://shoptool.mn/shop-api`.
- Local Vendure and local PostgreSQL containers must remain stopped.

## Active Work

| Date | Agent | Task | State |
| --- | --- | --- | --- |
| 2026-06-21 | Codex | Fix supplier profile token isolation, S3 asset URL crash, and 3-second profile visibility | Local verification complete; awaiting user review |
| 2026-06-21 | Codex | Reuse the supplier profile design for the public store page and show real store media on supplier cards | Local verification complete; no deploy |
| 2026-06-21 | Codex | Fix saved posters missing on first public profile visit | Local verification complete; no deploy |
| 2026-06-21 | Codex | Release verified supplier profile/auth/media changes to production | Deployed and production smoke-tested successfully |
| 2026-06-21 | Codex | Review completed supplier profile/auth/media work | Verification complete; no code changes |
| 2026-06-21 | Codex | Fix production supplier profile media asset loading | Local verification complete; awaiting deploy approval |

## Latest Handoff

### 2026-06-21 - Production supplier media asset loading fix

- Root cause: production `/assets/...` served the image directly, but Next image optimization returned `400 The requested resource isn't a valid image` for relative `/assets/...` supplier media URLs. The same optimizer request succeeds when the source is absolute (`https://shoptool.mn/assets/...`).
- Changed `apps/web/src/lib/vendure.ts` so raw Vendure/S3 asset keys now normalize to an absolute public asset URL using `NEXT_PUBLIC_SITE_URL`, the Vendure API origin, or the browser origin.
- Changed `apps/server/src/plugins/supplier/supplier.resolver.ts` so new supplier logo/cover/poster uploads return an absolute public asset URL before saving through `updateSupplier`.
- Updated `apps/web/src/__tests__/vendure-session.test.ts` for the new absolute asset URL behavior.
- Verification:
  - `npm run test --workspace @diy-store/web -- vendure-session.test.ts --runInBand`: passed, 3 tests.
  - `npm run build --workspace @diy-store/server`: passed.
  - `npm run build --workspace @diy-store/web`: passed; `/suppliers/[slug]` remains dynamic (`ƒ`).
  - `npm run lint --workspace @diy-store/server`: passed with 0 errors and 15 existing warnings.
  - `npm run lint --workspace @diy-store/web`: passed with 0 errors and 85 existing warnings.
  - Production smoke of the fixed URL shape: `https://shoptool.mn/_next/image?url=https%3A%2F%2Fshoptool.mn%2Fassets%2Fvendure-assets%2Fpreview%2F98%2Fscreenshot-2026-06-17-111640__preview.png&w=1200&q=75` returned 200 `image/png`.
- Follow-up after first deploy smoke: production initially emitted absolute ALB asset URLs, which Next image optimization rejected with 400 because the ALB host is not in `remotePatterns`. `resolveVendureAssetUrl()` and supplier upload URL generation now prefer the public site URL (`NEXT_PUBLIC_SITE_URL` / `PRODUCTION_BASE_URL`) before Vendure API or asset prefix origins.
- Second deploy smoke still showed ALB URLs because the production web runtime did not expose `NEXT_PUBLIC_SITE_URL` to this helper. Added a hard public fallback of `https://shoptool.mn` for web normalization and server upload URL generation.
- Third deploy smoke showed the runtime `NEXT_PUBLIC_SITE_URL` itself can be an ALB URL. Added an ALB-host guard so `.elb.amazonaws.com` is never used as the public media origin; it falls back to `https://shoptool.mn`.
- Follow-up verification:
  - `npm run test --workspace @diy-store/web -- vendure-session.test.ts --runInBand`: passed, 3 tests.
  - `npm run build --workspace @diy-store/server`: passed.
- Deployment:
  - Pushed supplier media fixes through commits `78abb39`, `e5e96de`, `86a8127`, and final ALB-origin guard `804ddc0`.
  - CI run `27898620550`: success.
  - Deploy Production run `27898619943`: success.
- Production smoke after final deploy:
  - `https://shoptool.mn/suppliers/odbayar` renders cover and poster image sources through `https://shoptool.mn/assets/...`.
  - Cover and poster Next image optimizer URLs returned 200 `image/png`.
  - `Онцлох сурталчилгаа` is present.
  - Note: the page still contains an unrelated ALB URL in `og:image` metadata for `og-default.png`; visible supplier media no longer uses ALB for raw profile assets.
- Remaining next step: optional follow-up to normalize site metadata base if needed.

### 2026-06-21 - CloudFront supplier media URL rewrite

- User reported cover/logo still broken after upload while poster rendered.
- Production API showed newly uploaded cover/logo were saved as CloudFront URLs (`https://d2tf7pwvqo3y9.cloudfront.net/assets/...`), but direct CloudFront requests returned 403 and Next image optimization returned 403 `upstream response is invalid`.
- The same asset paths worked through `https://shoptool.mn/assets/...`.
- Updated `apps/web/src/lib/vendure.ts` to rewrite absolute CloudFront/ALB asset URLs containing `/assets/...` through the public `https://shoptool.mn/assets/...` route.
- Updated `apps/server/src/plugins/supplier/supplier.resolver.ts` so future uploaded asset URLs are normalized the same way before being returned for persistence.
- Added a regression test for CloudFront asset URL rewriting.
- Verification:
  - `npm run test --workspace @diy-store/web -- vendure-session.test.ts --runInBand`: passed, 4 tests.
  - `npm run build --workspace @diy-store/server`: passed.
- Deployment:
  - Commit `d31fa4e fix(supplier): rewrite private cdn media urls` pushed to `dev`.
  - CI run `27899524705`: success.
  - Deploy Production run `27899523990`: success.
- Production smoke after deploy:
  - `/suppliers/odbayar` no longer emits the broken CloudFront cover/logo URLs.
  - Cover and logo now emit `https://shoptool.mn/assets/...` URLs.
  - Cover and logo Next image optimizer URLs returned 200 `image/png`.
  - Poster section remains present.

### 2026-06-21 - Review of completed supplier profile work

- Reviewed current branch `dev` at `392ced3`; supplier profile/auth/media implementation is already committed and pushed in `ea0dd14`, with deployment notes recorded in `392ced3`.
- No code changes were made during this review.
- Current uncommitted changes remain unrelated generated/local files:
  - `apps/mobile-customer/.expo/types/router.d.ts`
  - `apps/mobile-customer/android/`
  - `tmp/`
- Verification run during review:
  - `npm run test --workspace @diy-store/web -- vendure-session.test.ts --runInBand`: passed, 3 tests.
  - `npm run build --workspace @diy-store/web`: passed; `/suppliers/[slug]` is dynamic (`ƒ`).
  - `npm run lint --workspace @diy-store/web`: passed with 0 errors and 85 existing warnings.
  - `http://localhost:18080/suppliers/odbayar`: 200; poster/products present; no raw `vendure-assets` image source found.
  - `https://shoptool.mn/suppliers/odbayar`: 200; poster/products present; no raw `vendure-assets` image source found.
- Review note: `apps/mobile-customer/.expo/types/router.d.ts` currently contains a generated `/../components/AnimatedSplash` route. This is unrelated to the supplier work, but should be cleaned/regenerated by whoever owns the mobile generated files.

### 2026-06-21 - Production release `ea0dd14`

- Committed supplier profile/auth/media work as `ea0dd14 feat(supplier): publish store profile media` and pushed `dev`.
- Local release gates passed: 102 tests, server/web lint with 0 errors, server/web production build, and production compose config validation.
- GitHub CI run `27896349699` completed successfully.
- GitHub Deploy Production run `27896349080` completed successfully in 17m28s and updated AWS ECS.
- Production smoke tests passed on `https://shoptool.mn`:
  - Homepage Odbayar supplier card displays the real logo and links to the supplier profile.
  - `/suppliers` displays the real Odbayar cover and logo.
  - `/suppliers/odbayar` displays the featured poster and 3 products.
  - Browser console errors: 0; raw `vendure-assets/...` image sources: 0.
- Unrelated local mobile generated files and `tmp/` remain intentionally uncommitted.

### 2026-06-21 - Public poster freshness

- AWS API confirmed Odbayar supplier `13` has one saved `posterUrls` entry; persistence was not the problem.
- Root cause was stale public rendering: `supplierBySlug` used ISR revalidation and the route still exported an empty `generateStaticParams()`, so Next classified `/suppliers/[slug]` as SSG and could serve the old empty poster response on the first visit.
- `getDbSupplierBySlug()` now uses `revalidate: 0`, and the empty `generateStaticParams()` hook was removed so the public profile is truly dynamic.
- Local verification passed:
  - Targeted ESLint, `tsc --noEmit`, and production build passed.
  - Build now reports `/suppliers/[slug]` as dynamic (`ƒ`), not SSG (`●`).
  - `/suppliers/odbayar` rendered the `Постерууд` tab, `Онцлох сурталчилгаа`, and the saved poster on the first completed render.
  - Poster resolved through `https://shoptool.mn/assets/...`; browser console errors: 0; raw asset URLs: 0.
- No commit, push, or deploy is authorized for this work yet.

### 2026-06-21 - Public store profile and supplier media

- `apps/web/src/app/suppliers/[slug]/page.tsx` now renders the supplier preview's public-facing hero, logo, profile details, contact action, tabs, optional YouTube/poster sections, and real product grid.
- `SupplierCard` and `dbSupplierToCard()` now carry `coverImage`; `/suppliers` renders each store's real cover and logo instead of a generic emoji.
- The homepage `Дэлгүүрүүд` section now renders the real supplier logo and continues linking each card to `/suppliers/[slug]`.
- Missing YouTube/poster data is intentionally omitted from the public page; the sections appear automatically after the supplier saves those fields.
- Local verification passed against the AWS RDS-backed production API through `http://localhost:18080`:
  - Targeted ESLint and `tsc --noEmit`: passed.
  - Web production build: passed.
  - Homepage: Odbayar card rendered its normalized image and linked to `/suppliers/odbayar`.
  - `/suppliers`: Odbayar rendered both cover and logo.
  - `/suppliers/odbayar`: cover, logo, contact action, and 3 product cards rendered.
  - Browser console errors: 0; raw `vendure-assets/...` image sources: 0.
- No commit, push, or deploy is authorized for this work yet.

### 2026-06-21 - Supplier profile recovery

- Another agent added a safeguard in `apps/web/src/lib/vendure.ts` so Vendure session headers do not overwrite platform JWTs.
- Codex preserved that work and added a dedicated supplier token, stale-token redirect, S3/Vendure asset URL normalization, and a 3-second profile refresh/cache target.
- Crash evidence: `next/image` rejected `vendure-assets/preview/...` because it had no leading slash or absolute origin.
- Added `resolveVendureAssetUrl()` and applied it to supplier cover, logo, posters, and profile product images.
- Supplier JWT now uses `diy-supplier-auth-token`; valid legacy supplier JWTs migrate automatically and invalid/expired sessions return to login instead of producing repeated token errors.
- Public supplier profile data uses a 3-second revalidation target; successful profile updates refresh immediately and prefetch the public profile again at 3 seconds.
- Local verification passed:
  - `vendure-session.test.ts`: 3 tests passed.
  - Targeted ESLint and TypeScript: passed.
  - Web production build: passed.
  - Browser: `/supplier/store-profile` rendered with zero runtime errors and zero raw `vendure-assets/...` image sources.
  - Browser: public `Odbayar` cover resolved through `https://shoptool.mn/assets/...`.
- No commit, push, or deploy is authorized for this work yet.

## Next Agent Checklist

1. Read the current `git diff` before changing auth or profile media code.
2. Preserve the uncommitted token safeguard and asset-normalization work in `apps/web/src/lib/vendure.ts`.
3. Ask for user review of the local page before any commit/push/deploy.
4. Update this handoff with any further edits and test evidence.
