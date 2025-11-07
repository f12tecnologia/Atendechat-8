#!/bin/bash
set -e

echo "🔄 Verificando Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "🚀 Iniciando Redis..."
    redis-server --daemonize yes --port 6379
    sleep 2
fi

echo "✅ Redis está rodando"
echo "🚀 Iniciando backend na porta 8080..."

cd /home/runner/workspace/backend
exec node dist/server.js
