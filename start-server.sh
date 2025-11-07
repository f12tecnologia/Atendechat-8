#!/bin/bash
set -e

echo "🔄 Verificando e iniciando Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    redis-server --daemonize yes --port 6379 --protected-mode no
    sleep 2
    echo "✅ Redis iniciado"
else
    echo "✅ Redis já está rodando"
fi

echo "🚀 Iniciando backend na porta 8080..."
cd /home/runner/workspace/backend
exec node dist/server.js
