# DIY Store Production Progress

This file tracks production infrastructure milestones, verification checks, and next operational tasks. Keep entries concise, dated, and evidence-based.

## Current Production Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Network | Complete | VPC `vpc-06aa654ba26bb3bc9`; subnets `subnet-03ad2abad464b963f`, `subnet-08a2425675adabb4e`, `subnet-0a66503b5d195b404` |
| Database | Complete | RDS PostgreSQL 16 |
| Backend | Complete | ECS service `diy-store-server`; ECR `diy-store-server`; task definition `diy-store-server:3` |
| Web portals | Complete | Customer, admin, driver, and merchant ECS services are live |
| Routing | Complete | ALB `diy-store-alb` routes API and portal paths |
| Assets | Complete | S3 bucket + CloudFront OAC serving Vendure assets |
| Secrets | Complete | AWS SSM Parameter Store with dotenv parsing |
| CI/CD | Prepared | Legacy SSH workflow replaced with GitHub Actions CI and ECS/ECR deploy workflow; needs GitHub AWS OIDC role/variables before first production run |
| Custom domains/TLS | Pending | ALB DNS is live; custom domain mapping remains next step |

## Verified AWS Resources

### Network

- VPC: `vpc-06aa654ba26bb3bc9`
- ECS/RDS subnets:
  - `subnet-03ad2abad464b963f`
  - `subnet-08a2425675adabb4e`
  - `subnet-0a66503b5d195b404`
- ECS task security group: `sg-073a55a1844cf12cb`
- ALB security group: `sg-077e08e8cfb383615`
- RDS security group rule: `sg-0bf36e8328825ae79` allows ECS task security group on `5432`

### Backend

- ECS cluster: `diy-store-prod`
- ECS service: `diy-store-server`
- ECR repository: `diy-store-server`
- Target group: `diy-store-server-tg`
- Current task definition: `diy-store-server:3`
- Health check: `/health`
- Asset integration: `ASSET_URL_PREFIX` enabled

### Frontend Portals

| Portal | ECS service | Target group | Route |
| --- | --- | --- | --- |
| Customer | `diy-store-web-customer` | `diy-web-customer-tg` | `/` |
| Admin | `diy-store-web-admin` | `diy-web-admin-tg` | `/admin` |
| Driver | `diy-store-web-driver` | `diy-web-driver-tg` | `/driver` |
| Merchant | `diy-store-web-merchant` | `diy-web-merchant-tg` | `/supplier` |

### Storage and CDN

- S3 bucket: `diy-store-prod-assets-235951409953-ap-southeast-1`
- CloudFront OAC: `E1FNPS04P6G8U9`
- CloudFront distribution: `E1QGM0D0IOKIA5`
- Asset domain: `https://d2tf7pwvqo3y9.cloudfront.net/`
- Bucket policy: CloudFront read access enabled through OAC
- ECS task role: S3 asset bucket access verified

## Production Verification

| Check | Result |
| --- | --- |
| Public backend health | OK: `http://diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com/health` |
| Customer route | OK: `/` |
| Admin route | OK: `/admin` |
| Driver route | OK: `/driver` |
| Merchant route | OK: `/supplier` |
| Shop API route | OK: `/shop-api` |
| Health route | OK: `/health` |
| S3 asset write from ECS | OK |
| CloudFront asset read | OK |
| Vendure CloudFront asset prefix | OK |

## Milestone Log

### 2026-06-05 - ECS, ALB, and CDN Production Deployment

- Created RDS PostgreSQL 16.
- Created ECR repository `diy-store-server`.
- Created SSM production parameters and fixed DB password parsing with dotenv behavior.
- Created ECS task IAM roles.
- Registered initial ECS task definition.
- Created ECS cluster `diy-store-prod`.
- Created ECS task security group `sg-073a55a1844cf12cb`.
- Allowed ECS tasks to reach RDS on port `5432`.
- Created ALB `diy-store-alb` and ALB security group `sg-077e08e8cfb383615`.
- Created backend target group `diy-store-server-tg`.
- Created ECS backend service `diy-store-server`.
- Verified public health endpoint.
- Created S3 asset bucket `diy-store-prod-assets-235951409953-ap-southeast-1`.
- Verified ECS task role access to the S3 asset bucket.
- Registered `diy-store-server:2` with S3 assets.
- Redeployed backend and verified health.
- Created CloudFront OAC `E1FNPS04P6G8U9`.
- Created CloudFront distribution `E1QGM0D0IOKIA5`.
- Added S3 bucket policy for CloudFront read access.
- Added Vendure `assetUrlPrefix` support through `ASSET_URL_PREFIX`.
- Registered `diy-store-server:3` with CloudFront asset prefix.
- Redeployed backend and verified health.
- Created web ECR repository/image `diy-store-web`.
- Allowed CloudFront remote assets in Next.js config.
- Created web task security group `sg-035dc2b5ce02a41d8`.
- Created ECS web services:
  - `diy-store-web-customer`
  - `diy-store-web-admin`
  - `diy-store-web-driver`
  - `diy-store-web-merchant`
- Created web target groups:
  - `diy-web-customer-tg`
  - `diy-web-admin-tg`
  - `diy-web-driver-tg`
  - `diy-web-merchant-tg`
- Configured ALB routes for API paths and portal paths.
- Verified frontend deployment through ALB.

## Upcoming Work

| Priority | Task | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| P0 | Replace legacy SSH GitHub Actions deploy with ECS/ECR pipeline | TBD | Prepared | Build, push, register task definitions, update ECS services; requires GitHub environment setup |
| P0 | Add production branch protections | TBD | Not started | Protect `main`; require tests and review |
| P1 | Configure custom domains and ACM certificates | TBD | Not started | Customer/admin/driver/merchant domains |
| P1 | Add ALB HTTPS listener and redirect HTTP to HTTPS | TBD | Not started | Requires ACM cert |
| P1 | Add Route 53 records | TBD | Not started | Alias records to ALB |
| P1 | Add deployment smoke-test workflow | TBD | Not started | Verify `/health`, `/shop-api`, `/`, `/admin`, `/driver`, `/supplier` |
| P2 | Add infrastructure-as-code | TBD | Not started | Terraform or AWS CDK |
| P2 | Add ECS autoscaling policy | TBD | Not started | CPU/memory/request-count based |
| P2 | Add CloudWatch dashboards and alarms | TBD | Not started | ALB 5xx, ECS CPU/memory, RDS storage/connections |
| P2 | Add committed migration workflow | TBD | Not started | Disable schema sync after migration strategy is in place |

### 2026-06-06 - CI/CD and beginner workflow prepared

**Changed**

- Replaced legacy SSH/Docker Compose GitHub Actions deployment with ECS/ECR production deployment workflow.
- Added separate CI workflow for pull request build, lint, and test checks.
- Added beginner contribution and CI/CD documentation.
- Added root `build:prod` and `test:ci` scripts for deployable apps.
- Added Turbo test task definitions.
- Created AWS IAM OIDC provider and deploy role `arn:aws:iam::235951409953:role/diy-store-github-production-deploy`.

**Verified**

- Workflow files are present in `.github/workflows/`.
- CI/CD documentation points at the current ECS/Fargate production shape.
- AWS deploy role trust is restricted to `repo:Biller0122/diy-store:environment:production`.

**Issues / Risks**

- First production workflow run requires GitHub `production` environment setup, `AWS_DEPLOY_ROLE_ARN`, and AWS OIDC trust/policy configuration.
- ECS container name variables may need adjustment if the current task definitions do not use `server` and `web`.

**Next**

- Create the GitHub AWS OIDC role and production environment variables, then run `Deploy Production` manually once with backend and web forced.

## Changelog Entry Template

Copy this block for future updates:

```md
### YYYY-MM-DD - Short milestone title

**Changed**

- 

**Verified**

- 

**Issues / Risks**

- 

**Next**

- 
```
