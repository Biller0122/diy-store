# DIY Store

Production-grade, multi-surface e-commerce monorepo for DIY retail operations. The platform runs one backend commerce API and four distinct web portals on AWS ECS Fargate, with a single Application Load Balancer entry point and CloudFront-backed media delivery.

## Architecture Overview

```text
Internet
   |
   v
Application Load Balancer: diy-store-alb
   |
   |-- /health -----------------------> ECS: diy-store-server
   |-- /shop-api/* -------------------> ECS: diy-store-server
   |-- /admin-api/* ------------------> ECS: diy-store-server
   |
   |-- / -----------------------------> ECS: diy-store-web-customer
   |-- /admin/* ----------------------> ECS: diy-store-web-admin
   |-- /driver/* ---------------------> ECS: diy-store-web-driver
   |-- /supplier/* -------------------> ECS: diy-store-web-merchant
   |
   v
RDS PostgreSQL 16 + S3 assets via CloudFront
```

### AWS Production Resources

| Layer | Resource |
| --- | --- |
| Region | `ap-southeast-1` |
| VPC | `vpc-06aa654ba26bb3bc9` |
| Subnets | `subnet-03ad2abad464b963f`, `subnet-08a2425675adabb4e`, `subnet-0a66503b5d195b404` |
| Database | RDS PostgreSQL 16 |
| Backend ECS service | `diy-store-server` |
| Backend ECR repository | `diy-store-server` |
| Backend task definition | `diy-store-server:3` with `ASSET_URL_PREFIX` |
| Customer portal | `diy-store-web-customer` -> `diy-web-customer-tg` |
| Admin portal | `diy-store-web-admin` -> `diy-web-admin-tg` |
| Driver portal | `diy-store-web-driver` -> `diy-web-driver-tg` |
| Merchant portal | `diy-store-web-merchant` -> `diy-web-merchant-tg` |
| Asset bucket | `diy-store-prod-assets-235951409953-ap-southeast-1` |
| CloudFront OAC | `E1FNPS04P6G8U9` |
| Asset CDN | `https://d2tf7pwvqo3y9.cloudfront.net/` |
| Secrets | AWS SSM Parameter Store with dotenv-style parsing |

## Monorepo Layout

The recommended production layout for this repository is:

```text
diy-store/
|-- apps/
|   |-- server/              # Vendure/NestJS commerce API and plugins
|   |-- web/                 # Next.js portal codebase
|   |-- realtime-server/     # Realtime/order dispatch service
|   |-- cms/                 # Strapi CMS
|   |-- mobile-customer/     # Expo customer mobile app
|   |-- mobile-driver/       # Expo driver mobile app
|   `-- mobile-supplier/     # Expo supplier mobile app
|-- packages/
|   |-- api-client/          # Shared API client and hooks
|   |-- types/               # Shared TypeScript types
|   `-- ui/                  # Shared UI primitives/theme
|-- deploy/
|   `-- aws/                 # AWS deployment scripts and operational notes
|-- docs/                    # Architecture diagrams and long-form docs
|-- .github/
|   `-- workflows/           # CI/CD workflows
|-- docker-compose*.yml      # Local and legacy compose environments
|-- turbo.json               # Turborepo task pipeline
|-- package.json             # Root workspace scripts
|-- progress.md              # Deployment and operations changelog
`-- README.md
```

Future infrastructure-as-code should live under `deploy/aws/terraform/`, `deploy/aws/cdk/`, or `infra/aws/`. Pick one convention and keep runtime scripts, generated outputs, and secrets separate.

## Services

| Service | Type | Purpose | Production route |
| --- | --- | --- | --- |
| `apps/server` | Backend API | Vendure commerce, auth, orders, suppliers, payments, assets | `/health`, `/shop-api`, `/admin-api` |
| `apps/web` | Next.js | Customer, admin, driver, and merchant portal runtime | `/`, `/admin`, `/driver`, `/supplier` |
| `apps/realtime-server` | Node service | Realtime coordination and dispatch workflows | Internal/service dependent |
| `apps/cms` | Strapi | CMS/admin content support | Local or future production integration |
| `apps/mobile-*` | Expo | Mobile customer, driver, and supplier clients | Mobile builds |

## Local Development

Install dependencies from the repository root:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env
```

Start the local stack:

```bash
docker compose up -d
npm run dev
```

Useful root scripts:

```bash
npm run build
npm run lint
npm test
npm run test:coverage
```

Typical local endpoints:

| Surface | URL |
| --- | --- |
| Customer portal | `http://localhost:3000` |
| Vendure shop API | `http://localhost:3001/shop-api` |
| Vendure admin API | `http://localhost:3001/admin-api` |
| CMS | `http://localhost:1337` |

## Environment Variables

Never commit real `.env` files. Commit only examples such as `.env.example`, `.env.production.example`, and `.env.aws-local.example`.

### Backend API

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port, usually `3001` |
| `DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection |
| `DB_SYNCHRONIZE` | First-boot schema sync flag; disable after schema is created |
| `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD` | Vendure superadmin credentials |
| `COOKIE_SECRET` | Long random cookie signing secret |
| `STOREFRONT_URL` | Public storefront URL |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins |
| `REDIS_URL` | Redis connection string |
| `ASSET_STORAGE` | `s3` in production |
| `S3_BUCKET`, `S3_REGION`, `S3_PREFIX` | S3 asset storage settings |
| `ASSET_URL_PREFIX` | CloudFront asset prefix, currently `https://d2tf7pwvqo3y9.cloudfront.net/` |

### Web Portals

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_VENDURE_SHOP_API` | Browser-facing shop API URL or path |
| `NEXT_PUBLIC_VENDURE_ADMIN_API` | Browser-facing admin API URL or path |
| `NEXT_PUBLIC_SITE_URL` | Public site URL |
| `NEXT_PUBLIC_SOCKET_URL` | Public realtime/socket URL when enabled |
| `NEXT_PUBLIC_STRAPI_URL` | CMS URL |
| `STRAPI_API_TOKEN` | CMS API token |

### Integrations

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Transactional email and OTP delivery |
| `QPAY_*`, `MONPAY_*`, `CARD_PSP_*` | Payment provider credentials |
| `PAYMENT_MOCK_MODE`, `OTP_MOCK_MODE`, `FIREBASE_MOCK_MODE`, `ALGOLIA_MOCK_MODE` | Mock-mode switches for private smoke tests |
| `ALGOLIA_APP_ID`, `ALGOLIA_ADMIN_KEY`, `NEXT_PUBLIC_ALGOLIA_*` | Search integration |
| `REALTIME_WEBHOOK_SECRET` | Shared secret for realtime webhooks |

## Deployment Notes

The verified production runtime is ECS Fargate behind `diy-store-alb`.

CI/CD is documented in [docs/CI_CD.md](docs/CI_CD.md). Beginner contribution
steps are documented in
[docs/CONTRIBUTING_FOR_BEGINNERS.md](docs/CONTRIBUTING_FOR_BEGINNERS.md).
GitHub-to-AWS OIDC setup is documented in
[docs/GITHUB_AWS_OIDC.md](docs/GITHUB_AWS_OIDC.md).

Recommended CI/CD direction:

1. Build and test all affected workspaces with Turborepo.
2. Build Docker images for `apps/server` and the web service image.
3. Push images to ECR.
4. Render or register ECS task definitions.
5. Update ECS services and wait for stability.
6. Run smoke checks against `/health`, `/shop-api`, `/`, `/admin`, `/driver`, and `/supplier`.

## Git Workflow

Use a simple protected-branch model:

| Branch | Purpose |
| --- | --- |
| `main` | Production branch. Only merge reviewed, tested changes. |
| `develop` | Integration branch for upcoming release work. |
| `feature/<name>` | Feature branches from `develop`. |
| `fix/<name>` | Bug fix branches. |
| `release/<version>` | Optional release stabilization branch. |
| `hotfix/<name>` | Urgent production fixes from `main`. |

Recommended protections:

- Require pull requests into `main`.
- Require CI checks for build, lint, unit tests, and security scanning.
- Require at least one approval for production-impacting changes.
- Protect `.github/workflows/**`, `deploy/**`, Dockerfiles, and environment examples with CODEOWNERS review.
- Use GitHub Environments for `staging` and `production` deployment approvals.

## Security Rules

- Store production secrets in AWS SSM Parameter Store or GitHub Actions secrets.
- Do not commit `.env`, AWS credential files, private keys, task definition outputs containing secrets, or generated deployment artifacts.
- Prefer IAM roles for ECS task permissions instead of static AWS keys.
- Keep S3 Block Public Access enabled; CloudFront should read assets through OAC.
- Rotate any secret that has ever appeared in logs, screenshots, commits, or chat.

## Verified Production Smoke Tests

Current production checks from `progress.md`:

- Backend health endpoint is live at `/health`.
- ALB routes API paths to `diy-store-server`.
- ALB routes `/`, `/admin`, `/driver`, and `/supplier` to their respective web services.
- S3 assets are private and delivered through CloudFront OAC.
- Vendure asset URLs use `ASSET_URL_PREFIX` and resolve through CloudFront.
