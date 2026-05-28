# DIY Store AWS Deployment

Энэ setup нь эхний production гаргалтад зориулсан хамгийн энгийн AWS хувилбар:

- AWS Lightsail instance эсвэл EC2 Ubuntu
- Docker Compose
- Caddy reverse proxy + automatic HTTPS
- Next.js web
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

- `A` record: `diy-store.mn` -> instance public IP

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

## 6. Check

```bash
docker compose -f docker-compose.aws.yml --env-file .env.production ps
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f server
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f web
```

URLs:

- Web: `https://SITE_DOMAIN`
- Shop API: `https://SITE_DOMAIN/shop-api`
- Admin API: `https://SITE_DOMAIN/admin-api`
- Assets: `https://SITE_DOMAIN/assets`

## 7. Update Deployment

```bash
git pull
bash deploy/aws/bootstrap-swap.sh
DOCKER_BUILDKIT=1 docker compose -f docker-compose.aws.yml --env-file .env.production build
docker compose -f docker-compose.aws.yml --env-file .env.production up -d
docker image prune -f
```

If the first build was killed before this optimization, clear the partial builder cache:

```bash
docker builder prune -f
DOCKER_BUILDKIT=1 docker compose -f docker-compose.aws.yml --env-file .env.production build --no-cache
```

## Notes

For a bigger production setup later, move PostgreSQL to Amazon RDS and assets to S3. The current Compose setup is simpler and good for first launch/testing.
