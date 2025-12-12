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

# Set production environment
export NODE_ENV=production
export PORT=5000

# Start backend on port 5000 (serves both API and frontend static files)
echo "🖥️  Starting backend on port 5000 (API + Frontend)..."
cd backend
node dist/server.js
