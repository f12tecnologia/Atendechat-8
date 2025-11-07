#!/bin/bash

# Iniciar Redis
redis-server --daemonize yes --port 6379
sleep 2

# Verificar Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis está rodando"
else
    echo "❌ Erro ao iniciar Redis"
    exit 1
fi

# Ir para o diretório do backend
cd backend

# Iniciar o servidor Node
echo "🚀 Iniciando backend na porta 8080..."
node dist/server.js
