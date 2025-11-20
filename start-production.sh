#!/bin/bash
set -e

echo "🚀 Starting Atendechat in production mode..."
echo ""

# Start Redis
echo "🔄 Starting Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    redis-server --daemonize yes --port 6379 --protected-mode no
    sleep 2
    echo "✅ Redis started"
else
    echo "✅ Redis already running"
fi
echo ""

# Start backend on port 8080
echo "🖥️  Starting backend on port 8080..."
cd backend
node dist/server.js &
BACKEND_PID=$!
cd ..
echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Start frontend on port 5000
echo "🌐 Starting frontend on port 5000..."
cd frontend
npx serve -s build -l 5000 -n &
FRONTEND_PID=$!
cd ..
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""

echo "✅ Atendechat is running!"
echo "   Frontend: http://0.0.0.0:5000"
echo "   Backend:  http://localhost:8080"
echo ""

# Wait for both processes
wait
