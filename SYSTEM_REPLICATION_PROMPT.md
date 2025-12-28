
# PROMPT DE REPLICAÇÃO COMPLETO - ATENDECHAT

## 📋 VISÃO GERAL DO SISTEMA

Você é um assistente especializado que vai construir uma cópia exata do **Atendechat** - uma plataforma completa de atendimento ao cliente integrada com WhatsApp, incluindo multi-tenancy, campanhas, chatbots com fluxos visuais, integrações com Evolution API, OpenAI, e sistema completo de tickets.

## 🏗️ ARQUITETURA DO SISTEMA

### Stack Tecnológico

**Backend:**
- Node.js v20.x com TypeScript
- Express.js (API REST)
- PostgreSQL com Sequelize ORM v5
- Redis (Bull Queue para processamento assíncrono)
- Socket.IO v4 (comunicação real-time)
- JWT (autenticação)
- Baileys v6.7 (WhatsApp - desabilitado em produção)
- Evolution API (WhatsApp provider principal)
- OpenAI API v3.3 (IA)

**Frontend:**
- React v17
- Material-UI v4
- React Query (cache/state)
- Zustand (state management)
- Socket.IO Client
- React Flow (construtor visual de fluxos)
- Chart.js v3 (dashboards)

**Infraestrutura:**
- Deployment: VM (Replit)
- Database: PostgreSQL (Neon - externo)
- Cache/Queue: Redis local
- Portas: Backend 8080, Frontend 5000, Redis 6379

## 🗄️ ESTRUTURA DE BANCO DE DADOS

### Tabelas Principais (ordem de criação):

1. **Companies** - Multi-tenancy
   - id, name, phone, email, status (active/inactive)
   - planId, dueDate, recurrence
   - Configurações de campanhas, schedules

2. **Plans** - Planos de assinatura
   - id, name, users, connections, queues, value
   - useSchedules, useCampaigns, useInternalChat, useExternalApi, useKanban, useOpenAi, useIntegrations

3. **Users** - Usuários do sistema
   - id, name, email, passwordHash, profile (admin/user), super (boolean)
   - companyId, tokenVersion, online

4. **Contacts** - Contatos/Clientes
   - id, name, number, email, profilePicUrl, isGroup, disableBot
   - companyId, whatsappId, extraInfo (JSONB)

5. **Whatsapps** - Conexões WhatsApp
   - id, name, status, qrcode, battery, plugged, retries
   - number, provider (baileys/evolution/cloudapi)
   - connectionType, cloudApiToken, cloudApiNumberId, cloudApiBusinessId
   - token (Evolution API), greetingMessage, farewellMessage, complationMessage, outOfHoursMessage, ratingMessage
   - companyId, isDefault

6. **Queues** - Filas de atendimento
   - id, name, color, greetingMessage, outOfHoursMessage
   - schedules (JSONB), startTime, endTime
   - companyId

7. **Tickets** - Tickets de atendimento
   - id, status (open/pending/closed), lastMessage, isGroup
   - contactId, userId, whatsappId, queueId
   - uuid, unreadMessages, amountUsedBotQueues
   - companyId

8. **Messages** - Mensagens
   - id, body, ack, read, fromMe, mediaUrl, mediaType
   - ticketId, contactId, quotedMsgId, queueId
   - isDeleted, remoteJid, participant, dataJson
   - companyId

9. **Tags** - Tags/Etiquetas
   - id, name, color, kanban
   - companyId

10. **TicketTags** - Relacionamento Tickets-Tags
    - ticketId, tagId

11. **Campaigns** - Campanhas de marketing
    - id, name, message, status, scheduledAt, completedAt
    - confirmation, contactListId, whatsappId, companyId

12. **ContactLists** - Listas de contatos
    - id, name, companyId

13. **ContactListItems** - Itens das listas
    - id, name, number, email, contactListId, companyId

14. **FlowBuilder** - Fluxos de chatbot
    - id, name, flowData (JSONB), userId, companyId

15. **Schedules** - Agendamentos de mensagens
    - id, body, sendAt, sentAt, contactId, ticketId, userId, companyId, status

16. **ApiIntegrations** - Integrações externas
    - id, name, apiKey, apiUrl, enabled, companyId

17. **QueueOptions** - Opções de menu dos chatbots
    - id, title, message, option, queueId, parentId

18. **QuickMessages** - Mensagens rápidas
    - id, shortcut, message, userId, companyId
    - mediaPath, mediaName

19. **Settings** - Configurações do sistema
    - key, value, companyId

20. **TicketNotes** - Notas internas dos tickets
    - id, note, userId, contactId, ticketId

21. **Chats** - Chat interno entre atendentes
    - id, uuid, title, ownerId, companyId

22. **ChatMessages** - Mensagens do chat interno
    - id, message, mediaPath, mediaName, chatId, senderId

23. **Announcements** - Anúncios do sistema
    - id, title, text, mediaPath, mediaName, companyId

24. **Helps** - Central de ajuda
    - id, title, description, video, companyId

25. **Prompts** - Prompts OpenAI
    - id, name, prompt, apiKey, queueId, maxTokens, temperature, companyId

26. **QueueIntegrations** - Integrações com filas
    - id, type (dialogflow/n8n/typebot/webhook), name, projectName, jsonContent, language, urlN8N, typebotUrl, typebotName, typebotExpire
    - queueId, companyId

27. **Files** - Arquivos do sistema
    - id, name, path, companyId

28. **Invoices** - Faturas
    - id, detail, status, value, users, connections, queues, dueDate, companyId

29. **Subscriptions** - Assinaturas
    - id, isActive, userId, expiresAt, companyId

30. **Baileys** - Sessões Baileys (WhatsApp Web)
    - id, whatsappId, contacts, chats, messages

## 🔧 VARIÁVEIS DE AMBIENTE

### Backend (.env):

```env
# Node
NODE_ENV=production
PORT=8080
BACKEND_URL=https://seu-backend.replit.app
FRONTEND_URL=https://seu-projeto.replit.app
PROXY_PORT=443

# Database PostgreSQL (Neon)
DB_DIALECT=postgres
DB_HOST=seu-host.neon.tech
DB_PORT=5432
DB_USER=seu-usuario
DB_PASS=sua-senha
DB_NAME=seu-database
DATABASE_URL=postgresql://usuario:senha@host:5432/database?sslmode=require

# JWT
JWT_SECRET=seu-jwt-secret-super-secreto-aqui
JWT_REFRESH_SECRET=seu-refresh-secret-super-secreto-aqui

# Redis
REDIS_URI=redis://:@127.0.0.1:6379
REDIS_OPT_LIMITER_MAX=1
REGIS_OPT_LIMITER_DURATION=3000

# Limites
USER_LIMIT=10
CONNECTIONS_LIMIT=10
CLOSED_SEND_BY_ME=true

# Email (opcional)
MAIL_HOST=smtp.gmail.com
MAIL_USER=seu@email.com
MAIL_PASS=sua-senha-app
MAIL_FROM=seu@email.com
MAIL_PORT=465

# Gerencianet (opcional)
GERENCIANET_SANDBOX=false
GERENCIANET_CLIENT_ID=
GERENCIANET_CLIENT_SECRET=
GERENCIANET_PIX_CERT=
GERENCIANET_PIX_KEY=
```

### Frontend (.env):

```env
REACT_APP_BACKEND_URL=https://seu-backend.replit.app
REACT_APP_HOURS_CLOSE_TICKETS_AUTO=24
```

## 📁 ESTRUTURA DE ARQUIVOS CRÍTICOS

### Backend Core:

1. **backend/src/app.ts** - Configuração Express
2. **backend/src/server.ts** - Servidor principal (serve frontend em produção)
3. **backend/src/bootstrap.ts** - Inicialização
4. **backend/src/queues.ts** - Configuração Bull
5. **backend/src/database/index.ts** - Conexão DB
6. **backend/src/libs/socket.ts** - Socket.IO
7. **backend/src/libs/wbot.ts** - WhatsApp (Baileys - desabilitado)

### Providers WhatsApp:

1. **backend/src/services/WbotServices/providers/ProviderFactory.ts**
   - BAILEYS_DISABLED = true
   - Roteia tudo para EvolutionProvider

2. **backend/src/services/WbotServices/providers/EvolutionProvider.ts**
   - Implementa WhatsAppProvider
   - Métodos: initSession, disconnect, sendMessage, sendMedia, getQRCode
   - Webhook processing

3. **backend/src/services/WbotServices/wbotMessageListener.ts**
   - Processa mensagens recebidas
   - Lógica de chatbot/fluxos
   - handleMessage, verifyQueue, handleChartbot, handleRating

### Services Principais:

1. **CreateEvolutionWhatsAppService.ts** - Cria conexão Evolution
2. **FindOrCreateTicketService.ts** - Gerencia tickets
3. **SendWhatsAppMessage.ts** - Envia mensagens
4. **SendWhatsAppMedia.ts** - Envia mídia
5. **ProcessEvolutionWebhookService.ts** - Processa webhooks

### Helpers:

1. **backend/src/helpers/Mustache.ts** - Templates de mensagens
   - Variáveis: {{protocol}}, {{atendente}}, {{nome}}, {{email}}, {{numero}}, {{saudacao}}, etc.

### Controllers:

1. **WhatsAppController.ts** - CRUD conexões
2. **TicketController.ts** - Gestão tickets
3. **MessageController.ts** - Mensagens
4. **CampaignController.ts** - Campanhas
5. **FlowBuilderController.ts** - Fluxos chatbot

### Frontend Core:

1. **frontend/src/App.js** - Rotas principais
2. **frontend/src/layout/index.js** - Layout principal
3. **frontend/src/services/socket.js** - Socket.IO client
4. **frontend/src/context/Auth/AuthContext.js** - Autenticação
5. **frontend/src/context/Socket/SocketContext.js** - Socket global

### Páginas Principais:

1. **frontend/src/pages/Login/index.js**
2. **frontend/src/pages/Dashboard/index.js**
3. **frontend/src/pages/Tickets/index.js** (layout tradicional)
4. **frontend/src/pages/TicketsCustom/index.js** (layout moderno)
5. **frontend/src/pages/Kanban/index.js** (kanban board)
6. **frontend/src/pages/Contacts/index.js**
7. **frontend/src/pages/Campaigns/index.js**
8. **frontend/src/pages/FlowBuilder/index.js**
9. **frontend/src/pages/Connections/index.js**

### Componentes Críticos:

1. **MessagesList** - Lista de mensagens
2. **MessageInputCustom** - Input de mensagens
3. **TicketsListCustom** - Lista de tickets
4. **TicketActionButtonsCustom** - Ações do ticket
5. **QrcodeModal** - QR Code WhatsApp
6. **FlowBuilderModal** - Editor de fluxos

## 🚀 SCRIPTS DE DEPLOYMENT

### build.sh:
```bash
#!/bin/bash
set -e
echo "📦 Building Atendechat..."

# Build backend
echo "🔨 Building backend..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install --include=dev
fi
npm run build
cd ..

# Build frontend
echo "🎨 Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --include=dev
fi
export NODE_OPTIONS=--openssl-legacy-provider
export GENERATE_SOURCEMAP=false
npm run build
cd ..

echo "✅ Full build completed successfully!"
```

### start-production.sh:
```bash
#!/bin/bash

# Kill existing processes
pkill -f "node dist/server.js" 2>/dev/null || true
sleep 1

# Start Redis
if ! redis-cli ping 2>/dev/null | grep -q "PONG"; then
  echo "Iniciando Redis..."
  redis-server --daemonize yes --port 6379 --protected-mode no
  sleep 2
fi

# Verify builds exist
if [ ! -d "backend/dist" ]; then
  echo "Backend não compilado. Executando build..."
  cd backend && npm run build && cd ..
fi

if [ ! -d "frontend/build" ]; then
  echo "Frontend build não encontrado. Executando build..."
  cd frontend && GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=3072 --openssl-legacy-provider" npm run build && cd ..
fi

echo "Iniciando aplicação na porta 5000..."
cd backend
PORT=5000 node dist/server.js
wait
```

## ⚙️ CONFIGURAÇÃO .replit

```toml
modules = ["nodejs-20", "bash", "web", "postgresql-16"]

[agent]
expertMode = true
integrations = ["javascript_openai_ai_integrations:1.0.0"]

[nix]
channel = "stable-25_05"
packages = ["redis"]

[[ports]]
localPort = 5000
externalPort = 80

[[ports]]
localPort = 8080
externalPort = 5000

[[ports]]
localPort = 6379
externalPort = 3000

[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "Project"
author = "agent"
mode = "sequential"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "redis-server --daemonize yes --port 6379 --protected-mode no"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "sleep 2 && redis-cli ping"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "cd backend && npm start & cd frontend && PORT=3000 BROWSER=none npm start & wait"

[deployment]
deploymentTarget = "vm"
run = ["bash", "start-production.sh"]
build = ["bash", "build.sh"]
```

## 📦 DEPENDÊNCIAS

### Backend (package.json):

```json
{
  "name": "backend",
  "version": "2.0.1",
  "dependencies": {
    "@adiwajshing/baileys": "^6.7.8",
    "@ffmpeg-installer/ffmpeg": "^1.1.0",
    "@sentry/node": "^5.29.2",
    "axios": "^1.7.9",
    "bcryptjs": "^2.4.3",
    "bull": "^4.16.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "date-fns": "^2.30.0",
    "dotenv": "^8.2.0",
    "express": "^4.17.1",
    "express-async-errors": "^3.1.1",
    "file-type": "^16.5.4",
    "fluent-ffmpeg": "^2.1.2",
    "form-data": "^4.0.1",
    "fs-extra": "^11.2.0",
    "http-graceful-shutdown": "^2.3.2",
    "ioredis": "^5.4.1",
    "jsonwebtoken": "^9.0.2",
    "mime": "^4.0.4",
    "multer": "^1.4.5-lts.1",
    "mysql2": "^2.3.3",
    "node-cron": "^3.0.3",
    "openai": "^3.3.0",
    "pg": "^8.13.1",
    "pg-hstore": "^2.3.4",
    "pino": "^6.14.0",
    "pino-pretty": "^4.8.0",
    "qrcode": "^1.5.4",
    "qrcode-terminal": "^0.12.0",
    "sequelize": "^5.22.5",
    "sequelize-cli": "^5.5.1",
    "sharp": "^0.33.5",
    "socket.io": "^4.8.1",
    "uuid": "^8.3.2",
    "xlsx": "^0.18.5",
    "yup": "^0.32.9"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/express": "^4.17.21",
    "@types/fs-extra": "^11.0.4",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^20.17.6",
    "@types/qrcode": "^1.5.5",
    "@types/sequelize": "^4.28.20",
    "@types/uuid": "^8.3.4",
    "@typescript-eslint/eslint-plugin": "^8.14.0",
    "@typescript-eslint/parser": "^8.14.0",
    "eslint": "^9.14.0",
    "nodemon": "^2.0.22",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "start": "nodemon dist/server.js",
    "dev": "tsnd --transpile-only --ignore-watch node_modules src/server.ts",
    "pretest": "NODE_ENV=test sequelize db:migrate",
    "test": "NODE_ENV=test jest",
    "posttest": "NODE_ENV=test sequelize db:migrate:undo:all"
  }
}
```

### Frontend (package.json):

```json
{
  "name": "frontend",
  "version": "2.0.1",
  "private": true,
  "dependencies": {
    "@date-io/date-fns": "^1.3.13",
    "@emotion/react": "^11.13.5",
    "@emotion/styled": "^11.13.5",
    "@material-ui/core": "^4.12.4",
    "@material-ui/icons": "^4.11.3",
    "@material-ui/lab": "^4.0.0-alpha.61",
    "@material-ui/pickers": "^3.3.11",
    "@mui/icons-material": "^6.1.7",
    "@mui/material": "^6.1.7",
    "@mui/x-date-pickers": "^6.20.2",
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/react": "^11.2.7",
    "@testing-library/user-event": "^12.8.3",
    "axios": "^1.7.9",
    "chart.js": "^3.9.1",
    "chartjs-adapter-date-fns": "^3.0.0",
    "clsx": "^1.2.1",
    "date-fns": "^2.30.0",
    "emoji-picker-react": "^3.6.1",
    "formik": "^2.4.6",
    "i18next": "^19.9.2",
    "i18next-browser-languagedetector": "^6.1.8",
    "markdown-to-jsx": "^7.5.0",
    "material-ui-chip-input": "^2.0.0-beta.2",
    "material-ui-color": "^1.2.0",
    "mic-recorder-to-mp3": "^2.2.2",
    "notistack": "^3.0.1",
    "qrcode.react": "^1.0.1",
    "react": "^17.0.2",
    "react-beautiful-dnd": "^13.1.1",
    "react-chartjs-2": "^4.3.1",
    "react-color": "^2.19.3",
    "react-csv": "^2.2.2",
    "react-dom": "^17.0.2",
    "react-flow-renderer": "^10.3.17",
    "react-modal-image": "^2.6.0",
    "react-number-format": "^4.9.4",
    "react-query": "^3.39.3",
    "react-router-dom": "^5.3.4",
    "react-scripts": "3.4.0",
    "react-toastify": "^8.2.0",
    "recharts": "^2.12.7",
    "serve": "^14.2.4",
    "socket.io-client": "^4.8.1",
    "use-sound": "^2.0.1",
    "uuid": "^10.0.0",
    "yup": "^0.32.11",
    "zustand": "^3.7.2"
  },
  "scripts": {
    "start": "BROWSER=none react-scripts start",
    "build": "DISABLE_ESLINT_PLUGIN=true react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

## 🔐 SEEDS (Dados Iniciais)

### 1. Empresa Padrão:
```sql
INSERT INTO "Companies" (id, name, phone, email, status, "planId", "dueDate", "createdAt", "updatedAt")
VALUES (1, 'Empresa Demo', '5500000000000', 'contato@empresa.com', 'active', 1, NOW() + INTERVAL '30 days', NOW(), NOW());
```

### 2. Plano Padrão:
```sql
INSERT INTO "Plans" (id, name, users, connections, queues, value, "useSchedules", "useCampaigns", "useInternalChat", "useExternalApi", "useKanban", "useOpenAi", "useIntegrations", "createdAt", "updatedAt")
VALUES (1, 'Plano 1', 10, 10, 10, 30, true, true, true, true, true, true, true, NOW(), NOW());
```

### 3. Usuário Admin:
```sql
INSERT INTO "Users" (id, name, email, "passwordHash", profile, super, "companyId", "tokenVersion", "createdAt", "updatedAt")
VALUES (1, 'Admin', 'admin@admin.com', '$2a$08$WaEmpmFDD/XkDqorkpQ42eUZozOqRCPkPcTkmHHMyuTGUOkI8dHsq', 'admin', true, 1, 0, NOW(), NOW());
-- Senha: admin
```

### 4. Settings Padrão:
```sql
INSERT INTO "Settings" (key, value, "companyId", "createdAt", "updatedAt") VALUES
('userCreation', 'enabled', 1, NOW(), NOW()),
('CheckMsgIsGroup', 'enabled', 1, NOW(), NOW()),
('call', 'disabled', 1, NOW(), NOW()),
('chatBotType', 'text', 1, NOW(), NOW()),
('acceptCallWhatsapp', 'disabled', 1, NOW(), NOW());
```

## 🎯 FUNCIONALIDADES PRINCIPAIS

### 1. Multi-Tenancy
- Isolamento completo por companyId
- Planos com limites configuráveis
- Controle de vencimento

### 2. WhatsApp Integration
- Evolution API (provider principal)
- Baileys (desabilitado em produção via BAILEYS_DISABLED=true)
- Cloud API support (Meta Business)
- QR Code authentication
- Webhook processing

### 3. Ticket System
- Status: open, pending, closed
- Assignment automático/manual
- Filas de atendimento
- Tags/Etiquetas
- Notas internas
- Transferências

### 4. Chatbot & Flows
- FlowBuilder visual (React Flow)
- Nodes: mensagem, áudio, imagem, vídeo, menu, pergunta, intervalo, OpenAI, Typebot, ticket
- Condicionais e randomizadores
- Integração com OpenAI
- Integração Typebot/N8N/DialogFlow

### 5. Campaigns
- Envio em massa
- Agendamento
- Contact lists
- Confirmação dupla
- Status tracking

### 6. Quick Messages
- Atalhos personalizados
- Variáveis Mustache
- Mídia anexada

### 7. Internal Chat
- Chat entre atendentes
- Notificações real-time
- Mídia suportada

### 8. Analytics Dashboard
- Tickets por período
- Tickets por atendente
- Tempo médio de atendimento
- Gráficos interativos

### 9. Integrations
- OpenAI (respostas automáticas)
- Evolution API (WhatsApp)
- Typebot (chatbot)
- N8N (automação)
- DialogFlow (IA)
- Webhook genéricos

## 🔄 FLUXO DE MENSAGENS

### Recebimento (Webhook Evolution):
1. POST /evolution/webhook/:sessionName
2. ProcessEvolutionWebhookService
3. wbotMessageListener.handleMessage
4. verifyQueue → handleChartbot → handleRating
5. CreateMessageService
6. Socket.IO emit ("appMessage")
7. Frontend atualiza MessagesList

### Envio:
1. Frontend: MessageInputCustom → sendMessage
2. Backend: MessageController.store
3. SendWhatsAppMessage → EvolutionProvider.sendMessage
4. POST Evolution API /message/sendText
5. CreateMessageService
6. Socket.IO emit ("appMessage")

## 📝 TEMPLATE MUSTACHE

Variáveis disponíveis:
- {{protocol}} - Número do ticket
- {{atendente}}, {{attendant}}, {{user}}, {{userName}} - Nome do atendente
- {{nome}}, {{name}} - Nome do contato
- {{email}} - Email do contato
- {{numero}}, {{number}}, {{phone}} - Telefone do contato
- {{saudacao}}, {{greeting}} - Saudação (Bom dia/Boa tarde/Boa noite)
- {{ms}} - Milissegundos timestamp
- {{hora}}, {{hour}} - Hora atual
- {{data}}, {{date}} - Data atual

## 🚨 PONTOS DE ATENÇÃO

### 1. BAILEYS_DISABLED
- ProviderFactory.ts: `const BAILEYS_DISABLED = true;`
- Todas as conexões usam Evolution API

### 2. Ticket User Loading
- Sempre fazer `ticket.reload({ include: [User] })` antes de formatBody
- Previne "undefined" em {{atendente}}

### 3. Media URL Processing
- Evolution webhook: retornar `/public/${filename}` em mediaUrl
- Frontend: ModalImageCors normaliza URL

### 4. Frontend Build
- NODE_OPTIONS=--openssl-legacy-provider (React Scripts 3.4 + Node 20)
- DISABLE_ESLINT_PLUGIN=true (permite build com warnings)

### 5. Database Migrations
- Executar em ordem: `npx sequelize db:migrate`
- Seeds após migrations: `npx sequelize db:seed:all`

### 6. Redis Obrigatório
- Bull Queue depende de Redis
- Iniciar antes do backend
- Verificar conexão: `redis-cli ping`

### 7. Socket.IO Events
Principais eventos:
- "appMessage" - Nova mensagem
- "ticket" - Update ticket
- "contact" - Update contato
- "notification" - Notificações
- "Tickets" - Lista de tickets
- "ChatBox" - Chat aberto

## 🏁 PASSO A PASSO DE SETUP

### 1. Criar Novo Repl
- Template: Node.js
- Copiar toda estrutura de arquivos

### 2. Configurar Neon Database
- Criar database no Neon
- Copiar connection string
- Adicionar em Secrets: DATABASE_URL

### 3. Configurar Secrets
```
DATABASE_URL=postgresql://...
JWT_SECRET=seu-secret-aqui
JWT_REFRESH_SECRET=seu-refresh-secret-aqui
BACKEND_URL=https://seu-repl.replit.app
```

### 4. Instalar Dependências
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 5. Executar Migrations
```bash
cd backend
npx sequelize db:migrate
npx sequelize db:seed:all
```

### 6. Build
```bash
bash build.sh
```

### 7. Deploy
- Configurar deployment como VM
- Build command: `bash build.sh`
- Run command: `bash start-production.sh`
- Deploy!

### 8. Login Inicial
- URL: https://seu-repl.replit.app
- Email: admin@admin.com
- Senha: admin

### 9. Configurar Evolution API
- Ir em Conexões
- Adicionar WhatsApp
- Escolher "Evolution API"
- Preencher credenciais
- Conectar

## 📚 DOCUMENTAÇÃO ADICIONAL

Ver arquivos no projeto:
- DEPLOYMENT.md - Guia de deployment
- EVOLUTION_API_SETUP.md - Setup Evolution API
- NGINX_SETUP.md - Nginx + SSL (para VPS)
- SSL_SETUP.md - Certificados SSL

## ✅ CHECKLIST FINAL

- [ ] Estrutura de pastas criada
- [ ] package.json (backend + frontend) configurados
- [ ] .env configurado com DATABASE_URL
- [ ] Migrations executadas
- [ ] Seeds aplicados
- [ ] Build.sh executável
- [ ] Start-production.sh executável
- [ ] .replit configurado
- [ ] Redis iniciando
- [ ] Backend compilando (dist/)
- [ ] Frontend compilando (build/)
- [ ] Login funcionando (admin@admin.com / admin)
- [ ] Socket.IO conectando
- [ ] Evolution API configurada
- [ ] Mensagens sendo enviadas/recebidas

---

**IMPORTANTE:** Este prompt contém TODA a estrutura necessária. Ao criar um novo Repl, siga os passos na ordem, copie os arquivos na estrutura correta, configure as variáveis de ambiente e execute os comandos de setup. O sistema será uma réplica exata do Atendechat.
