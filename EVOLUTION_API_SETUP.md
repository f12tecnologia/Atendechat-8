# 🔧 Configuração Evolution API - Webhooks de Mensagens

## 📋 Problema Atual
✅ Webhooks QR Code funcionando  
❌ **Webhooks de Mensagens NÃO chegam** (messages.upsert, messages.update)

## 🎯 Solução: Configurar Webhooks na Evolution API

### Passo 1: Acessar Configurações da Instância
1. Acesse: `https://evolution.intelfoz.app.br/manager`
2. Selecione a instância (ex: `Intelfoz_Movel`)
3. Clique no ícone de **engrenagem** ⚙️

### Passo 2: Configurar Webhook Events
Na aba **Webhook**, configure:

```json
{
  "url": "https://7b12b638-ed7a-4d8c-89cd-a7aedcd25a36-00-sic5vtm2zqa8.kirk.replit.dev/api-integrations/webhook/1",
  "events": [
    "QRCODE_UPDATED",
    "CONNECTION_UPDATE",
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "MESSAGES_DELETE",
    "SEND_MESSAGE"
  ]
}
```

### Passo 3: Eventos Importantes
Ative **obrigatoriamente**:
- ✅ `MESSAGES_UPSERT` - **Mensagens recebidas** (CRÍTICO!)
- ✅ `CONNECTION_UPDATE` - Status de conexão
- ✅ `QRCODE_UPDATED` - QR Code
- ⚪ `MESSAGES_UPDATE` - Mensagens editadas (opcional)
- ⚪ `SEND_MESSAGE` - Confirmação de envio (opcional)

## 🧪 Como Testar

### Teste 1: Receber Mensagem
1. Envie mensagem WhatsApp para o número conectado (554599053700)
2. Verifique logs backend: `[WEBHOOK] Processing message`
3. Mensagem deve aparecer em **Atendimentos**

### Teste 2: Enviar Mensagem
1. Abra ticket em **Atendimentos**
2. Digite mensagem e envie
3. Verifique se chegou no WhatsApp do cliente

## 🔍 Verificar Webhooks nos Logs

### Logs que DEVEM aparecer quando funcionar:
```
[WEBHOOK] Received: event=messages.upsert, instance=Intelfoz_Movel
[WEBHOOK] Processing message: id=ABC123, from=5511999999999@s.whatsapp.net
[WEBHOOK] Contact created/updated: 5511999999999
[WEBHOOK] Ticket created: #1234
[WEBHOOK] Message saved to database
```

### Logs atuais (INCORRETOS):
```
[WEBHOOK] Received: event=qrcode.updated ← SÓ QR CODE CHEGA
[WEBHOOK] Skipping event: qrcode.updated
```

## 📊 Instâncias Disponíveis (segundo seus prints)

1. **c680d58f04ed48c97cb13bd3b5b7a05b_1763124756427** - Status: Conectando
2. **intelfoz_movel_1763131143017** - Status: Conectando  
3. **Intelfoz_Movel** - Status: ✅ **Conectado** (554599053700) - **USE ESTA!**

## ⚡ Próximos Passos

1. **Configure webhooks** na Evolution API (passo acima)
2. **Envie mensagem** de teste para 554599053700
3. **Verifique logs** para ver `messages.upsert`
4. Se funcionar, testarei **Dialogflow** automaticamente

---

## 🆘 Troubleshooting

### Webhooks não chegam
- Verifique URL do webhook está correta
- Confirme que eventos `MESSAGES_UPSERT` está ativado
- Teste conexão: `curl -X POST <webhook_url>`

### Mensagens não aparecem
- Verifique integração auto-criada existe (id=37)
- Confirme instância está **conectada**
- Veja logs: `grep "WEBHOOK" backend.log`
