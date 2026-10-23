#!/usr/bin/env bash
# ==============================================================================
# CatFish - Instalador do Serviço GitOps Systemd (User-level)
# Registra e inicializa o CatFish GitOps Watcher como serviço em background.
# Não necessita de sudo!
# ==============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="catfish-gitops.service"
USER_SYSTEMD_DIR="$HOME/.config/systemd/user"
SERVICE_PATH="$USER_SYSTEMD_DIR/$SERVICE_NAME"

echo "🔧 Instalando serviço GitOps para o CatFish..."
echo "📂 Diretório do projeto: $PROJECT_DIR"

# Torna scripts executáveis
chmod +x "$PROJECT_DIR/scripts/gitops-deploy.sh"
chmod +x "$PROJECT_DIR/scripts/gitops-watcher.sh"

# Garante existência do diretório systemd do usuário
mkdir -p "$USER_SYSTEMD_DIR"

# Cria a unidade de serviço systemd
cat <<EOF > "$SERVICE_PATH"
[Unit]
Description=CatFish GitOps Auto-Deploy Service
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
Environment="PATH=$PATH"
Environment="GITOPS_BRANCH=main"
Environment="GITOPS_INTERVAL=30"
ExecStart=/bin/bash $PROJECT_DIR/scripts/gitops-watcher.sh
Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

echo "📝 Arquivo de serviço criado em: $SERVICE_PATH"

# Recarrega configurações do systemd de usuário
systemctl --user daemon-reload

# Ativa e inicializa o serviço
systemctl --user enable --now "$SERVICE_NAME"

echo ""
echo "🎉 Serviço GitOps instalado e iniciado com sucesso!"
echo "--------------------------------------------------------"
echo "Comandos úteis para gerenciar o serviço:"
echo "  • Ver status:       systemctl --user status $SERVICE_NAME"
echo "  • Ver logs ao vivo: journalctl --user -u $SERVICE_NAME -f"
echo "  • Reiniciar:        systemctl --user restart $SERVICE_NAME"
echo "  • Parar:            systemctl --user stop $SERVICE_NAME"
echo "  • Desinstalar:      ./scripts/uninstall-gitops-service.sh"
echo "--------------------------------------------------------"
echo "💡 Dica: Para manter o serviço rodando mesmo se você fizer logout do sistema:"
echo "       loginctl enable-linger $USER"
