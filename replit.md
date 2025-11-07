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

## Recent Changes
**November 7, 2025** - Initial Replit Setup Completo
- ✅ Installed Node.js v20 and all dependencies
- ✅ Configured PostgreSQL database with SSL support
- ✅ Installed and configured Redis for Bull queues
- ✅ Updated database configuration for Neon PostgreSQL
- ✅ Applied all migrations (145+ migrations including latest)
- ✅ Seeded default data successfully
- ✅ Configured frontend for port 5000 with host bypass
- ✅ Set up frontend workflow on webview port 5000
- ✅ Created backend workflow on port 8080
- ✅ Updated browserslist database
- ✅ Both frontend and backend running successfully

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
