
#!/bin/bash

echo "=== Testando Configuração de Webhook Evolution API ==="
echo ""

# Verificar se os arquivos estão sendo salvos
echo "1. Verificando diretório de mídia..."
ls -lah /home/runner/workspace/backend/public/ | tail -10

echo ""
echo "2. Verificando permissões do diretório..."
ls -ld /home/runner/workspace/backend/public/

echo ""
echo "3. Últimos logs do backend relacionados a mídia..."
tail -100 /home/runner/workspace/backend/dist/server.log 2>/dev/null | grep -i "MEDIA" || echo "Arquivo de log não encontrado"

echo ""
echo "=== Teste concluído ==="
