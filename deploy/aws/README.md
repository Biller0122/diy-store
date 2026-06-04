# DIY Store AWS Production Deployment

This deployment targets a pragmatic small production launch:

- One Ubuntu EC2 instance runs Docker Compose application services.
- Amazon RDS PostgreSQL stores Vendure data.
- Amazon S3 stores Vendure assets.
- Docker Redis runs on EC2 for realtime/session coordination.
- Caddy terminates HTTPS for the customer, admin, driver, and merchant subdomains.

The production Compose file intentionally does not start PostgreSQL. Do not use the
development `docker-compose.yml` for production.

## 1. AWS Resources

Default region: `ap-southeast-1`, unless your users are closer to another region.

Create an EC2 instance:

- Ubuntu 24.04 LTS
- `t3.medium` minimum, `t3.large` if budget allows
- 30-50 GB gp3 root volume
- IAM instance role with S3 access to the production asset bucket

EC2 security group:

- `80` from `0.0.0.0/0`
- `443` from `0.0.0.0/0`
- `22` only from your own IP address

Create an RDS PostgreSQL 16 database:

- Private / not publicly accessible
- DB name: `vendure`
- DB user: `vendure`
- Security group allows `5432` only from the EC2 security group
- Automated backups: at least 7 days
- Turn on deletion protection after the first smoke test

Create an S3 bucket, for example `diy-store-prod-assets`:

- Block Public Access enabled
- Versioning enabled
- EC2 role permissions: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`,
  `s3:ListBucket`

## 2. DNS

Point these A records to the EC2 public IP:

- `shop.example.com`
- `admin.example.com`
- `driver.example.com`
- `merchant.example.com`

Wait for DNS to resolve before starting Caddy:

```bash
dig shop.example.com
dig admin.example.com
dig driver.example.com
dig merchant.example.com
```

## 3. Prepare EC2

```bash
sudo apt update
sudo apt install -y ca-certificates curl git unzip
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker
docker version
docker compose version
```

Clone the app:

```bash
git clone https://github.com/Biller0122/diy-store.git ~/diy-store
cd ~/diy-store
```

## 4. Configure Production Env

```bash
cp .env.production.example .env.production
nano .env.production
```

Required production values:

```bash
CUSTOMER_DOMAIN=shop.example.com
ADMIN_DOMAIN=admin.example.com
DRIVER_DOMAIN=driver.example.com
MERCHANT_DOMAIN=merchant.example.com
ACME_EMAIL=admin@example.com

STOREFRONT_URL=https://shop.example.com
CORS_ALLOWED_ORIGINS=https://shop.example.com,https://admin.example.com,https://driver.example.com,https://merchant.example.com

DB_TYPE=postgres
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=vendure
DB_USERNAME=vendure
DB_PASSWORD=<strong-rds-password>
DB_SYNCHRONIZE=true

REDIS_URL=redis://redis:6379
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=<strong-admin-password>
COOKIE_SECRET=<long-random-secret>
REALTIME_WEBHOOK_SECRET=<long-random-secret>

ASSET_STORAGE=s3
S3_BUCKET=diy-store-prod-assets
S3_REGION=ap-southeast-1
S3_PREFIX=vendure-assets

PAYMENT_MOCK_MODE=true
OTP_MOCK_MODE=true
FIREBASE_MOCK_MODE=true
```

Use an EC2 IAM role for S3. Only set `AWS_ACCESS_KEY_ID` and
`AWS_SECRET_ACCESS_KEY` if you cannot use an instance role.

## 5. First Deploy

Use the helper script:

```bash
bash deploy/aws/deploy.sh
```

Or run the commands manually:

```bash
bash deploy/aws/bootstrap-swap.sh
DOCKER_BUILDKIT=1 docker compose -f docker-compose.aws.yml --env-file .env.production build
docker compose -f docker-compose.aws.yml --env-file .env.production up -d
docker compose -f docker-compose.aws.yml --env-file .env.production ps
```

## 6. Verify

Check service status and logs:

```bash
docker compose -f docker-compose.aws.yml --env-file .env.production ps
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f server
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f caddy
```

HTTP checks:

```bash
curl -I https://shop.example.com/api/health
curl -I https://admin.example.com/api/health
curl -I https://driver.example.com/api/health
curl -I https://merchant.example.com/api/health
```

Browser checks:

- Customer: `https://shop.example.com`
- Admin: `https://admin.example.com/admin`
- Driver: `https://driver.example.com/driver`
- Merchant: `https://merchant.example.com/supplier`
- Shop API: `https://shop.example.com/shop-api`
- Admin API: `https://admin.example.com/admin-api`
- Realtime Socket.IO: `https://shop.example.com/socket.io`

Asset smoke test:

- Upload a product image through admin/supplier UI.
- Confirm an object appears in S3 under `vendure-assets/`.
- Confirm the product image renders through the storefront.

## 7. Lock Schema After First Boot

This repo currently has no committed Vendure migrations. For the first empty RDS
boot, `DB_SYNCHRONIZE=true` may create the initial schema. After that succeeds,
lock schema synchronization:

```bash
bash deploy/aws/lock-schema.sh
```

Or manually edit `.env.production`:

```bash
DB_SYNCHRONIZE=false
docker compose -f docker-compose.aws.yml --env-file .env.production up -d server
```

Future schema changes should be shipped as committed migrations and run
explicitly before app startup.

## 8. Public Launch Switch

Keep mocks enabled only for private smoke tests. Before opening the site publicly:

- Configure SMTP or SES SMTP: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Configure real QPay/MonPay/card PSP credentials
- Configure Firebase service account JSON if push notifications are required
- Configure mobile builds with public HTTPS API URLs

Then update:

```bash
PAYMENT_MOCK_MODE=false
OTP_MOCK_MODE=false
FIREBASE_MOCK_MODE=false
```

Restart:

```bash
docker compose -f docker-compose.aws.yml --env-file .env.production up -d
```

## 9. Normal Updates

```bash
cd ~/diy-store
git pull
bash deploy/aws/deploy.sh
docker image prune -f
```

Do not run data-deleting Docker commands against production volumes:

```bash
docker compose -f docker-compose.aws.yml --env-file .env.production down -v
docker volume rm diy-store_redis-data
docker system prune --volumes
```

RDS is the source of truth for database backups. Verify that automated backups
are visible in the AWS console after the first backup window.

## 10. Pre-Deploy Checks

Run these locally or on CI before deploying:

```bash
npm run build -w @diy-store/server
npm run build -w @diy-store/web
npm run test -w @diy-store/server -- --runInBand
npm run test:smoke -w @diy-store/web
```

For the next production iteration, move Redis to ElastiCache and add ECR plus
GitHub Actions once manual SSH deploys become too error-prone.
