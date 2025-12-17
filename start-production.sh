#!/bin/bash
set -e

echo "Starting Atendechat..."

if ! redis-cli ping > /dev/null 2>&1; then
    redis-server --daemonize yes --port 6379 --protected-mode no
    for i in {1..10}; do
        redis-cli ping > /dev/null 2>&1 && echo "Redis started" && break
        sleep 1
    done
fi

export NODE_ENV=production

cd /home/runner/workspace/backend
PORT=8080 node dist/server.js &
BACKEND_PID=$!

sleep 3

cd /home/runner/workspace/frontend
npx serve -s build -l 5000 -n &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait -n $BACKEND_PID $FRONTEND_PID
exit 1
