
#!/bin/bash

echo "🔍 Verificando conexões..."
echo ""

# Verificar Redis
echo "1️⃣ Verificando Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis está rodando"
else
    echo "❌ Redis não está acessível"
fi
echo ""

# Verificar Backend
echo "2️⃣ Verificando Backend (porta 8080)..."
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Backend está respondendo"
else
    echo "❌ Backend não está acessível"
fi
echo ""

# Verificar Frontend
echo "3️⃣ Verificando Frontend (porta 5000)..."
if curl -s http://localhost:5000 > /dev/null 2>&1; then
    echo "✅ Frontend está respondendo"
else
    echo "❌ Frontend não está acessível"
fi
echo ""

# Verificar variáveis de ambiente
echo "4️⃣ Verificando variáveis de ambiente..."
if [ -f "backend/.env" ]; then
    echo "✅ Backend .env existe"
else
    echo "❌ Backend .env não encontrado"
fi

if [ -f "frontend/.env" ]; then
    echo "✅ Frontend .env existe"
else
    echo "❌ Frontend .env não encontrado"
fi
echo ""

echo "✅ Verificação concluída!"
