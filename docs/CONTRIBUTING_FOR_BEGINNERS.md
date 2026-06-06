# Beginner Contribution Guide

This guide is for teammates who can edit the DIY Store platform but do not have
production deployment experience.

## Golden Rule

Never edit production directly. Make changes in a branch, open a pull request,
and let GitHub Actions deploy after the pull request is merged.

## What Lives Where

| Area | Path | What to change there |
| --- | --- | --- |
| Customer/admin/driver/supplier web pages | `apps/web` | Screens, forms, portal UI, browser behavior |
| Commerce backend | `apps/server` | Products, orders, Vendure plugins, API behavior |
| Shared UI | `packages/ui` | Reusable UI components and theme |
| Shared types | `packages/types` | TypeScript types shared across apps |
| Shared API helpers | `packages/api-client` | API client hooks and query helpers |
| Mobile apps | `apps/mobile-*` | Expo mobile app screens |
| Deployment notes | `progress.md`, `docs/CI_CD.md` | Production status and deployment instructions |

## Safe Change Flow

1. Pull latest code:

```bash
git checkout main
git pull
```

2. Create a branch:

```bash
git checkout -b feature/change-name
```

3. Make your changes.

4. Run checks:

```bash
npm run lint
npm run build:prod
npm run test:ci
```

5. Commit and push:

```bash
git add .
git commit -m "Describe the change"
git push origin feature/change-name
```

6. Open a pull request into `main`.

7. Wait for the `CI` workflow to pass.

8. Merge only after review.

9. Watch the `Deploy Production` workflow.

## What Deploys After Merge

| If you changed | What redeploys |
| --- | --- |
| `apps/server` | Backend API |
| `apps/web` | All four web portals |
| `packages/*` | Backend and web portals |
| Docs only | Nothing deploys |

## Do Not Commit These

- `.env`
- `.env.production`
- `.env.aws-local`
- AWS credentials
- private keys
- task definition output files
- test reports
- build folders such as `.next`, `dist`, `coverage`

## When Something Breaks

Pause and collect facts:

- Which workflow failed?
- Which step failed?
- Did CI fail before deploy, or did deploy fail after merge?
- Is `/health` still working?
- Did only web change, only backend change, or both?

Then ask for help with the workflow link and the failed step name.
