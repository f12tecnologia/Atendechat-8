#!/bin/bash
set -e

echo "🔄 Verificando e iniciando Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    redis-server --daemonize yes --port 6379 --protected-mode no
    sleep 3
    echo "✅ Redis iniciado"
else
    echo "✅ Redis já está rodando"
fi

# Aguardar Redis estar pronto
until redis-cli ping > /dev/null 2>&1; do
    echo "⏳ Aguardando Redis..."
    sleep 1
done

echo "🚀 Iniciando backend na porta 8080..."
cd backend

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado, copiando de .env.example"
    cp .env.example .env
fi

npm start