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

DC=docker compose

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

seed:
	$(DC) exec backend bash -lc "python manage.py seed_jobs"

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
	@echo "[test] Waiting for services (HTTP ready), then running Playwright E2E tests in Docker"
	@$(DC) run --rm e2e bash -lc '\
set -euo pipefail; \
wait_http() { URL="$$1"; TIMEOUT_MS="$$2"; \
  node -e "const url=process.argv[1];const until=Date.now()+parseInt(process.argv[2]);(async function r(){try{const res=await fetch(url);if(res.ok){process.exit(0)};}catch(e){};if(Date.now()<until){setTimeout(r,1000)}else{console.error(\"Timeout waiting for \"+url);process.exit(1)}})()" "$$URL" "$$TIMEOUT_MS"; \
}; \
echo "Waiting for API $$E2E_API_URL/jobs/?page_size=1"; \
wait_http "$$E2E_API_URL/jobs/?page_size=1" 180000; \
echo "Waiting for Frontend $$E2E_BASE_URL"; \
wait_http "$$E2E_BASE_URL" 180000; \
npm ci || npm install; \
npx playwright install --with-deps || npx playwright install; \
E2E_BASE_URL=$$E2E_BASE_URL E2E_API_URL=$$E2E_API_URL npx playwright test \
'

clean:
	@echo "[clean] Stopping and removing containers, networks, and volumes"
	@$(DC) down -v --remove-orphans
	@echo "[clean] Removing lingering postgres-data volumes (if any)"
	@for v in $$(docker volume ls -q | grep -E 'postgres-data$$' || true); do \
		docker volume rm $$v >/dev/null 2>&1 || true; \
	done
