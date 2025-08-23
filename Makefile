# Docker-only workflow
# Usage:
#   make build   - Build Docker images
#   make up      - Start full stack (backend, frontend, postgres)
#   make stop    - Stop running containers
#   make down    - Remove containers and volumes
#   make logs    - Tail logs
#   make rebuild - Rebuild images with no cache
#   make test    - Run Playwright E2E tests against docker-compose stack
#   make clean   - Clean Docker resources (containers, networks, volumes)

DC=docker-compose

.PHONY: build up stop down logs rebuild test clean migrate upm

# --- Docker-based workflow ---
build:
	$(DC) build

up:
	$(DC) up -d
	@echo "Stack is starting: backend http://localhost:8000, frontend http://localhost:3000, postgres on 5432, redis on 6379"

logs:
	$(DC) logs -f --tail=200

rebuild:
	$(DC) build --no-cache

stop:
	$(DC) stop

down:
	$(DC) down -v

# Run DB migrations
migrate:
	$(DC) exec backend bash -lc "python manage.py migrate"

# Bring stack up and run migrations
upm: up migrate

# Run Playwright E2E tests against the running stack
# Exports base URLs so tests can find frontend and backend
 test:
	@echo "[test] Starting application stack (Docker Compose)"
	@$(DC) up -d --build
	@echo "[test] Installing Playwright browsers (if needed)"
	@cd frontend && npm ci || npm install
	@cd frontend && npx playwright install --with-deps || npx playwright install
	@echo "[test] Running Playwright E2E tests"
	@cd frontend && E2E_BASE_URL=http://localhost:3000 E2E_API_URL=http://localhost:8000/api npx playwright test

clean:
	@echo "[clean] Stopping and removing containers, networks, and volumes"
	@$(DC) down -v --remove-orphans
	@echo "[clean] Removing lingering postgres-data volumes (if any)"
	@for v in $$(docker volume ls -q | grep -E 'postgres-data$$' || true); do \
		docker volume rm $$v >/dev/null 2>&1 || true; \
	done
