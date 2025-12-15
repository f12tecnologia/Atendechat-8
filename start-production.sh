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
export PORT=5000

# Start backend on port 5000 (serves both API and frontend static files)
echo "🖥️  Starting backend on port 5000 (API + Frontend)..."
cd backend
exec node dist/server.js
