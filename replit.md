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
- **Frontend**: 5000 (webview)
- **Backend**: 8080 (localhost only)
- **Redis**: 6379 (localhost only)

## Running the Application

### Development
The frontend workflow is configured and running automatically.

To manually start components:
```bash
# Frontend (already running as workflow)
cd frontend && npm start

# Backend (start manually if needed)
cd backend && npm start
```

### Database
The PostgreSQL database is managed by Replit and includes:
- All migrations applied successfully
- Default company and user seeded
- Default settings configured

**Default Credentials** (from seeds):
- Check database seeds in `backend/src/database/seeds/` for default user credentials

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
**November 7, 2025** - Initial Replit Setup
- Installed Node.js v20 and all dependencies
- Configured PostgreSQL database with SSL support
- Installed and configured Redis for Bull queues
- Updated database configuration for Neon PostgreSQL
- Applied all migrations (117 migrations)
- Seeded default data
- Configured frontend for port 5000 with host bypass
- Set up frontend workflow on webview port 5000
- Updated browserslist database

## Notes
- This project uses older versions of some packages (React 17, Material-UI v4, Sequelize v5)
- Some npm vulnerabilities exist due to legacy dependencies
- Redis is required for the queue system to function
- The backend must be started separately from the frontend workflow
