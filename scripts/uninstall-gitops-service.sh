#!/usr/bin/env bash
# ==============================================================================
# CatFish - Desinstalador do Serviço GitOps Systemd
# Para e remove o serviço catfish-gitops do systemd de usuário.
# ==============================================================================

set -euo pipefail

SERVICE_NAME="catfish-gitops.service"
USER_SYSTEMD_DIR="$HOME/.config/systemd/user"
SERVICE_PATH="$USER_SYSTEMD_DIR/$SERVICE_NAME"

echo "🛑 Desinstalando serviço GitOps do CatFish..."

if systemctl --user is-active --quiet "$SERVICE_NAME"; then
    echo "Parando serviço $SERVICE_NAME..."
    systemctl --user stop "$SERVICE_NAME"
fi

if systemctl --user is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "Desativando inicialização automática..."
    systemctl --user disable "$SERVICE_NAME"
fi

if [ -f "$SERVICE_PATH" ]; then
    rm -f "$SERVICE_PATH"
    echo "Arquivo $SERVICE_PATH removido."
fi

systemctl --user daemon-reload
systemctl --user reset-failed 2>/dev/null || true

echo "✅ Serviço GitOps desinstalado com sucesso."
