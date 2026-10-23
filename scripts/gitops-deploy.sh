#!/usr/bin/env bash
# ==============================================================================
# CatFish - GitOps Deploy Script
# Sincroniza o repositório local com o GitHub, reconstrói os containers Docker
# sem cache e remove as imagens antigas/órfãs.
# ==============================================================================

set -euo pipefail

# Diretório raiz do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

BRANCH="${GITOPS_BRANCH:-main}"
REMOTE="${GITOPS_REMOTE:-origin}"
LOCKFILE="/tmp/catfish-gitops.lock"

# Cores para saída no terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Evita execuções simultâneas concorrentes usando flock
exec 200>"$LOCKFILE"
flock -n 200 || {
    log_warn "Outro processo de deploy já está em execução. Abortando este ciclo."
    exit 0
}

log "Iniciando ciclo GitOps no repositório: $PROJECT_DIR"
log "Branch de destino: $REMOTE/$BRANCH"

# 1. Puxar atualizações do GitHub
log "Puxando atualizações remotas (git fetch & pull)..."
git fetch "$REMOTE" "$BRANCH"

CURRENT_COMMIT=$(git rev-parse --short HEAD)
REMOTE_COMMIT=$(git rev-parse --short "$REMOTE/$BRANCH")

if [ "$CURRENT_COMMIT" != "$REMOTE_COMMIT" ]; then
    log "Novo commit detectado: $CURRENT_COMMIT -> $REMOTE_COMMIT"
else
    log "Repositório local já no commit mais recente: $CURRENT_COMMIT (forçando rebuild solicitado)"
fi

# Se houver alterações locais não comitadas, avisa ou reseta se configurado
if ! git diff-index --quiet HEAD --; then
    if [ "${GITOPS_FORCE_RESET:-0}" = "1" ]; then
        log_warn "Alterações locais detectadas! Forçando reset para $REMOTE/$BRANCH..."
        git reset --hard "$REMOTE/$BRANCH"
    else
        log_warn "Alterações locais detectadas. Tentando git pull com merge..."
        git pull "$REMOTE" "$BRANCH"
    fi
else
    git reset --hard "$REMOTE/$BRANCH"
fi

NEW_COMMIT=$(git rev-parse --short HEAD)
log "Código atualizado para o commit $NEW_COMMIT: $(git log -1 --pretty=format:'%s (%an)')"

# 2. Build das novas imagens antes de derrubar os containers (Zero Downtime Build)
# Se o build falhar, os containers atuais NÃO são derrubados, mantendo o serviço online!
log "Construindo novas imagens Docker (--no-cache)..."
if ! docker compose build --no-cache; then
    log_error "Falha no build da imagem! Os containers em execução foram mantidos."
    exit 1
fi
log_success "Build concluído com sucesso."

# 3. Derrubar containers anteriores e recriar com a nova imagem
log "Reiniciando serviços com os novos containers..."
docker compose down

log "Subindo novos containers..."
docker compose up -d --remove-orphans

# 4. Limpeza de imagens antigas (dangling/órfãs)
log "Limpando imagens antigas e não utilizadas (docker image prune -f)..."
docker image prune -f

log_success "Deploy GitOps concluído com sucesso no commit $NEW_COMMIT!"
