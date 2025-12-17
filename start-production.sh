#!/bin/bash

# Kill any existing processes on ports 8080 and 5000
pkill -f "node dist/server.js" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
sleep 2

# Verificar se o build do frontend existe
if [ ! -d "frontend/build" ]; then
  echo "Frontend build não encontrado. Executando build..."
  cd frontend
  npm run build
  cd ..
fi

# Iniciar backend diretamente (sem nodemon para produção estável)
cd backend
PORT=8080 node dist/server.js &
BACKEND_PID=$!

# Aguardar o backend iniciar
sleep 3

# Iniciar servidor de produção do frontend na porta 5000
cd ../frontend
PORT=5000 node server.js &
FRONTEND_PID=$!

echo "Sistema iniciado!"
echo "Backend rodando na porta 8080"
echo "Frontend rodando na porta 5000"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Manter o script rodando
wait