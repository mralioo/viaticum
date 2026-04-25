# ─────────────────────────────────────────────────────────────────────────────
#  Medion KIS — build, run & deploy
#  Targets:  make help | build | up | down | logs | clean | health | deploy
# ─────────────────────────────────────────────────────────────────────────────

COMPOSE        := docker-compose -f docker-compose.kis.yml
COMPOSE_DEBUG  := docker-compose -f docker-compose.kis.yml --profile debug
IMAGE_FRONTEND := kis-frontend
IMAGE_BACKEND  := kis-backend

# Colour helpers (disable with NO_COLOR=1)
ifeq ($(NO_COLOR),)
  BOLD  := \033[1m
  CYAN  := \033[36m
  GREEN := \033[32m
  RESET := \033[0m
else
  BOLD := CYAN := GREEN := RESET :=
endif

.PHONY: help build up up-debug down restart logs logs-backend logs-frontend \
        health shell-backend shell-frontend clean clean-volumes \
        deploy deploy-check env-check opensearch-init

# ─── Default ─────────────────────────────────────────────────────────────────
.DEFAULT_GOAL := help

help: ## Show this help
	@printf "$(BOLD)$(CYAN)Medion KIS$(RESET)\n"
	@printf "$(BOLD)Usage:$(RESET) make <target>\n\n"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ \
	  { printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# ─── Build ────────────────────────────────────────────────────────────────────
build: ## Build all Docker images (frontend_react + backend)
	@printf "$(BOLD)Building images…$(RESET)\n"
	$(COMPOSE) build --parallel

build-frontend: ## Re-build only the KIS static frontend image
	$(COMPOSE) build --no-cache frontend_react

build-backend: ## Re-build only the FastAPI backend image
	$(COMPOSE) build --no-cache backend

# ─── Start / Stop ────────────────────────────────────────────────────────────
up: env-check ## Start all services (detached)
	@printf "$(BOLD)Starting KIS stack…$(RESET)\n"
	$(COMPOSE) up -d
	@printf "$(GREEN)✓ Frontend  → http://localhost:3000$(RESET)\n"
	@printf "$(GREEN)✓ Backend   → http://localhost:8000/docs$(RESET)\n"
	@printf "$(GREEN)✓ OpenSearch→ https://localhost:9200$(RESET)\n"

up-debug: env-check ## Start all services including OpenSearch Dashboards
	$(COMPOSE_DEBUG) up -d
	@printf "$(GREEN)✓ Dashboards→ http://localhost:5601$(RESET)\n"

down: ## Stop and remove containers (volumes preserved)
	$(COMPOSE) down

restart: ## Restart all services
	$(COMPOSE) restart

restart-backend: ## Restart only the backend (hot-reload code changes)
	$(COMPOSE) restart backend

restart-frontend: ## Rebuild and restart only the frontend
	$(COMPOSE) build --no-cache frontend_react
	$(COMPOSE) up -d --no-deps frontend_react

# ─── Logs ────────────────────────────────────────────────────────────────────
logs: ## Tail logs from all services
	$(COMPOSE) logs -f --tail=100

logs-backend: ## Tail backend logs
	$(COMPOSE) logs -f --tail=100 backend

logs-frontend: ## Tail frontend (nginx) logs
	$(COMPOSE) logs -f --tail=100 frontend_react

logs-opensearch: ## Tail OpenSearch logs
	$(COMPOSE) logs -f --tail=100 opensearch

# ─── Health ──────────────────────────────────────────────────────────────────
health: ## Check health of all running services
	@printf "$(BOLD)Service health$(RESET)\n"
	@docker inspect --format '  {{.Name}}: {{.State.Health.Status}}' \
	    kis-frontend kis-backend kis-opensearch 2>/dev/null || \
	    printf "  (some containers not running)\n"
	@printf "\nBackend /health:\n"
	@curl -sf http://localhost:8000/health | python3 -m json.tool 2>/dev/null || \
	    printf "  backend not reachable\n"

# ─── OpenSearch ───────────────────────────────────────────────────────────────
opensearch-init: ## Create the transcript index with k-NN mapping in OpenSearch
	@printf "$(BOLD)Initialising OpenSearch index…$(RESET)\n"
	@PASS=$${OPENSEARCH_ADMIN_PASSWORD:-Medion!KIS2026}; \
	curl -sk -X PUT \
	  -u "admin:$$PASS" \
	  -H 'Content-Type: application/json' \
	  https://localhost:9200/viaticum-transcripts \
	  -d '{ \
	    "settings": {"index": {"knn": true, "knn.space_type": "cosinesimil"}}, \
	    "mappings": {"properties": { \
	      "embedding":  {"type": "knn_vector", "dimension": 768}, \
	      "text":       {"type": "text", "analyzer": "german"}, \
	      "speaker":    {"type": "keyword"}, \
	      "start":      {"type": "float"}, \
	      "patient_id": {"type": "keyword"}, \
	      "timestamp":  {"type": "date"} \
	    }} \
	  }' | python3 -m json.tool

opensearch-status: ## Show OpenSearch cluster health
	@PASS=$${OPENSEARCH_ADMIN_PASSWORD:-Medion!KIS2026}; \
	curl -sk -u "admin:$$PASS" https://localhost:9200/_cluster/health | python3 -m json.tool

# ─── Shell access ────────────────────────────────────────────────────────────
shell-backend: ## Open a bash shell in the backend container
	$(COMPOSE) exec backend bash

shell-frontend: ## Open a shell in the nginx frontend container
	$(COMPOSE) exec frontend_react sh

shell-opensearch: ## Open a shell in the OpenSearch container
	$(COMPOSE) exec opensearch bash

# ─── Env helpers ─────────────────────────────────────────────────────────────
env-check: ## Warn if .env file is missing
	@if [ ! -f .env ]; then \
	  printf "$(BOLD)Warning:$(RESET) .env not found — copying .env.example\n"; \
	  cp .env.example .env 2>/dev/null || \
	    printf "  Create a .env file (see .env.example for reference)\n"; \
	fi

# ─── Clean ────────────────────────────────────────────────────────────────────
clean: down ## Remove containers and built images
	$(COMPOSE) rm -f
	docker rmi -f $(IMAGE_FRONTEND) $(IMAGE_BACKEND) 2>/dev/null || true

clean-volumes: down ## Remove containers, images AND persistent volumes (⚠ data loss)
	@printf "$(BOLD)This will DELETE opensearch-data volume. Continue? [y/N]$(RESET) "; \
	read ans; [ "$$ans" = "y" ] || [ "$$ans" = "Y" ] || (printf "Aborted.\n"; exit 1)
	$(COMPOSE) down -v --remove-orphans
	docker rmi -f $(IMAGE_FRONTEND) $(IMAGE_BACKEND) 2>/dev/null || true

# ─── Deploy ──────────────────────────────────────────────────────────────────
deploy-check: ## Validate config before deploying
	$(COMPOSE) config --quiet
	@printf "$(GREEN)✓ Compose config valid$(RESET)\n"

deploy: deploy-check build ## Full deploy: validate → build → (re)start
	@printf "$(BOLD)Deploying Medion KIS…$(RESET)\n"
	$(COMPOSE) up -d --remove-orphans
	$(MAKE) opensearch-init 2>/dev/null || true
	@printf "$(GREEN)✓ Deployed — http://localhost:3000$(RESET)\n"
