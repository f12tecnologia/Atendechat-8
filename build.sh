#!/bin/bash
set -e

echo "📦 Building Atendechat..."
echo ""

# Build backend first
echo "🔨 Building backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "   Installing backend dependencies..."
    npm install --include=dev
fi
echo "   Compiling TypeScript..."
npm run build
cd ..
echo "✅ Backend build completed!"
echo ""

# Build frontend
echo "🎨 Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install --include=dev
fi
echo "   Building React app..."
export NODE_OPTIONS=--openssl-legacy-provider
export GENERATE_SOURCEMAP=false
npm run build
cd ..
echo "✅ Frontend build completed!"
echo ""

echo "✅ Full build completed successfully!"
