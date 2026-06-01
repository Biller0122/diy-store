# DIY Store AWS Deployment

Энэ setup нь эхний production гаргалтад зориулсан хамгийн энгийн AWS хувилбар:

- AWS Lightsail instance эсвэл EC2 Ubuntu
- Docker Compose
- Caddy reverse proxy + automatic HTTPS
- Four separate Next.js portal services: customer, admin, driver, merchant
- Vendure server
- PostgreSQL
- Redis

## 1. AWS Instance

Lightsail эсвэл EC2 дээр Ubuntu 22.04/24.04 instance үүсгэнэ.

Security group / firewall:

- `22` SSH
- `80` HTTP
- `443` HTTPS

Domain DNS:

- `A` record: customer domain -> instance public IP
- `A` record: admin domain -> instance public IP
- `A` record: driver domain -> instance public IP
- `A` record: merchant domain -> instance public IP

## 2. Install Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker
docker version
```

Small Lightsail/EC2 instances need swap before Docker build:

```bash
cd ~/diy-store
bash deploy/aws/bootstrap-swap.sh
```

## 3. Upload Code

```bash
git clone <YOUR_REPO_URL> diy-store
cd diy-store
```

If you are not using GitHub yet, zip/copy the project to `/home/ubuntu/diy-store`.

## 4. Configure Environment

```bash
cp .env.production.example .env.production
nano .env.production
```

Change at least:

- `SITE_DOMAIN`
- `CUSTOMER_DOMAIN`
- `ADMIN_DOMAIN`
- `DRIVER_DOMAIN`
- `MERCHANT_DOMAIN`
- `CORS_ALLOWED_ORIGINS`
- `ACME_EMAIL`
- `SUPERADMIN_PASSWORD`
- `COOKIE_SECRET`
- `DB_PASSWORD`
- payment/search keys when ready

## 5. Deploy

```bash
DOCKER_BUILDKIT=1 docker compose -f docker-compose.aws.yml --env-file .env.production build
docker compose -f docker-compose.aws.yml --env-file .env.production up -d
```

After the first successful boot on a new database, edit `.env.production` and set:

```bash
DB_SYNCHRONIZE=false
```

Then restart only the backend:

```bash
docker compose -f docker-compose.aws.yml --env-file .env.production up -d server
```

This keeps production data safer once the initial Vendure tables have been created.

## 6. Check

```bash
docker compose -f docker-compose.aws.yml --env-file .env.production ps
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f server
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f web-customer
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f web-admin
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f web-driver
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f web-merchant
```

URLs:

- Customer: `https://CUSTOMER_DOMAIN`
- Admin: `https://ADMIN_DOMAIN` redirects to `/admin`
- Driver: `https://DRIVER_DOMAIN` redirects to `/driver`
- Merchant: `https://MERCHANT_DOMAIN` redirects to `/supplier`
- Shop API: `https://CUSTOMER_DOMAIN/shop-api`
- Admin API: `https://ADMIN_DOMAIN/admin-api`
- Realtime Socket.IO: `https://<portal-domain>/socket.io`

Direct EC2 debug ports are also exposed:

- Customer: `http://INSTANCE_IP:8080`
- Admin: `http://INSTANCE_IP:8081`
- Driver: `http://INSTANCE_IP:8082`
- Merchant: `http://INSTANCE_IP:8083`

## 7. Update Deployment

```bash
git pull
bash deploy/aws/bootstrap-swap.sh
DOCKER_BUILDKIT=1 docker compose -f docker-compose.aws.yml --env-file .env.production build
docker compose -f docker-compose.aws.yml --env-file .env.production up -d
docker image prune -f
```

Do not use `docker compose down -v`, `docker volume rm`, or `docker system prune --volumes` on the production server unless you intentionally want to delete PostgreSQL data. Customer, driver, supplier, order, and session data live in the `diy-store_vendure-db-data` Docker volume.

Safe restart/update commands:

```bash
docker compose -f docker-compose.aws.yml --env-file .env.production restart
docker compose -f docker-compose.aws.yml --env-file .env.production up -d
```

Risky data-deleting commands:

```bash
docker compose -f docker-compose.aws.yml --env-file .env.production down -v
docker volume rm diy-store_vendure-db-data
docker system prune --volumes
```

Quick database audit:

```bash
docker exec -it diy-store-postgres-vendure-1 psql -U vendure -d vendure \
  -c 'select count(*) as customers from customer; select count(*) as drivers from driver; select count(*) as users from "user";'
```

If the first build was killed before this optimization, clear the partial builder cache:

```bash
docker builder prune -f
DOCKER_BUILDKIT=1 docker compose -f docker-compose.aws.yml --env-file .env.production build --no-cache
```

## Notes

For a bigger production setup later, move PostgreSQL to Amazon RDS and assets to S3. The current Compose setup is simpler and good for first launch/testing.
