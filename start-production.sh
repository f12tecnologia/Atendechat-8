#!/bin/bash
set -e

echo "🚀 Starting Atendechat in production mode..."
echo ""

# Start Redis with proper wait
echo "🔄 Starting Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    redis-server --daemonize yes --port 6379 --protected-mode no

    # Wait for Redis to be ready (up to 10 seconds)
    for i in {1..10}; do
        if redis-cli ping > /dev/null 2>&1; then
            echo "✅ Redis started successfully"
            break
        fi
        echo "   Waiting for Redis... ($i/10)"
        sleep 1
    done

    if ! redis-cli ping > /dev/null 2>&1; then
        echo "❌ Redis failed to start, continuing anyway..."
    fi
else
    echo "✅ Redis already running"
fi
echo ""

# Set production environment
export NODE_ENV=production

echo "🖥️  Starting backend on port 8080..."
cd backend
PORT=8080 node dist/server.js &
BACKEND_PID=$!

echo "⏳ Waiting for backend to be ready..."
sleep 5

echo "🌐 Starting frontend on port 5000..."
cd ../frontend
PORT=5000 BROWSER=none npm start &
FRONTEND_PID=$!

echo "✅ Production services started!"
echo "   - Backend API: http://localhost:8080"
echo "   - Frontend: http://localhost:5000 (forwarded to port 80)"

# Keep script running
wait $BACKEND_PID $FRONTEND_PID