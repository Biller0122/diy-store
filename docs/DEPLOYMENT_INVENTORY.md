# DIY Store Deployment Inventory

Last verified: 2026-06-11

This file answers: what is deployed, where it is deployed, and what each
resource does. Do not put secret values in this file.

## Account And Region

| Item | Value |
| --- | --- |
| AWS account | `235951409953` |
| AWS region | `ap-southeast-1` |
| GitHub repository | `Biller0122/diy-store` |
| Production branch | `main` |

## Public Entry Points

| Surface | URL / Route | Routed to |
| --- | --- | --- |
| Main ALB DNS | `http://diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com` | Application Load Balancer |
| Primary domain | `https://shoptool.mn` | Route 53 alias to ALB |
| WWW domain | `https://www.shoptool.mn` | Route 53 alias to ALB |
| Customer storefront | `/` | `diy-store-web-customer` |
| Admin portal | `/admin` | `diy-store-web-admin` |
| Driver portal | `/driver` | `diy-store-web-driver` |
| Supplier / merchant portal | `/supplier` | `diy-store-web-merchant` |
| Backend health | `/health` | `diy-store-server` |
| Vendure shop API | `/shop-api` | `diy-store-server` |
| Vendure admin API | `/admin-api` | `diy-store-server` |
| Vendure assets through backend | `/assets` | `diy-store-server` |
| Vendure mailbox | `/mailbox` | `diy-store-server` |
| Asset CDN | `https://d2tf7pwvqo3y9.cloudfront.net/` | CloudFront -> private S3 bucket |

`shoptool.mn` DNS is delegated to Route 53. HTTPS is live on the ALB, and HTTP
redirects to HTTPS.

## Network

| Resource | Value |
| --- | --- |
| VPC | `vpc-06aa654ba26bb3bc9` |
| Public subnets | `subnet-03ad2abad464b963f`, `subnet-08a2425675adabb4e`, `subnet-0a66503b5d195b404` |
| Private ECS subnets | `subnet-0e2f381379ebe607d`, `subnet-08407e546da9746d1`, `subnet-037ce35e3e53d93b8` |
| Private ECS route table | `rtb-0e9ee3ae9051dcfb6` |
| Backend outbound NAT gateway | `nat-08366329e697ee4e9` |
| Backend static outbound IP | `47.131.110.129` |
| Backend outbound Elastic IP allocation | `eipalloc-0e7ae5e276f30f320` |
| ALB security group | `sg-077e08e8cfb383615` |
| ECS backend task security group | `sg-073a55a1844cf12cb` |
| Web task security group | `sg-035dc2b5ce02a41d8` |
| RDS security group | `sg-0bf36e8328825ae79` |

The backend ECS service runs in private subnets with `assignPublicIp=DISABLED`.
Outbound calls from the backend, including QPay API calls, leave through the
NAT gateway and should appear as `47.131.110.129`.

## Load Balancer

| Item | Value |
| --- | --- |
| ALB name | `diy-store-alb` |
| ALB DNS | `diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com` |
| ALB type | Internet-facing Application Load Balancer |
| Listeners | HTTP `80` redirects to HTTPS; HTTPS `443` forwards app traffic |
| ALB ARN | `arn:aws:elasticloadbalancing:ap-southeast-1:235951409953:loadbalancer/app/diy-store-alb/8a56d0cadcdb42d2` |

## Domain And TLS

| Item | Value |
| --- | --- |
| Domain | `shoptool.mn` |
| Route 53 hosted zone | `Z08226412DIQUXOLSSNJJ` |
| Route 53 nameservers | `ns-1838.awsdns-37.co.uk`, `ns-1390.awsdns-45.org`, `ns-362.awsdns-45.com`, `ns-639.awsdns-15.net` |
| Root DNS record | `shoptool.mn` A/alias -> `diy-store-alb` |
| WWW DNS record | `www.shoptool.mn` A/alias -> `diy-store-alb` |
| ACM certificate | `arn:aws:acm:ap-southeast-1:235951409953:certificate/3b461dfd-ecce-414e-88f0-e44f69634f46` |
| Certificate names | `shoptool.mn`, `www.shoptool.mn` |
| Certificate status | `ISSUED` |
| ALB security group | Allows HTTP `80` and HTTPS `443` from the internet |

The helper below is idempotent and can be rerun if the ALB listener needs to be
recreated.

```bash
./deploy/finish-shoptool-domain.sh
```

### ALB Routing

| Priority | Path | Target group | Service |
| --- | --- | --- | --- |
| `5` | `/health` | `diy-store-server-tg` | `diy-store-server` |
| `10` | `/shop-api`, `/shop-api/*` | `diy-store-server-tg` | `diy-store-server` |
| `20` | `/admin-api`, `/admin-api/*` | `diy-store-server-tg` | `diy-store-server` |
| `30` | `/assets`, `/assets/*` | `diy-store-server-tg` | `diy-store-server` |
| `40` | `/mailbox`, `/mailbox/*` | `diy-store-server-tg` | `diy-store-server` |
| `100` | `/admin`, `/admin/*` | `diy-web-admin-tg` | `diy-store-web-admin` |
| `110` | `/driver`, `/driver/*` | `diy-web-driver-tg` | `diy-store-web-driver` |
| `120` | `/supplier`, `/supplier/*` | `diy-web-merchant-tg` | `diy-store-web-merchant` |
| default | `/` and all unmatched paths | `diy-web-customer-tg` | `diy-store-web-customer` |

## ECS

| Item | Value |
| --- | --- |
| ECS cluster | `diy-store-prod` |
| Launch type | Fargate |
| Network mode | `awsvpc` |

### ECS Services

| Service | Purpose | Current task definition | Desired / running | Target group |
| --- | --- | --- | --- | --- |
| `diy-store-server` | Vendure/NestJS backend API | `diy-store-server:16` | `1 / 1` | `diy-store-server-tg` |
| `diy-store-web-customer` | Customer storefront | `diy-store-web-customer:24` | `1 / 1` | `diy-web-customer-tg` |
| `diy-store-web-admin` | Admin portal | `diy-store-web-admin:24` | `1 / 1` | `diy-web-admin-tg` |
| `diy-store-web-driver` | Driver portal | `diy-store-web-driver:24` | `1 / 1` | `diy-web-driver-tg` |
| `diy-store-web-merchant` | Supplier / merchant portal | `diy-store-web-merchant:24` | `1 / 1` | `diy-web-merchant-tg` |

### ECS Task Roles

| Role | Purpose |
| --- | --- |
| `ecsTaskExecutionRole` | Pull images, write logs, read task startup secrets |
| `diyStoreTaskRole` | App runtime permissions, including asset bucket access |

## Container Images

| App | ECR repository | Image URI |
| --- | --- | --- |
| Backend | `diy-store-server` | `235951409953.dkr.ecr.ap-southeast-1.amazonaws.com/diy-store-server` |
| Web portals | `diy-store-web` | `235951409953.dkr.ecr.ap-southeast-1.amazonaws.com/diy-store-web` |

One `diy-store-web` image is used for the customer, admin, driver, and merchant
portal ECS services.

Current web image tag: `shoptool-image-onnx-fast1024-20260611233541`.

Current web task size: `2048` CPU units / `8192` MiB memory. Supplier product
`Энгийн` image editing runs BiRefNet-Lite ONNX in the web container with
`BIREFNET_ONNX_INPUT_SIZE=1024`, `BIREFNET_ONNX_OPTIMIZATION=basic`, and
`BIREFNET_ONNX_THREADS=2`.

## Database

| Item | Value |
| --- | --- |
| Service | Amazon RDS PostgreSQL |
| DB instance | `vendure-dev` |
| Engine | PostgreSQL `16.14` |
| Status | `available` |
| Endpoint | `vendure-dev.cviimkccsoih.ap-southeast-1.rds.amazonaws.com` |
| Port | `5432` |
| Database name | `vendure` |
| VPC | `vpc-06aa654ba26bb3bc9` |
| Security group | `sg-0bf36e8328825ae79` |

The RDS security group allows ECS tasks to connect on port `5432`.

## Assets And CDN

| Item | Value |
| --- | --- |
| S3 bucket | `diy-store-prod-assets-235951409953-ap-southeast-1` |
| S3 region | `ap-southeast-1` |
| Public access block | Enabled |
| CloudFront distribution | `E1QGM0D0IOKIA5` |
| CloudFront domain | `d2tf7pwvqo3y9.cloudfront.net` |
| CloudFront status | `Deployed` |
| CloudFront OAC | `E1FNPS04P6G8U9` |
| Origin | `diy-store-prod-assets-235951409953-ap-southeast-1.s3.ap-southeast-1.amazonaws.com` |

Vendure asset URLs should use `ASSET_URL_PREFIX` so product media points to
CloudFront instead of the ALB.

## Secrets

Production secrets are stored in AWS SSM Parameter Store under:

```text
/diy-store/prod/
```

Known parameters:

| Parameter | Type |
| --- | --- |
| `/diy-store/prod/COOKIE_SECRET` | `SecureString` |
| `/diy-store/prod/DB_HOST` | `SecureString` |
| `/diy-store/prod/DB_PASSWORD` | `SecureString` |
| `/diy-store/prod/DB_USERNAME` | `SecureString` |
| `/diy-store/prod/REALTIME_WEBHOOK_SECRET` | `SecureString` |
| `/diy-store/prod/VOYAGE_API_KEY` | `SecureString` |
| `/diy-store/prod/ANTHROPIC_API_KEY` | `SecureString` |

Semantic search also expects these non-secret environment values in the backend
task definition:

```text
EMBEDDING_MODEL=voyage-3.5
EMBEDDING_DIMENSIONS=1024
CLAUDE_QUERY_MODEL=claude-haiku-4-5-20251001
SEMANTIC_SEARCH_MIN_SCORE=0.45
```

Do not copy secret values into repository files.

## CI/CD

| Item | Value |
| --- | --- |
| CI workflow | `.github/workflows/ci.yml` |
| Production deploy workflow | `.github/workflows/deploy-prod.yml` |
| GitHub environment | `production` |
| AWS OIDC provider | `arn:aws:iam::235951409953:oidc-provider/token.actions.githubusercontent.com` |
| GitHub deploy role | `arn:aws:iam::235951409953:role/diy-store-github-production-deploy` |
| Trust subject | `repo:Biller0122/diy-store:environment:production` |

Production deployment runs when deployable code is merged to `main`, after the
GitHub environment secret and variables are configured.

## Local Files

| File | Purpose |
| --- | --- |
| `.env.aws-local` | Local development connection values. Do not commit. |
| `.env.aws-local.example` | Safe example for local AWS/RDS-style development. |
| `.env.example` | General local development example. |
| `progress.md` | Production milestone and verification log. |
| `docs/CI_CD.md` | CI/CD operating guide. |
| `docs/GITHUB_AWS_OIDC.md` | GitHub-to-AWS OIDC setup guide. |
| `docs/DEPLOYMENT_INVENTORY.md` | This deployment inventory. |
| `deploy/finish-shoptool-domain.sh` | Finalizes ALB HTTPS after `shoptool.mn` ACM validation succeeds. |

## Quick Verification Commands

```bash
curl -I http://diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com/health
curl -I http://shoptool.mn/health
curl -I https://shoptool.mn/health
curl -I https://www.shoptool.mn/health
curl -I http://diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com/
curl -I http://diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com/admin
curl -I http://diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com/driver
curl -I http://diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com/supplier
```

```bash
dig NS shoptool.mn
aws acm describe-certificate \
  --region ap-southeast-1 \
  --certificate-arn arn:aws:acm:ap-southeast-1:235951409953:certificate/3b461dfd-ecce-414e-88f0-e44f69634f46 \
  --query 'Certificate.Status'
```

```bash
aws ecs describe-services \
  --cluster diy-store-prod \
  --services diy-store-server diy-store-web-customer diy-store-web-admin diy-store-web-driver diy-store-web-merchant
```
