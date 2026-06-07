COMPOSE_FILE ?= docker-compose.aws.yml
ENV_FILE ?= .env.production
COMPOSE ?= docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE)

CORE_SERVICES := postgres-vendure redis
BACKEND_SERVICES := server realtime-server
WEB_SERVICES := web-customer web-admin web-driver web-merchant
EDGE_SERVICE := caddy

.PHONY: help env-check pull build build-service up deps backend portals edge deploy update restart restart-service logs ps down backup restore clean-images

help:
	@echo "DIY Store deploy commands"
	@echo ""
	@echo "  make deploy                  Pull, build, and start all production containers"
	@echo "  make up                      Start all containers without rebuilding"
	@echo "  make build                   Build all app images"
	@echo "  make update SERVICE=server   Rebuild and restart one service"
	@echo "  make restart SERVICE=server  Restart one service"
	@echo "  make logs SERVICE=server     Follow logs for one service"
	@echo "  make ps                      Show container status"
	@echo "  make backup                  Dump Postgres database to backups/"
	@echo ""
	@echo "Services: postgres-vendure redis server realtime-server web-customer web-admin web-driver web-merchant caddy"

env-check:
	@test -f "$(ENV_FILE)" || (echo "Missing $(ENV_FILE). Copy .env.production.example and fill production values first."; exit 1)

pull:
	git pull origin main

build: env-check
	$(COMPOSE) build server realtime-server web-customer web-admin web-driver web-merchant

build-service: env-check
	@test -n "$(SERVICE)" || (echo "Usage: make build-service SERVICE=server"; exit 1)
	$(COMPOSE) build $(SERVICE)

deps: env-check
	$(COMPOSE) up -d $(CORE_SERVICES)

backend: env-check deps
	$(COMPOSE) up -d $(BACKEND_SERVICES)

portals: env-check backend
	$(COMPOSE) up -d $(WEB_SERVICES)

edge: env-check portals
	$(COMPOSE) up -d $(EDGE_SERVICE)

up: env-check
	$(COMPOSE) up -d

deploy: env-check pull build deps backend portals edge ps

update: env-check pull
	@test -n "$(SERVICE)" || (echo "Usage: make update SERVICE=server"; exit 1)
	$(COMPOSE) build $(SERVICE)
	$(COMPOSE) up -d $(SERVICE)
	$(COMPOSE) ps $(SERVICE)

restart: restart-service

restart-service: env-check
	@test -n "$(SERVICE)" || (echo "Usage: make restart SERVICE=server"; exit 1)
	$(COMPOSE) restart $(SERVICE)

logs: env-check
	@test -n "$(SERVICE)" || (echo "Usage: make logs SERVICE=server"; exit 1)
	$(COMPOSE) logs -f --tail=120 $(SERVICE)

ps: env-check
	$(COMPOSE) ps

down: env-check
	$(COMPOSE) down

backup: env-check
	@mkdir -p backups
	$(COMPOSE) exec -T postgres-vendure sh -c 'pg_dump -U "$$POSTGRES_USER" "$$POSTGRES_DB"' > backups/vendure-$$(date +%Y%m%d-%H%M%S).sql

restore: env-check
	@test -n "$(FILE)" || (echo "Usage: make restore FILE=backups/vendure.sql"; exit 1)
	cat "$(FILE)" | $(COMPOSE) exec -T postgres-vendure sh -c 'psql -U "$$POSTGRES_USER" "$$POSTGRES_DB"'

clean-images:
	docker image prune -f
