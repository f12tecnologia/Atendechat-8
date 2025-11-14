# Atendechat - WhatsApp Customer Support Platform

## Overview
Atendechat is a comprehensive customer support platform integrated with WhatsApp. It allows businesses to manage customer conversations, tickets, and support interactions through a modern web interface.

**Status**: Successfully imported and configured for Replit environment

## Tech Stack

### Backend
- **Runtime**: Node.js v20.x with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon-hosted)
- **ORM**: Sequelize v5
- **Real-time**: Socket.IO v4
- **Queue System**: Bull (Redis-based)
- **WhatsApp Integration**: Baileys v6.7
- **AI Integration**: OpenAI API v3.3

### Frontend
- **Framework**: React v17 
- **UI Library**: Material-UI v4
- **State Management**: React Query, Zustand
- **Charts**: Chart.js v3
- **Build Tool**: React Scripts v3.4

## Project Structure
- `/backend` - Express/TypeScript backend server
- `/frontend` - React frontend application
- `/instalador` - Installation scripts (not used in Replit)

## Configuration

### Environment Variables

#### Backend (.env)
- Database connection configured via Replit PostgreSQL
- Redis running locally on port 6379
- Backend runs on port 8080
- JWT secrets configured for authentication

#### Frontend (.env)
- Frontend runs on port 5000
- Connected to backend at http://localhost:8080
- Configured to allow all hosts for Replit proxy

### Ports
- **Frontend**: 5000 (webview - acesso público)
- **Backend**: 8080 (localhost only - proxy via frontend)
- **Redis**: 6379 (localhost only)

## Running the Application

### Development
Ambos os workflows estão configurados e rodando automaticamente:
- ✅ **Frontend**: Rodando automaticamente na porta 5000
- ✅ **Backend**: Rodando automaticamente na porta 8080
- ✅ **Redis**: Rodando em background na porta 6379

Para reiniciar manualmente se necessário:
```bash
# Reiniciar workflow do frontend
# (Use a interface do Replit ou restart_workflow tool)

# Reiniciar workflow do backend
# (Use a interface do Replit ou restart_workflow tool)

# Reiniciar Redis manualmente
redis-server --daemonize yes --port 6379
```

### Database
The PostgreSQL database is managed by Replit and includes:
- ✅ All 145+ migrations applied successfully
- ✅ Default company (Empresa 1) created
- ✅ Default user (Admin) seeded
- ✅ Default settings configured

**Credenciais Padrão de Acesso:**
- 📧 **Email**: `admin@admin.com`
- 🔑 **Senha**: `123456`
- 👤 **Nome**: Admin
- 🏢 **Empresa**: Empresa 1
- 🎫 **Perfil**: Super Admin

## Key Features
- Multi-tenant support with company separation
- WhatsApp integration for customer messaging
- Ticket management system
- Queue-based message routing
- Campaign management
- Contact list management
- Flow builder for automated responses
- AI-powered responses via OpenAI
- Real-time updates via WebSocket
- File attachments support
- Schedule messages
- Analytics dashboard
- **API Integrations System** - Manage multiple API integrations (Evolution API, Telegram, Instagram, Email)
- **Evolution API Integration** - Full WhatsApp integration via Evolution API with instance management
- **Multi-channel Support** - Support for multiple messaging channels through unified interface

## Recent Changes
**November 14, 2025** - Correções Críticas no Webhook Evolution API
- ✅ **CORREÇÃO 1**: Normalização de event names
  - Evolution API envia `MESSAGES_UPSERT` (uppercase), código esperava `messages.upsert` (lowercase)
  - Implementado: `event.toLowerCase().replace(/_/g, ".")`
- ✅ **CORREÇÃO 2**: Estrutura de payload
  - Evolution API envia mensagens em `data.messages[]` array
  - Implementado: Detecção e extração automática do array
- ✅ **Interface TypeScript** atualizada para suportar ambos formatos (Evolution + Baileys)
- ✅ **Logs detalhados** adicionados para debug de webhooks
- 📝 **Status**: Mensagens de texto 1:1 devem funcionar, grupos e mídia precisam de ajustes adicionais
- 📝 **Próximos passos**: Normalizar estrutura de grupos (`id.remote` vs `key.remoteJid`) e URLs de mídia

**November 14, 2025** - Arquitetura de Providers WhatsApp (Baileys + Evolution API)
- ✅ **WhatsAppProvider Interface** criada com métodos padronizados (sendText, sendMedia)
- ✅ **BaileysProvider** implementado - wrapper para código legado Baileys/WhatsApp Web
  - Preserva comportamentos como quoted replies, conversão de áudio via ffmpeg
  - Mantém compatibilidade total com conexões WhatsApp Web existentes
- ✅ **EvolutionProvider** implementado - usa EvolutionApiService
  - Suporta envio de texto e mídia via Evolution API
  - Converte arquivos para base64 automaticamente
  - Determina tipo de mídia (image/video/audio/document) dinamicamente
- ✅ **ProviderFactory** criado - decide automaticamente qual provider usar
  - Se `ticket.whatsapp.apiIntegrationId` existe → EvolutionProvider
  - Caso contrário → BaileysProvider (comportamento padrão)
- ✅ **SendWhatsAppMessage** refatorado para usar ProviderFactory
- ✅ **SendWhatsAppMedia** refatorado para usar ProviderFactory
- ✅ **Backend compilado** com sucesso e rodando sem erros
- 📝 **Próximos passos**: Expandir ProcessEvolutionWebhookService para normalizar mensagens recebidas

**November 8, 2025** - Correções Críticas: QR Code + Webhook Evolution API
- ✅ **CORREÇÃO CRÍTICA 1**: BACKEND_URL configurado corretamente
  - Alterado de `http://localhost:8080` para URL pública do Replit
  - Webhook agora funciona: `https://7b12b638-ed7a-4d8c-89cd-a7aedcd25a36-00-sic5vtm2zqa8.kirk.replit.dev/api-integrations/webhook/{companyId}`
  - Evolution API agora consegue enviar mensagens para o Atendechat
- ✅ **CORREÇÃO CRÍTICA 2**: Logging melhorado do getQrCode
  - Logs agora mostram statusCode e mensagem real do erro da API
  - Facilita debug de problemas de conexão
  - Mantém retry mechanism (5 tentativas, delay 2s)
- ✅ **MENU REORGANIZADO**: "Integrações Evolution API" agora é submenu dentro de "Integrações"
  - Melhor organização da navegação
  - Padrão consistente com outros submenus (Campanhas, Flows)
  - Submenu inclui: "Integrações de Fila" e "Integrações Evolution API"

**November 8, 2025** - Evolution Integrations Admin Page
- ✅ Created dedicated admin page for Evolution API integrations (`/evolution-integrations`)
- ✅ Added menu item "Integrações Evolution API" in admin sidebar (visible when integrations are enabled)
- ✅ Page filters integrations by type='evolution' automatically
- ✅ Full CRUD operations: create, edit, view, delete Evolution integrations
- ✅ Real-time updates via Socket.IO when integrations are modified
- ✅ Search and pagination support
- ✅ Cleaned up 17 test integrations from database, keeping only production data
- ✅ Modified ApiIntegrationModal to accept defaultType prop for better UX
- ✅ Integrated with WhatsApp modal dropdown for seamless Evolution API selection

**November 8, 2025** - Evolution API Integration in Connections
- ✅ Fixed critical bug: useEffect dependency changed from [whatsAppId] to [open] to ensure Evolution integrations load when modal opens
- ✅ Backend now returns `apiIntegrations` key (not `integrations`) for consistent API response
- ✅ Recompiled backend TypeScript to apply controller changes
- ✅ Evolution API integrations now populate correctly in WhatsApp connection modal dropdown
- ✅ Inline "+" button to create new Evolution API integrations directly from modal
- ✅ Anti-duplicate validation prevents duplicate Evolution API instances

**November 7, 2025** - Evolution API Webhook Integration
- ✅ Created ProcessEvolutionWebhookService to receive and process Evolution API webhooks
- ✅ Webhook endpoint: `/api-integrations/webhook/:companyId`
- ✅ Automatic creation of contacts from Evolution API messages
- ✅ Automatic creation/update of tickets in Atendimento screen
- ✅ Support for text, image, video, audio, document, and sticker messages
- ✅ Integration with existing message system (CreateMessageService)
- ✅ Real-time Socket.IO events for frontend updates
- ✅ Proper logging and error handling

**November 7, 2025** - API Integrations System Implementation
- ✅ Created `ApiIntegration` model and database migration
- ✅ Implemented full CRUD services for API integrations
- ✅ Built Evolution API service (create instance, send messages, webhooks)
- ✅ Created REST API endpoints (`/api-integrations`)
- ✅ Built frontend page for managing integrations
- ✅ Added integration modal with support for multiple API types
- ✅ Implemented real-time updates via Socket.IO
- ✅ Added search and pagination support
- ✅ Added Portuguese translations for all new components
- ✅ Added menu item "Integrações de API" in admin section
- ✅ Fixed ApiIntegration model registration in Sequelize

**November 7, 2025** - Initial Replit Setup Completo
- ✅ Installed Node.js v20 and all dependencies
- ✅ Configured PostgreSQL database with SSL support
- ✅ Installed and configured Redis for Bull queues
- ✅ Updated database configuration for Neon PostgreSQL
- ✅ Applied all migrations (146 migrations including ApiIntegrations)
- ✅ Seeded default data successfully
- ✅ Configured frontend for port 5000 with host bypass
- ✅ Set up frontend workflow on webview port 5000
- ✅ Created backend workflow on port 8080
- ✅ Updated browserslist database
- ✅ Both frontend and backend running successfully
- ✅ Fixed frontend-backend proxy communication

## Deployment
The application is configured for VM deployment with the following setup:
- **Build**: Compiles both backend TypeScript and frontend React app
- **Run**: Starts Redis, backend server, and serves frontend on port 5000
- The deployment uses a VM instance to maintain state for the queue system and WhatsApp sessions

## Important Notes

### Application Access
- The frontend is accessible through the webview on port 5000
- Login page should be available at the root URL
- Default credentials can be found in the database seeds

### Backend Startup
The backend server needs to be started manually or configured in production:
```bash
cd backend && npm start
```
The backend runs on port 8080 and handles:
- WhatsApp message processing
- Ticket management
- Queue processing (via Bull/Redis)
- Real-time WebSocket connections

### Technical Considerations
- This project uses older versions of some packages (React 17, Material-UI v4, Sequelize v5)
- Some npm vulnerabilities exist due to legacy dependencies
- Redis is required for the queue system to function
- The frontend has compiled successfully with only ESLint warnings (unused imports)
- SSL is configured for PostgreSQL connection to Neon database
- WhatsApp integration requires additional setup and authentication with WhatsApp Business API

### Next Steps for Full Functionality
1. Start the backend server manually
2. Configure WhatsApp connection credentials
3. Set up email SMTP settings for notifications
4. Configure payment gateway if using subscription features
5. Update JWT secrets for production use
