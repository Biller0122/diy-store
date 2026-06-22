# DIY Store Production Progress

This file tracks production infrastructure milestones, verification checks, and next operational tasks. Keep entries concise, dated, and evidence-based.

## Current Production Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Network | Complete | VPC `vpc-06aa654ba26bb3bc9`; subnets `subnet-03ad2abad464b963f`, `subnet-08a2425675adabb4e`, `subnet-0a66503b5d195b404` |
| Database | Complete | RDS PostgreSQL 16 |
| Backend | Complete | ECS service `diy-store-server`; ECR `diy-store-server`; task definition `diy-store-server:16`; static outbound IP `47.131.110.129` |
| Web portals | Complete | Customer, admin, driver, and merchant ECS services are live on task definition revision `24` |
| Routing | Complete | ALB `diy-store-alb` routes API and portal paths |
| Assets | Complete | S3 bucket + CloudFront OAC serving Vendure assets |
| Secrets | Complete | AWS SSM Parameter Store with dotenv parsing |
| CI/CD | Prepared | Legacy SSH workflow replaced with GitHub Actions CI and ECS/ECR deploy workflow; needs GitHub AWS OIDC role/variables before first production run |
| Custom domains/TLS | Complete | `shoptool.mn` and `www.shoptool.mn` are live on HTTPS through the ALB |

## Verified AWS Resources

### Network

- VPC: `vpc-06aa654ba26bb3bc9`
- ECS/RDS subnets:
  - `subnet-03ad2abad464b963f`
  - `subnet-08a2425675adabb4e`
  - `subnet-0a66503b5d195b404`
- Private backend ECS subnets:
  - `subnet-0e2f381379ebe607d`
  - `subnet-08407e546da9746d1`
  - `subnet-037ce35e3e53d93b8`
- Backend outbound NAT gateway: `nat-08366329e697ee4e9`
- Backend static outbound IP: `47.131.110.129`
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

### 2026-06-09 - shoptool.mn DNS Prepared

**Changed**

- Confirmed Route 53 hosted zone `Z08226412DIQUXOLSSNJJ` for `shoptool.mn`.
- Requested ACM certificate `arn:aws:acm:ap-southeast-1:235951409953:certificate/3b461dfd-ecce-414e-88f0-e44f69634f46` for `shoptool.mn` and `www.shoptool.mn`.
- Added ACM DNS validation CNAME records in Route 53.
- Added `shoptool.mn` and `www.shoptool.mn` A/alias records to `diy-store-alb`.
- Allowed HTTPS `443` from the internet on the ALB security group.

**Verified**

- Route 53 change `/change/C0085572114NQ1XTB4Q5N` reached `INSYNC`.
- Route 53 authoritative nameserver returns the root and `www` ALB aliases.
- Public ALB health still returns `200 OK`.

**Blocked**

- Public `.mn` delegation does not yet point to Route 53. Set the registrar
  nameservers to `ns-1838.awsdns-37.co.uk`, `ns-1390.awsdns-45.org`,
  `ns-362.awsdns-45.com`, and `ns-639.awsdns-15.net`.
- ACM certificate remains `PENDING_VALIDATION` until public DNS delegation is
  complete.

**Next**

- After the certificate becomes `ISSUED`, add the ALB HTTPS listener and change
  the HTTP listener to redirect to HTTPS.

### 2026-06-11 - shoptool.mn HTTPS Live

**Changed**

- ACM certificate for `shoptool.mn` and `www.shoptool.mn` became `ISSUED`.
- Added ALB HTTPS listener on `443` with the `shoptool.mn` certificate.
- Removed old HTTP forwarding rules and changed HTTP `80` to redirect to HTTPS.

**Verified**

- `https://shoptool.mn/health` returns `200`.
- `https://www.shoptool.mn/health` returns `200`.
- `http://shoptool.mn/health` returns `301` to HTTPS.

### 2026-06-11 - Supplier Product Image Cleanup Deployed

**Changed**

- Added supplier product image action `Зураг янзлах`.
- The action detects the main product from the uploaded photo, replaces the
  surrounding area with a white background, centers the product, and lightly
  normalizes phone-camera shadows.
- Added `/edit-product-image` web route and `/edit-product-photo` AI image
  service endpoint for server-side image cleanup support.
- Built and pushed web image
  `235951409953.dkr.ecr.ap-southeast-1.amazonaws.com/diy-store-web:shoptool-image-edit-20260611182446`.
- Updated customer, admin, driver, and merchant web ECS services to task
  definition revision `14`.
- Updated web runtime URLs to use `https://shoptool.mn`.

**Verified**

- Python image service syntax check passed.
- Targeted ESLint passed for the supplier product form and image edit route.
- Docker production web build completed successfully.
- ECS web services reached steady state with `1 / 1` running tasks.
- Smoke checks: `/health` `200`, `/` `200`, `/driver` `200`, `/supplier` `200`;
  `/admin` and `/supplier/products/new` redirect as expected for protected
  routes.

### 2026-06-11 - QPay Static Backend Outbound IP

**Changed**

- Allocated Elastic IP `47.131.110.129`
  (`eipalloc-0e7ae5e276f30f320`) for payment-provider whitelisting.
- Created NAT gateway `nat-08366329e697ee4e9` in public subnet
  `subnet-03ad2abad464b963f`.
- Created private ECS subnets `subnet-0e2f381379ebe607d`,
  `subnet-08407e546da9746d1`, and `subnet-037ce35e3e53d93b8`.
- Created private route table `rtb-0e9ee3ae9051dcfb6` with default route to
  the NAT gateway.
- Updated `diy-store-server` to run in private subnets with
  `assignPublicIp=DISABLED`.

**Verified**

- ECS backend deployment completed with `1 / 1` running tasks.
- Backend task ENI `eni-09bb36a6d6490b682` has private IP `172.31.90.33` and no
  public IP.
- ALB target `172.31.90.33:3001` is healthy.
- `https://shoptool.mn/health` returns `200`.

### 2026-06-11 - Supplier Product Image Edit Modes

**Changed**

- Changed supplier product `Зураг янзлах` into a two-option menu:
  `Энгийн` and `AI-аар`.
- `Энгийн` now calls `/edit-product-image` with `mode: "simple"`. The web
  route runs BiRefNet-Lite ONNX on CPU, places the product on a white
  background, and adds the Shoptool logo at the bottom as white text with a
  black outline.
- `AI-аар` keeps the previous AI cleanup behavior through the same server
  route.
- Whitelisted `/edit-product-image` and `/generate-pattern` in the web portal
  proxy so supplier portal calls reach the app routes in ECS.
- Built and pushed web image
  `235951409953.dkr.ecr.ap-southeast-1.amazonaws.com/diy-store-web:shoptool-image-onnx-fast1024-20260611233541`.
- Updated customer, admin, driver, and merchant web ECS services to task
  definition revision `24` with `2048` CPU units and `8192` MiB memory.
- Set production ONNX runtime environment to `BIREFNET_ONNX_INPUT_SIZE=1024`,
  `BIREFNET_ONNX_OPTIMIZATION=basic`, and `BIREFNET_ONNX_THREADS=2`.

**Verified**

- Python syntax check passed for `apps/ai-image/service.py`.
- Python syntax check passed for `apps/web/scripts/simple_image_edit.py`.
- Targeted ESLint passed for the supplier product form, image edit route, and
  proxy.
- Docker-independent production web build passed.
- Container smoke test for `apps/web/scripts/simple_image_edit.py` returned a
  JPEG data URL with engine `birefnet-lite-onnx-cpu`.
- Public production POST to `https://shoptool.mn/edit-product-image` with
  `mode: "simple"` returned a JPEG data URL from engine
  `birefnet-lite-onnx-cpu` in `25.1328` seconds.
- ECS web services reached steady state with `1 / 1` running tasks on revision
  `24`.

## Upcoming Work

| Priority | Task | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| P0 | Replace legacy SSH GitHub Actions deploy with ECS/ECR pipeline | TBD | Prepared | Build, push, register task definitions, update ECS services; requires GitHub environment setup |
| P0 | Add production branch protections | TBD | Not started | Protect `main`; require tests and review |
| P1 | Configure custom domains and ACM certificates | TBD | Complete | `shoptool.mn` and `www.shoptool.mn` are covered |
| P1 | Add ALB HTTPS listener and redirect HTTP to HTTPS | TBD | Complete | HTTP redirects to HTTPS |
| P1 | Add Route 53 records | TBD | Complete | Root and `www` aliases point to ALB |
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
