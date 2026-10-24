#!/usr/bin/env bash
# ==============================================================================
# CatFish - GitOps Watcher Daemon
# Monitora continuamente o repositório GitHub e dispara o deploy automático
# assim que um novo commit for detectado.
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

BRANCH="${GITOPS_BRANCH:-main}"
REMOTE="${GITOPS_REMOTE:-origin}"
INTERVAL="${GITOPS_INTERVAL:-30}" # segundos entre verificações

# Cores
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

trap 'log "Finalizando GitOps Watcher..."; exit 0' SIGINT SIGTERM

log "🚀 CatFish GitOps Watcher iniciado"
log "Monitorando repositório: $PROJECT_DIR"
log "Alvo: $REMOTE/$BRANCH | Intervalo de verificação: ${INTERVAL}s"

while true; do
    # Verifica conexão e busca o estado remoto sem alterar arquivos locais
    if git fetch "$REMOTE" "$BRANCH" --quiet 2>/dev/null; then
        LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || echo "")
        REMOTE_HASH=$(git rev-parse "$REMOTE/$BRANCH" 2>/dev/null || echo "")

        # Only deploy if remote has new commits ahead of local
        if [ -n "$LOCAL_HASH" ] && [ -n "$REMOTE_HASH" ] && [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
            if git merge-base --is-ancestor "$LOCAL_HASH" "$REMOTE_HASH" 2>/dev/null; then
                log "🔔 Novo commit detectado no GitHub!"
                log "Local:  $LOCAL_HASH"
                log "Remoto: $REMOTE_HASH"
                
                # Executa script de deploy
                "$PROJECT_DIR/scripts/gitops-deploy.sh" || {
                    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Erro durante o deploy automatizado.${NC}"
                }
            else
                log "Alterações locais estão à frente do repositório remoto. Aguardando push..."
            fi
        fi
    else
        echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  Falha ao consultar repositório remoto ($REMOTE/$BRANCH). Verifique conexão de rede.${NC}"
    fi

    sleep "$INTERVAL"
done
