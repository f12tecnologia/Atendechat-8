#!/bin/bash

# 🔧 Script para configurar webhooks da Evolution API automaticamente
# Uso: ./scripts/configure-evolution-webhooks.sh

echo "🔧 Configurando webhooks Evolution API..."
echo ""

# Configurações
EVOLUTION_URL="https://evolution.intelfoz.app.br"
API_KEY="DA5176A9-BE32-45E4-96B4-95D1C52C0841"
WEBHOOK_URL="https://7b12b638-ed7a-4d8c-89cd-a7aedcd25a36-00-sic5vtm2zqa8.kirk.replit.dev/api-integrations/webhook/1"

# Instâncias para configurar
INSTANCES=(
  "Intelfoz_Movel"
  "intelfoz_movel_1763131143017"
  "c680d58f04ed48c97cb13bd3b5b7a05b_1763124756427"
)

# Payload JSON
WEBHOOK_CONFIG='{
  "enabled": true,
  "url": "'$WEBHOOK_URL'",
  "webhookByEvents": false,
  "webhook_base64": false,
  "events": [
    "QRCODE_UPDATED",
    "CONNECTION_UPDATE",
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "MESSAGES_DELETE"
  ]
}'

echo "📍 Webhook URL: $WEBHOOK_URL"
echo ""

# Configurar cada instância
for INSTANCE in "${INSTANCES[@]}"; do
  echo "⚙️  Configurando instância: $INSTANCE"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$EVOLUTION_URL/webhook/set/$INSTANCE" \
    -H "Content-Type: application/json" \
    -H "apikey: $API_KEY" \
    -d "$WEBHOOK_CONFIG")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "   ✅ Sucesso! Webhook configurado"
  else
    echo "   ❌ Erro HTTP $HTTP_CODE"
    echo "   Resposta: $BODY"
  fi
  
  echo ""
done

echo "🎉 Configuração finalizada!"
echo ""
echo "📋 Próximos passos:"
echo "1. Envie uma mensagem WhatsApp para 554599053700"
echo "2. Verifique os logs: grep 'WEBHOOK' /tmp/logs/backend*.log"
echo "3. Mensagem deve aparecer em Atendimentos"
