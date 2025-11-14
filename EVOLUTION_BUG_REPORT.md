# 🐛 Bug Report: Integração Evolution API com Atendechat

## 📋 Resumo do Problema

**Sistema funcionando parcialmente:**
- ✅ Conexões já estabelecidas no Evolution funcionam perfeitamente
- ❌ **Criar novas conexões duplica instâncias** e não exibe QR Code
- ❌ Múltiplas conexões criadas automaticamente sem necessidade

---

## 🎯 Comportamento Esperado vs Atual

### ✅ Comportamento Esperado (Correto)
1. Usuário clica em "Adicionar WhatsApp" no Atendechat
2. Sistema cria **UMA** integração Evolution API
3. Sistema cria **UMA** instância no Evolution
4. Modal exibe **QR Code** para conectar
5. Usuário escaneia QR Code
6. Conexão estabelecida

### ❌ Comportamento Atual (Bugado)
1. Usuário clica em "Adicionar WhatsApp" no Atendechat
2. Sistema cria **MÚLTIPLAS** integrações Evolution API (2-3 duplicadas)
3. Sistema cria **MÚLTIPLAS** instâncias no Evolution
4. Modal **NÃO exibe QR Code**
5. Conexão **não estabelecida**

**Workaround atual:** Criar instância **direto no Evolution** e depois vincular no Atendechat

---

## 📸 Evidências Visuais

### Print 1: Integrações Duplicadas no Atendechat
```
Nome                                                    | Status
------------------------------------------------------- | ------
Evolution - 554599053700_1763142919638                 | Ativo
Evolution - 554599053700_1763133226549                 | Ativo
Intelfoz_Movel                                         | Ativo
```
**Problema:** 3 integrações para 1 conexão real

### Print 2: Instância Conectada no Evolution
```
Instância: 554599053700_1763142919638
Usuário: Edson Odair Bonfante (554599053700@s.whatsapp.net)
Contatos: 1.467 | Chats: 848
Status: CONECTADO ✅
```

### Print 3: Conexão no Atendechat
```
Nome: Evolution - Evolution - 554599053700_1763142919638
Status: ✅ Conectado
Sessão: Conectar / Desconectar
Última atualização: 14/11/25 14:56
```
**Problema:** Nome duplicado "Evolution - Evolution -" sugere criação duplicada

---

## 🔍 Análise Técnica

### Arquitetura Atual

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Atendechat     │         │  Evolution API   │         │  WhatsApp   │
│                 │         │                  │         │             │
│  ┌──────────┐   │         │  ┌───────────┐   │         │             │
│  │ Modal    │───┼────1───▶│  │ Instância │   │         │             │
│  │ WhatsApp │   │         │  │ (criada)  │───┼────2───▶│  QR Code    │
│  └──────────┘   │         │  └───────────┘   │         │             │
│       │         │         │                  │         │             │
│       └─────────┼────3────┤  Webhook         │         │             │
│  ┌──────────┐   │    ▲    │  (mensagens)     │         │             │
│  │ Atendi-  │◀──┼────┘    └──────────────────┘         └─────────────┘
│  │ mentos   │   │
│  └──────────┘   │
└─────────────────┘
```

### Fluxo de Criação (Bugado)

```typescript
// ❌ PROBLEMA: Múltiplas chamadas à Evolution API
function handleCreateConnection() {
  // 1. Cria integração no banco
  createApiIntegration() // → Integração ID 37
  
  // 2. Cria instância no Evolution (BUG: chamado múltiplas vezes)
  createEvolutionInstance() // → Instância 1: 554599053700_1763142919638
  createEvolutionInstance() // → Instância 2: 554599053700_1763133226549 ❌
  createEvolutionInstance() // → Instância 3: Intelfoz_Movel ❌
  
  // 3. Busca QR Code (BUG: instância errada ou não encontrada)
  getQrCode() // → ❌ Retorna vazio ou erro
}
```

---

## 🛠️ Código Problemático (Hipótese)

### Possível Causa 1: Loop de Re-renders no Frontend
```jsx
// ConnectInstanceModal.js
useEffect(() => {
  if (selectedIntegration) {
    // ❌ BUG: useEffect dispara múltiplas vezes
    createEvolutionInstance(selectedIntegration);
  }
}, [selectedIntegration]); // Dependency pode estar causando loop
```

### Possível Causa 2: Webhook Auto-criação
```typescript
// ProcessEvolutionWebhookService.ts
if (!apiIntegration) {
  // ❌ BUG: Webhook cria integração automaticamente
  apiIntegration = await ApiIntegration.create({
    name: `Evolution - ${instance}`,
    // ...
  });
}
```

### Possível Causa 3: Sincronização Estado
```typescript
// ❌ BUG: Estado não sincronizado entre Evolution e Atendechat
// Evolution cria instância → Webhook dispara → Atendechat cria integração duplicada
```

---

## 🎯 Pontos de Investigação

### Frontend (React)
- [ ] `ConnectInstanceModal.js` - Verificar useEffect dependencies
- [ ] `WhatsAppModal/index.js` - Verificar lógica de criação
- [ ] Estado global (Zustand/Context) - Verificar re-renders

### Backend (Node.js/TypeScript)
- [ ] `EvolutionApiService.ts` - Método `createInstance()`
- [ ] `ProcessEvolutionWebhookService.ts` - Auto-criação de integrações
- [ ] `ApiIntegrationController.ts` - Endpoint de criação

### Sincronização
- [ ] Race condition entre webhook e criação manual
- [ ] Duplicação de nomes de instância
- [ ] Validação de instância existente antes de criar

---

## 🔧 Solução Proposta

### Fase 1: Prevenir Duplicação
```typescript
// Backend: Verificar instância existente ANTES de criar
async createInstance(name: string) {
  // 1. Verificar se instância já existe
  const existing = await checkInstanceExists(name);
  if (existing) {
    return existing; // ✅ Retornar existente
  }
  
  // 2. Criar nova instância
  const instance = await evolutionApi.createInstance(name);
  return instance;
}
```

### Fase 2: Debounce no Frontend
```jsx
// Frontend: Prevenir múltiplas chamadas
const debouncedCreate = useMemo(
  () => debounce(createConnection, 1000),
  []
);
```

### Fase 3: Desativar Auto-criação Webhook
```typescript
// Webhook: NÃO criar integração automaticamente para eventos de criação
if (event === 'connection.update' && !apiIntegration) {
  logger.warn(`Instance ${instance} not found, skipping webhook`);
  return; // ✅ Não criar automaticamente
}
```

---

## ✅ Critérios de Sucesso

1. ✅ Criar nova conexão gera **APENAS 1** integração
2. ✅ Criar nova conexão gera **APENAS 1** instância no Evolution
3. ✅ Modal exibe **QR Code** imediatamente
4. ✅ Não há duplicações de nome (sem "Evolution - Evolution -")
5. ✅ Webhook processa eventos sem criar duplicatas

---

## 📝 Checklist de Testes

### Teste 1: Criar Nova Conexão
- [ ] Clicar em "Adicionar WhatsApp"
- [ ] Verificar: **1 integração** criada
- [ ] Verificar: **1 instância** no Evolution
- [ ] Verificar: **QR Code exibido**
- [ ] Escanear QR Code
- [ ] Verificar: Conexão estabelecida

### Teste 2: Conexão Existente
- [ ] Conexão já estabelecida funciona
- [ ] Mensagens recebidas aparecem em Atendimentos
- [ ] Mensagens enviadas chegam no WhatsApp

### Teste 3: Webhook
- [ ] Enviar mensagem WhatsApp
- [ ] Verificar: **1 mensagem** em Atendimentos
- [ ] Verificar: **SEM duplicatas**

---

## 🆘 Informações para Suporte

**Stack:**
- Frontend: React 17 + Material-UI v4
- Backend: Node.js v20 + TypeScript + Express
- Database: PostgreSQL (Neon)
- Evolution API: v2.x (https://evolution.intelfoz.app.br)

**Versão do Código:**
- Commit: [inserir hash do commit]
- Data: 14/11/2025

**Logs Relevantes:**
```
[WEBHOOK] Received: event=connection.update
[WEBHOOK] Auto-created integration: id=37
[WEBHOOK] Auto-created integration: id=38 ❌ DUPLICADO
[WEBHOOK] Auto-created integration: id=39 ❌ DUPLICADO
```

---

## 📞 Próximos Passos

1. **Investigar logs** durante criação de conexão
2. **Adicionar logs detalhados** no fluxo de criação
3. **Implementar validação** anti-duplicação
4. **Testar** com nova conexão limpa
5. **Documentar** fluxo correto

---

**Data do Report:** 14/11/2025  
**Prioridade:** 🔴 Alta (funcionalidade crítica bloqueada)  
**Status:** 🔍 Em investigação
