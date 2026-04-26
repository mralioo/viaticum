#!/usr/bin/env bash
# start.sh — build and start the full Viaticum KIS stack
set -euo pipefail

COMPOSE="docker compose -f docker-compose.kis.yml"
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RESET='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${CYAN}  Viaticum KIS — local stack startup${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

# Check .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠  .env not found — copy .env.example and fill in your keys${RESET}"
  exit 1
fi

echo -e "\n${CYAN}▶  Building images…${RESET}"
$COMPOSE build

echo -e "\n${CYAN}▶  Starting all services…${RESET}"
$COMPOSE up -d

echo -e "\n${CYAN}▶  Waiting for backend to become healthy…${RESET}"
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓  Backend ready${RESET}"
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo -e "${YELLOW}⚠  Backend health check timed out — check: docker logs kis-backend${RESET}"
  fi
done

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Stack is running!"
echo -e ""
echo -e "  🌐  Frontend (KIS UI)   →  http://localhost:3000"
echo -e "  ⚙️   Backend API         →  http://localhost:8000"
echo -e "  📖  API docs (Swagger)  →  http://localhost:8000/docs"
echo -e "  🔍  OpenSearch          →  https://localhost:9200"
echo -e "  🗄️   PostgreSQL          →  localhost:5432  (db=kisdb, user=kis)"
echo -e ""
echo -e "  Demo patients:"
echo -e "    patient-001 — Ivana Slivovitz  (full KI-Akte + RAG)"
echo -e "    patient-002 — Klaus Müller     (basic info only)"
echo -e ""
echo -e "  To stop:   docker compose -f docker-compose.kis.yml down"
echo -e "  To reset:  docker compose -f docker-compose.kis.yml down -v"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
