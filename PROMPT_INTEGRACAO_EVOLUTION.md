# 🔗 Prompt para Integração Evolution API

Use este prompt para integrar Evolution API em outros sistemas semelhantes ao Atendechat.

---

## 📋 Contexto da Integração

### O que é Evolution API?
Evolution API é uma solução para integração com WhatsApp que substitui o Baileys (WhatsApp Web). Ela oferece:
- ✅ Mais estável que conexões via WhatsApp Web
- ✅ Suporte a múltiplas instâncias
- ✅ Webhooks para receber mensagens em tempo real
- ✅ API REST completa para envio de mensagens
- ✅ Gerenciamento de QR Codes e status de conexão

### Arquitetura de Integração
```
┌───────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Seu Sistema  │         │  Evolution API   │         │  WhatsApp   │
│               │         │                  │         │             │
│  Frontend:    │         │  Instâncias:     │         │             │
│  - Criar      │────1───▶│  - Criar         │         │             │
│    conexão    │         │  - Gerar QR      │◀───2────│  QR Code    │
│  - Exibir QR  │◀───3────│  - Status        │         │             │
│               │         │                  │         │             │
│  Backend:     │         │  Webhooks:       │         │             │
│  - Processar  │◀───4────│  - Mensagens     │◀───────│  Mensagens  │
│    webhook    │         │  - Conexão       │         │             │
│  - Enviar     │────5───▶│  - Envio         │────────▶│  Entrega    │
│    mensagens  │         │                  │         │             │
└───────────────┘         └──────────────────┘         └─────────────┘
```

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: Criação de Múltiplas Integrações Duplicadas

**Sintoma:**
- Criar 1 conexão gera 2-3 integrações duplicadas
- QR Code não aparece
- Nomes duplicados (Ex: "Evolution - Evolution - nome")

**Causa Raiz:**
```typescript
// ❌ PROBLEMA: Auto-criação via webhook sem debounce
if (!apiIntegration) {
  // Webhook dispara múltiplas vezes
  apiIntegration = await ApiIntegration.create({
    name: `Evolution - ${instance}`,
    // ...
  });
  // ⚠️ Sem verificação de existência prévia!
}
```

**Solução 1: Adicionar Lock/Debounce**
```typescript
// ✅ SOLUÇÃO: Verificar existência antes de criar
const existingIntegration = await ApiIntegration.findOne({
  where: {
    companyId,
    type: "evolution",
    instanceName: instance
  },
  lock: true // Lock pessimístico para prevenir race condition
});

if (!existingIntegration) {
  // Criar apenas se NÃO existir
  apiIntegration = await ApiIntegration.create({
    name: `Evolution - ${instance}`,
    type: "evolution",
    baseUrl,
    apiKey,
    instanceName: instance,
    isActive: true,
    companyId
  });
  logger.info(`✅ Created integration: ${apiIntegration.id}`);
} else {
  apiIntegration = existingIntegration;
  logger.info(`♻️ Using existing integration: ${apiIntegration.id}`);
}
```

**Solução 2: Desabilitar Auto-criação e Exigir Criação Manual**
```typescript
// ✅ ALTERNATIVA: Não criar automaticamente
if (!apiIntegration) {
  logger.warn(`Integration not found for instance: ${instance}`);
  logger.warn(`Please create integration manually first`);
  return; // ❌ NÃO criar automaticamente
}
```

---

### Problema 2: QR Code Não Aparece

**Sintoma:**
- Modal abre mas QR Code não renderiza
- Instância não encontrada no Evolution

**Causa:**
A instância **não existe** no Evolution API. O sistema espera que você crie manualmente.

**Solução: Criar Instância Automaticamente**
```typescript
// Backend: Endpoint para criar conexão
export const createConnection = async (req, res) => {
  const { instanceName } = req.body;
  const { companyId } = req.user;
  
  // 1. Buscar integração Evolution configurada
  const integration = await ApiIntegration.findOne({
    where: { companyId, type: "evolution", isActive: true }
  });
  
  if (!integration) {
    return res.status(404).json({ 
      error: "Configure Evolution API integration first" 
    });
  }
  
  // 2. Criar instância no Evolution
  const evolutionService = new EvolutionApiService({
    baseUrl: integration.baseUrl,
    apiKey: integration.apiKey
  });
  
  // Verificar se instância já existe
  try {
    const status = await evolutionService.getInstanceStatus(instanceName);
    if (status) {
      return res.json({ message: "Instance already exists", status });
    }
  } catch (error) {
    // Instância não existe, criar
  }
  
  // 3. Criar nova instância
  const instance = await evolutionService.createInstance({
    instanceName,
    token: integration.apiKey,
    number: "",
    qrcode: true,
    webhookUrl: `${BACKEND_URL}/api-integrations/webhook/${companyId}`,
    webhookEvents: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  });
  
  // 4. Atualizar integração com nome da instância
  await integration.update({ instanceName });
  
  // 5. Buscar QR Code
  const qrcode = await evolutionService.getQrCode(instanceName);
  
  return res.json({
    instance,
    qrcode: qrcode.code,
    base64: qrcode.base64
  });
};
```

---

### Problema 3: Webhooks Não Chegam

**Sintoma:**
- Mensagens enviadas no WhatsApp não aparecem no sistema
- Webhook nunca dispara

**Causa:**
1. URL do webhook incorreta
2. Eventos não configurados no Evolution
3. HTTPS necessário (Evolution não aceita HTTP local)

**Solução:**
```typescript
// 1. Usar URL pública do backend
const BACKEND_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:8080";

// 2. Configurar webhook na criação da instância
const webhookUrl = `${BACKEND_URL}/api-integrations/webhook/${companyId}`;

await evolutionService.createInstance({
  webhookUrl,
  webhookEvents: [
    "MESSAGES_UPSERT",      // ⭐ Mensagens recebidas
    "CONNECTION_UPDATE",     // ⭐ Status de conexão
    "SEND_MESSAGE",          // Confirmação de envio
    "MESSAGES_UPDATE",       // Atualização de mensagens
    "MESSAGES_DELETE"        // Mensagens deletadas
  ]
});

// 3. Processar webhook corretamente
export const processWebhook = async (webhookData, companyId) => {
  let { event, instance, data } = webhookData;
  
  // ⚠️ IMPORTANTE: Normalizar evento
  // Evolution envia: MESSAGES_UPSERT
  // Código espera: messages.upsert
  event = event.toLowerCase().replace(/_/g, ".");
  
  if (event === "messages.upsert") {
    // Extrair mensagens do array
    const messages = data.messages || [data];
    
    for (const message of messages) {
      await processMessage(message, companyId);
    }
  }
};
```

---

### Problema 4: Estrutura de Payload Diferente

**Sintoma:**
- `message.key.remoteJid` é undefined
- Mensagens não processadas corretamente

**Causa:**
Evolution API envia estrutura diferente do Baileys.

**Solução: Normalizar Payload**
```typescript
// ✅ Interface unificada para ambos (Baileys + Evolution)
interface NormalizedMessage {
  id: string;
  from: string;
  body: string;
  timestamp: number;
  messageType: string;
  isGroup: boolean;
}

function normalizeEvolutionMessage(message: any): NormalizedMessage {
  // Evolution API envia:
  // - message.key.remoteJid (individual)
  // - message.key.participant (grupo)
  // - message.message.conversation (texto)
  
  const remoteJid = message.key?.remoteJid || message.key?.id?.remote;
  const from = message.key?.fromMe ? "me" : (message.key?.participant || remoteJid);
  
  // Extrair texto de diferentes tipos de mensagem
  const conversation = 
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    "";
  
  return {
    id: message.key?.id,
    from,
    body: conversation,
    timestamp: message.messageTimestamp,
    messageType: Object.keys(message.message || {})[0],
    isGroup: remoteJid?.includes("@g.us")
  };
}
```

---

## ✅ Checklist Completo de Integração

### Backend

- [ ] **Criar modelo de dados**
  ```typescript
  interface ApiIntegration {
    id: number;
    name: string;
    type: "evolution" | "baileys";
    baseUrl: string;          // Ex: https://evolution.intelfoz.app.br
    apiKey: string;            // API Key global da Evolution
    instanceName: string;      // Nome da instância específica
    webhookUrl: string;
    isActive: boolean;
    companyId: number;
  }
  ```

- [ ] **Criar serviço Evolution API**
  - Método: `createInstance()`
  - Método: `getQrCode(instanceName)`
  - Método: `getInstanceStatus(instanceName)`
  - Método: `sendTextMessage(instanceName, to, text)`
  - Método: `sendMediaMessage(instanceName, to, media)`

- [ ] **Criar endpoint de webhook**
  ```
  POST /api-integrations/webhook/:companyId
  ```

- [ ] **Processar eventos do webhook**
  - `MESSAGES_UPSERT` → Criar mensagem no banco
  - `CONNECTION_UPDATE` → Atualizar status da conexão
  - `SEND_MESSAGE` → Confirmar envio

- [ ] **Implementar provider pattern**
  ```typescript
  interface WhatsAppProvider {
    sendText(to: string, text: string): Promise<void>;
    sendMedia(to: string, media: MediaData): Promise<void>;
  }
  
  class EvolutionProvider implements WhatsAppProvider { }
  class BaileysProvider implements WhatsAppProvider { }
  ```

### Frontend

- [ ] **Criar página de integrações**
  - Listar integrações Evolution
  - Criar nova integração
  - Editar/Deletar integração

- [ ] **Criar modal de conexão**
  - Input: Nome da instância
  - Botão: "Conectar"
  - Exibir: QR Code ou status

- [ ] **Socket.IO para atualizações em tempo real**
  ```javascript
  socket.on(`company-${companyId}-whatsapp`, (data) => {
    if (data.action === "update") {
      // Atualizar status da conexão
    }
  });
  ```

### Evolution API

- [ ] **Criar integração global**
  1. Acesse: `https://evolution.intelfoz.app.br/manager`
  2. Crie API Key global
  3. Salve no backend

- [ ] **Criar instância para cada conexão**
  - Via API ou interface web
  - Configure webhook URL
  - Habilite eventos necessários

- [ ] **Testar webhook**
  1. Envie mensagem WhatsApp
  2. Verifique logs do backend
  3. Confirme processamento

---

## 📚 Exemplo Completo de Código

### 1. Serviço Evolution API
```typescript
import axios from "axios";

export default class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor({ baseUrl, apiKey }) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Criar instância
  async createInstance(data: {
    instanceName: string;
    token: string;
    qrcode: boolean;
    webhookUrl: string;
    webhookEvents: string[];
  }) {
    const response = await axios.post(
      `${this.baseUrl}/instance/create`,
      {
        instanceName: data.instanceName,
        token: data.token,
        qrcode: data.qrcode,
        webhook: {
          url: data.webhookUrl,
          events: data.webhookEvents
        }
      },
      {
        headers: { apikey: this.apiKey }
      }
    );
    return response.data;
  }

  // Buscar QR Code
  async getQrCode(instanceName: string) {
    const response = await axios.get(
      `${this.baseUrl}/instance/connect/${instanceName}`,
      {
        headers: { apikey: this.apiKey }
      }
    );
    return response.data;
  }

  // Buscar status
  async getInstanceStatus(instanceName: string) {
    const response = await axios.get(
      `${this.baseUrl}/instance/connectionState/${instanceName}`,
      {
        headers: { apikey: this.apiKey }
      }
    );
    return response.data;
  }

  // Enviar mensagem de texto
  async sendTextMessage(instanceName: string, to: string, text: string) {
    const response = await axios.post(
      `${this.baseUrl}/message/sendText/${instanceName}`,
      {
        number: to,
        text
      },
      {
        headers: { apikey: this.apiKey }
      }
    );
    return response.data;
  }

  // Enviar mídia
  async sendMediaMessage(instanceName: string, to: string, media: {
    mediatype: "image" | "video" | "audio" | "document";
    media: string; // URL ou base64
    caption?: string;
  }) {
    const response = await axios.post(
      `${this.baseUrl}/message/sendMedia/${instanceName}`,
      {
        number: to,
        ...media
      },
      {
        headers: { apikey: this.apiKey }
      }
    );
    return response.data;
  }
}
```

### 2. Processador de Webhook
```typescript
export const processWebhook = async (webhookData: any, companyId: number) => {
  let { event, instance, data } = webhookData;

  // Normalizar evento
  event = event.toLowerCase().replace(/_/g, ".");

  // Buscar integração
  const integration = await ApiIntegration.findOne({
    where: {
      companyId,
      type: "evolution",
      instanceName: instance,
      isActive: true
    },
    lock: true // ⭐ Prevenir race condition
  });

  if (!integration) {
    // Verificar novamente antes de criar (anti-duplicação)
    const existing = await ApiIntegration.findOne({
      where: { companyId, type: "evolution", instanceName: instance }
    });
    
    if (existing) {
      integration = existing;
    } else {
      integration = await ApiIntegration.create({
        name: `Evolution - ${instance}`,
        type: "evolution",
        baseUrl: "https://evolution.intelfoz.app.br",
        apiKey: process.env.EVOLUTION_API_KEY,
        instanceName: instance,
        isActive: true,
        companyId
      });
    }
  }

  // Processar mensagens
  if (event === "messages.upsert") {
    const messages = data.messages || [data];
    
    for (const msg of messages) {
      // Ignorar mensagens enviadas por mim
      if (msg.key?.fromMe) continue;

      // Normalizar estrutura
      const normalized = {
        from: msg.key?.remoteJid || msg.key?.id?.remote,
        participant: msg.key?.participant,
        body: msg.message?.conversation || 
              msg.message?.extendedTextMessage?.text || "",
        timestamp: msg.messageTimestamp,
        isGroup: msg.key?.remoteJid?.includes("@g.us")
      };

      // Processar mensagem
      await createMessage({
        companyId,
        body: normalized.body,
        from: normalized.from,
        timestamp: normalized.timestamp,
        integrationId: integration.id
      });
    }
  }

  // Processar atualização de conexão
  if (event === "connection.update") {
    const state = data.state?.toString().toUpperCase();
    
    if (["OPEN", "CONNECTED"].includes(state)) {
      // Marcar como conectado
      await updateConnectionStatus(integration.id, "connected");
    } else if (state === "CLOSE") {
      // Marcar como desconectado
      await updateConnectionStatus(integration.id, "disconnected");
    }
  }
};
```

### 3. Frontend - Modal de Conexão
```jsx
const ConnectInstanceModal = ({ integrationId, companyId }) => {
  const [instanceName, setInstanceName] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Criar conexão
      const { data } = await api.post(
        `/api-integrations/${integrationId}/connection-status`,
        { instanceName }
      );

      if (data.connected) {
        toast.success("Conexão já está ativa!");
      } else {
        setQrCode(data.base64 || data.qrcode);
        toast.info("QR Code gerado! Leia para conectar.");
      }
    } catch (error) {
      toast.error("Erro ao conectar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Conectar WhatsApp</DialogTitle>
      <DialogContent>
        <TextField
          label="Nome da Instância"
          value={instanceName}
          onChange={(e) => setInstanceName(e.target.value)}
          placeholder="Ex: minha-empresa-whatsapp"
        />
        
        <Button onClick={handleConnect} disabled={loading}>
          {loading ? <CircularProgress /> : "Conectar"}
        </Button>

        {qrCode && (
          <div>
            <Typography>Escaneie o QR Code:</Typography>
            <img src={qrCode} alt="QR Code" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

---

## 🎯 Boas Práticas

### 1. Segurança
- ✅ **NUNCA** exponha API Keys no frontend
- ✅ Use variáveis de ambiente para credenciais
- ✅ Valide webhooks com assinatura HMAC (se disponível)
- ✅ Limite acesso ao endpoint de webhook por IP (opcional)

### 2. Performance
- ✅ Use lock pessimístico para prevenir race conditions
- ✅ Implemente retry com exponential backoff
- ✅ Cache status de conexão (TTL: 30s)
- ✅ Use filas (Bull/Redis) para processar webhooks assíncronos

### 3. Monitoramento
- ✅ Log detalhado de webhooks recebidos
- ✅ Alerta quando webhook falha
- ✅ Dashboard de status de conexões
- ✅ Métricas: mensagens enviadas/recebidas por minuto

### 4. Resiliência
- ✅ Retry automático em caso de falha (3x)
- ✅ Fallback para Baileys se Evolution falhar
- ✅ Reconexão automática a cada 5 minutos
- ✅ Health check de instâncias a cada 1 minuto

---

## 🆘 Troubleshooting

### Logs Úteis
```bash
# Ver webhooks chegando
grep "WEBHOOK.*messages.upsert" /tmp/logs/backend*.log

# Ver erros de criação
grep "Failed to auto-create" /tmp/logs/backend*.log

# Ver status de conexão
grep "connection.update.*OPEN" /tmp/logs/backend*.log
```

### Comandos de Debug
```typescript
// Backend: Verificar integração existe
SELECT * FROM "ApiIntegrations" 
WHERE "type" = 'evolution' 
AND "companyId" = 1;

// Backend: Verificar conexão WhatsApp
SELECT * FROM "Whatsapps" 
WHERE "apiIntegrationId" IS NOT NULL;

// Frontend: Testar API diretamente
fetch("https://evolution.intelfoz.app.br/instance/connectionState/INSTANCE", {
  headers: { apikey: "YOUR_KEY" }
}).then(r => r.json()).then(console.log);
```

---

## 📖 Recursos Adicionais

- **Documentação Evolution API**: https://doc.evolution-api.com
- **Exemplo Atendechat**: `EVOLUTION_API_SETUP.md`
- **Bug Report Detalhado**: `EVOLUTION_BUG_REPORT.md`

---

**Versão:** 1.0  
**Última atualização:** 14/11/2025  
**Autor:** Atendechat Team  
**Status:** ✅ Testado e funcionando
