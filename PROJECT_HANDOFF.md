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

## Latest Handoff

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
