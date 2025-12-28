#!/bin/bash

# Kill any existing processes
pkill -f "node dist/server.js" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
sleep 1

# Iniciar Redis se não estiver rodando
if ! redis-cli ping 2>/dev/null | grep -q "PONG"; then
  echo "Iniciando Redis..."
  redis-server --daemonize yes --port 6379 --protected-mode no
  sleep 2
  
  if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "Redis iniciado com sucesso!"
  else
    echo "AVISO: Redis pode não ter iniciado corretamente"
  fi
else
  echo "Redis já está rodando"
fi

# Verificar se o build do backend existe
if [ ! -d "backend/dist" ]; then
  echo "Backend não compilado. Executando build..."
  cd backend
  npm run build
  cd ..
fi

# Verificar se o build do frontend existe
if [ ! -d "frontend/build" ]; then
  echo "Frontend build não encontrado. Executando build..."
  cd frontend
  GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=3072 --openssl-legacy-provider" npm run build
  cd ..
fi

echo "Iniciando aplicação na porta 5000..."
echo "O backend irá servir o frontend automaticamente"

# Iniciar apenas o backend na porta 5000 (ele serve o frontend)
cd backend
PORT=5000 node dist/server.js

# Manter o script rodando
wait
