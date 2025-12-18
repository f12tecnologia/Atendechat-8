#!/bin/bash

# Kill any existing processes
pkill -f "node dist/server.js" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
sleep 2

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
  npm run build
  cd ..
fi

echo "Iniciando aplicação na porta 5000..."
echo "O backend irá servir o frontend automaticamente"

# Iniciar apenas o backend na porta 5000 (ele serve o frontend)
cd backend
PORT=5000 node dist/server.js

# Manter o script rodando
wait