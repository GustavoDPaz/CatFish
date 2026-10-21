#!/bin/bash
# Instala o hook de segurança de pre-commit no repositório local
HOOK_FILE=".git/hooks/pre-commit"

if [ ! -d ".git" ]; then
    echo "Erro: Diretório .git não encontrado. Execute na raiz do repositório."
    exit 1
fi

cat << 'EOF' > "$HOOK_FILE"
#!/bin/sh
STAGED_ENV_FILES=$(git diff --cached --name-only | grep -E "(^|/)\.env" | grep -v "\.env\.example" | grep -v "\.env\.template")
if [ -n "$STAGED_ENV_FILES" ]; then
    echo "\n❌ [APPSEC BLOQUEIO] Tentativa de commit de arquivo sensível (.env):"
    echo "$STAGED_ENV_FILES\n"
    exit 1
fi

STAGED_KEYS=$(git diff --cached --name-only | grep -E "\.(pem|key|crt|cer|pfx|p12|sqlite|sqlite3|db)$")
if [ -n "$STAGED_KEYS" ]; then
    echo "\n❌ [APPSEC BLOQUEIO] Tentativa de commit de chave/certificado:\n$STAGED_KEYS\n"
    exit 1
fi

SUSPICIOUS_CONTENT=$(git diff --cached -S"AIza" --pickaxe-regex -- . ':(exclude)scripts/*')
if [ -n "$SUSPICIOUS_CONTENT" ]; then
    echo "\n❌ [APPSEC BLOQUEIO] Assinatura de chave Google Cloud / Gemini ('AIza...') detectada no diff!\n"
    exit 1
fi

exit 0
EOF

chmod +x "$HOOK_FILE"
echo "✅ Hook de segurança pre-commit instalado com sucesso em $HOOK_FILE"
