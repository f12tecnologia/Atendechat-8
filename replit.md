# Atendechat - WhatsApp Customer Support Platform

## Overview
Atendechat is a comprehensive customer support platform integrated with WhatsApp, designed to streamline customer service for businesses. It enables managing customer conversations, tickets, and support interactions through a modern web interface. The platform supports multi-tenancy, real-time communication, AI-powered responses, and various API integrations to provide a unified customer support experience.

## User Preferences
I want iterative development. Ask before making major changes. I prefer simple language.

## System Architecture
Atendechat is built with a decoupled frontend and backend architecture.

### UI/UX Decisions
- **Frontend Framework**: React v17 with Material-UI v4 for component design.
- **State Management**: Utilizes React Query and Zustand.
- **Data Visualization**: Chart.js v3 for analytics dashboards.

### Technical Implementations
- **Backend Runtime**: Node.js v20.x with TypeScript.
- **Backend Framework**: Express.js for API services.
- **Real-time Communication**: Socket.IO v4 for instant updates.
- **Queue System**: Bull (Redis-based) for background job processing, such as message routing and campaign management.
- **WhatsApp Integration**: Utilizes Baileys v6.7 and a custom `WhatsAppProvider` interface with `BaileysProvider` and `EvolutionProvider` implementations for flexible WhatsApp connectivity.
- **AI Integration**: OpenAI API v3.3 for AI-powered responses.
- **Multi-channel Support**: A unified interface to manage multiple messaging channels (WhatsApp, Telegram, Instagram, Email).
- **API Integrations System**: Generic system to manage various external API integrations, including a dedicated Evolution API integration for advanced WhatsApp features.

### Feature Specifications
- **Multi-tenant Support**: Isolates data and configurations for different companies.
- **Ticket Management**: Comprehensive system for handling customer support tickets.
- **Campaign Management**: Tools for creating and managing marketing campaigns.
- **Contact List Management**: Centralized contact database.
- **Flow Builder**: For automating response flows.
- **Scheduled Messages**: Ability to send messages at predefined times.
- **Analytics Dashboard**: Provides insights into customer interactions.
- **File Attachments**: Support for various media types in messages.

### System Design Choices
- **Database**: PostgreSQL (Neon-hosted) with Sequelize v5 ORM. All migrations are applied, and default data is seeded.
- **Deployment**: Configured for VM deployment to maintain state for WhatsApp sessions and queue processing.
- **Environment**: Backend runs on port 8080, Frontend on port 5000. Redis on 6379.
- **Security**: JWT for authentication. SSL enabled for external PostgreSQL connections.

## Recent Changes
- **Dec 24, 2025**: Migrated to Evolution API exclusively - removed Baileys option from frontend WhatsApp modal, backend now uses only Evolution API for all connections. ProviderFactory has BAILEYS_DISABLED=true and routes all message sending through EvolutionProvider.
- **Dec 24, 2025**: Fixed /tickets page showing raw JSON error instead of login page. Modified isAuth middleware to detect browser navigation (Accept: text/html) and pass to frontend handler. Also added defensive (queues || []) checks in TicketsListCustom to prevent undefined .map() errors.
- **Dec 24, 2025**: Fixed blank screen issue caused by undefined arrays in Kanban, TicketsManager, and TicketsList components. Added (|| []) defensive checks before .map() calls. Build version v2.0.1_20251224.
- **Dec 18, 2025**: Fixed frontend build issue - updated MUI x-date-pickers imports in Dashboard components (ChartsDate.js, ChartsUser.js) to use `AdapterDateFnsBase` instead of the deprecated `AdapterDateFns` path for compatibility with @mui/x-date-pickers v6 and date-fns v2.

## External Dependencies
- **Database**: PostgreSQL (Neon-hosted)
- **Queue/Cache**: Redis
- **WhatsApp Integration**: Baileys, Evolution API
- **AI Services**: OpenAI API