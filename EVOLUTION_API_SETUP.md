# 🔧 Configuração Evolution API - Webhooks de Mensagens

## 📋 Problema Atual
✅ Webhooks QR Code funcionando  
❌ **Webhooks de Mensagens NÃO chegam** (messages.upsert, messages.update)

## 🎯 Solução: Configurar Webhooks na Evolution API

### ⭐ Método Manual: Via Interface Web (RECOMENDADO - USE ESTE!)

#### Passo a Passo com Prints:

1. **Acesse Evolution Manager**  
   URL: `https://evolution.intelfoz.app.br/manager`

2. **Selecione a instância CONECTADA**  
   📱 `Intelfoz_Movel` (número: 554599053700) ← **USE ESTA!**

3. **Clique no ícone de ENGRENAGEM** ⚙️ (configurações)

4. **Aba "Webhook"** ou "Eventos" (dependendo da versão)

5. **Preencha os campos:**

   **Campo 1: Enable/Ativar Webhook**
   ```
   ✅ Marque como: ATIVADO / ENABLED
   ```

   **Campo 2: Webhook URL**
   ```
   📍 Cole EXATAMENTE:
   https://7b12b638-ed7a-4d8c-89cd-a7aedcd25a36-00-sic5vtm2zqa8.kirk.replit.dev/api-integrations/webhook/1
   ```

   **Campo 3: Webhook By Events** (pode ter outro nome como "Separar por eventos")
   ```
   ⚪ DESMARQUE esta opção (deixe DESATIVADO)
   ```

   **Campo 4: Eventos / Events** (marque TODOS estes):
   ```
   ☑️ QRCODE_UPDATED
   ☑️ CONNECTION_UPDATE  
   ☑️ MESSAGES_UPSERT ← 🔥 ESTE É O MAIS IMPORTANTE!
   ☑️ MESSAGES_UPDATE
   ☑️ MESSAGES_DELETE
   ```

6. **Clique em SALVAR** ou **APPLY**

7. **✅ PRONTO!** Agora teste enviando mensagem

---

### 📝 IMPORTANTE: Configurar APENAS na instância conectada!

**USE APENAS:**  
✅ `Intelfoz_Movel` (número 554599053700) - STATUS: CONECTADO

**NÃO CONFIGURE AINDA:**  
⏸️ `intelfoz_movel_1763131143017` - status: conectando  
⏸️ `c680d58f04ed48c97cb13bd3b5b7a05b_1763124756427` - status: conectando

_(Você pode configurar as outras depois que conectarem)_

---

### 🔍 Eventos Importantes - O que cada um faz:
Ative **obrigatoriamente**:
- ✅ `MESSAGES_UPSERT` - **Mensagens recebidas/enviadas** (CRÍTICO!)
- ✅ `CONNECTION_UPDATE` - Status de conexão
- ✅ `QRCODE_UPDATED` - QR Code
- ⚪ `MESSAGES_UPDATE` - Status mensagens (entregue/lida)
- ⚪ `MESSAGES_DELETE` - Mensagens deletadas (opcional)

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
