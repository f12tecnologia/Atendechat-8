# AI_RULES

Purpose
- Document the approved tech stack and how to use libraries in this codebase.
- Provide clear rules for AI features, WhatsApp automation, data flow, and frontend/backend patterns.
- Ensure maintainability, security, and consistent developer experience across the app.

Tech Stack (overview)
- Backend: Node.js + Express with TypeScript, Sequelize (sequelize-typescript), Bull for queues, Socket.IO for realtime.
- Database: MySQL by default (DB_DIALECT env), PostgreSQL supported; Sequelize migrations/seeders manage schema.
- Realtime: Socket.IO (server and client) with company-scoped rooms and per-feature channels.
- WhatsApp: Baileys for WhatsApp sessions, message handling, and media; custom chatbot/queues integration.
- AI: OpenAI Node SDK (v3.x); prompts stored in DB (Prompts table) and managed via API/Frontend; optional TTS via Microsoft Cognitive Services.
- Frontend: React 17, React Router v5, React Query v3, Material-UI v4, Formik + Yup, axios, react-toastify, i18next.
- Observability: Pino logger (pretty transport), Sentry error tracking (backend).
- Utilities: Axios for HTTP (server-side external calls, and client), moment and date-fns (pickers), multer for uploads, puppeteer for PDF/HTML capture.

Library usage rules (backend)

Core framework and language
- Use Express with TypeScript only. Do not introduce Nest.js/Koa/Fastify without an ADR and migration plan.
- Place new logic in src/services (business), src/controllers (HTTP), src/routes (wiring), and src/models (Sequelize).
- Use the provided AppError for controlled errors; do not return raw errors from controllers.

Database and ORM
- ORM: Sequelize (sequelize-typescript). All DB access goes through models/services.
- Migrations live in src/database/migrations. Never alter tables manually; write a migration and seed if needed.
- Respect DB_DIALECT, host, and credentials from environment (.env). Default is MySQL; PostgreSQL is supported.
- Use transactions for multi-step writes that must be atomic. Prefer service-level orchestration.

Validation and errors
- Input validation: Yup (consistent with existing services). Throw AppError on validation failures.
- Controller try/catch is allowed for translating validation errors to AppError; otherwise allow the global handler to catch and report.
- Do not swallow errors; let them bubble to the app error handler; Sentry captures uncaught errors.

Logging and observability
- Use the logger util (pino) for structured logs. Avoid console.log in production code.
- Use Sentry for unexpected exceptions. Add contextual info minimally and avoid logging PII.

Queues and background jobs
- Use Bull queues defined in src/queues.ts for message sends, scheduling, and heavy jobs.
- Configure attempts and removeOnComplete as used in current services; mirror existing patterns for new jobs.
- Long-running or blocking tasks (PDF, heavy I/O) should go to a queue or be carefully batched.

Realtime (Socket.IO)
- Use getIO() to publish events. Namespaces/rooms follow company-scoped conventions: company-${companyId}-<channel>.
- Emit specific actions (create/update/delete) and payloads consistent with current event contracts per entity.

WhatsApp (Baileys) and chatbot
- Use Baileys session handlers in WbotServices; do not instantiate new listeners outside wbotMessageListener.ts.
- For message processing:
  - Parse message content with getBodyMessage and helpers in wbotMessageListener.ts.
  - Persist messages using verifyMessage/verifyMediaMessage to keep state consistent.
- For routing and chatbot:
  - Use verifyQueue and handleChartbot to move users through queues/options.
  - Use Settings/Queue configuration for out-of-hours and behavior toggles.
- For new flows/providers:
  - Add integrations to providers.ts using the existing helper functions (sleep, formatBody, sendMessageImage/link).
  - Prefer axios with explicit headers/timeouts for external services; avoid adding other HTTP clients.

AI (OpenAI, prompts, TTS)
- Provider SDK: OpenAI Node SDK v3.x already installed. Existing code uses both OpenAIApi/Configuration (legacy) and the new default client import. For legacy modules keep current style; for new code prefer the pattern used in services/IntegrationsServices/OpenAiService.ts.
- Models: Use app-configured models (e.g., gpt-3.5-turbo-1106, gpt-4o-mini where configured). Do not hardcode new models; pass from DB Prompt or Flow config.
- Prompts and keys:
  - Store prompt content and API keys in the Prompts table. Do not hardcode keys in code or commit them.
  - Use PromptServices (Create/Show/List/Update/Delete) and PromptController for CRUD via API.
  - Maximum tokens, temperature, queue target, and message window come from the DB.
- FlowBuilder integration:
  - For OpenAI nodes in flows, read settings from the node config and use IntegrationsServices/OpenAiService.ts to reply.
- Audio (TTS):
  - Use Microsoft Cognitive Services Speech SDK via convertTextToSpeechAndSaveToFile; place outputs under public/company${id} and delete WAV/MP3 after send.
- Transcription:
  - For audio messages with OpenAI Whisper, follow the existing flow: download media, stream file to Whisper, then respond via chat completion.
- Safety and cost:
  - Keep temperature, max_tokens within DB-provided bounds; do not exceed PR-approved defaults.
  - Avoid streaming or function-calling additions without an ADR; current infra is request/response.

HTTP and external integrations
- Use axios for outbound HTTP calls. Configure auth headers explicitly; handle 4xx/5xx by propagating AppError or controlled replies.
- Set reasonable timeouts for long calls; avoid infinite retries (max 3 recommended for transient errors).

Files and uploads
- Use multer via existing upload configs. Serve static content via /public (uploadConfig.directory).
- Clean up temp files after use (see providers.ts and Puppeteer PDF generation code).

Security and auth
- Auth: Custom JWT access tokens and refresh tokens. Access token in Authorization: Bearer; refresh token in httpOnly cookie (jrt).
- Middleware: isAuth guards API routes; do not trust client-only checks.
- Secrets: JWT secrets and provider keys must come from env. Never store secrets in frontend bundles.

Performance and reliability
- Debounce outbound automated messages where appropriate (helpers/Debounce).
- Avoid blocking the event loop in request handlers; offload heavy jobs to Bull or keep operations async and bounded.

Library usage rules (frontend)

Framework and routing
- React 17 with react-router-dom v5 (Switch/Route). Do not introduce v6 syntax without coordinated migration.
- Project uses JavaScript (ES) for frontend; prefer consistency. If adding TypeScript on the FE, align tooling and tsconfig first.

UI and styling
- Use Material-UI v4 components (@material-ui/*) consistently. Avoid mixing with MUI v5 (@mui/*) unless explicitly migrating a module (do not mix in the same view).
- Reuse existing themed components, layout, and shared wrappers (MainContainer, MainHeader, etc.).

State and data fetching
- Use React Query v3 for server-state fetching/caching/invalidation. Co-locate hooks in src/hooks for each feature (e.g., useTickets).
- Use axios via services/api.js (baseURL from REACT_APP_BACKEND_URL). Leverage interceptors defined in useAuth for token refresh.
- Use SocketContext for realtime updates; subscribe/unsubscribe to company-scoped channels on mount/unmount.

Forms and validation
- Use Formik for forms with Yup validation schemas (consistent with existing code).
- Surface validation errors via MUI TextField helperText; show user feedback with react-toastify.

i18n and localization
- Use i18next (translate/i18n.js) and i18n.t(...) in UI. Respect selected language in date/number formatting where applicable.

Dates and utilities
- moment is used broadly in business logic and warnings; date-fns is used for pickers. Do not introduce new date libraries.

Notifications
- Use react-toastify for success/error/info messages. Keep messages short and localized.

Do not add (without ADR)
- New global state managers (Redux/MobX), styling frameworks (Tailwind), UI kits beyond MUI v4, or alternative HTTP clients.
- New AI orchestration frameworks (LangChain, etc.) or streaming transports unless architecture is approved.

Coding standards and structure

Backend
- New services go in src/services/<Domain>/<Action>Service.ts with small, focused functions.
- New controllers expose thin request/response translation; business logic stays in services.
- Use logger and Sentry for observability. Throw AppError with meaningful messages for known errors.

Frontend
- Follow feature-first organization: pages/, components/, hooks/, context/.
- Keep components small (<100–150 lines where practical). Extract reusable pieces into /components.
- Prefer controlled inputs with Formik Field wrappers and consistent MUI styling.

Testing
- Backend tests use Jest (see backend/jest.config.js). New core services should include unit tests where feasible.
- Prefer integration tests for controllers critical to billing/AI/message flows.

Deployment and environment
- Required env (examples):
  - BACKEND: PORT, FRONTEND_URL, DB_*, JWT_SECRET, JWT_REFRESH_SECRET, SENTRY_DSN (optional), REDIS_*, OPENAI_API_KEY (when not stored per-prompt), AZURE_COGNITIVE_* (for TTS).
  - FRONTEND: REACT_APP_BACKEND_URL
- WhatsApp sessions start on server boot (StartAllWhatsAppsSessions). Ensure DB and Baileys assets persist across restarts as needed.

AI-specific implementation guidance

Adding a new Prompt (OpenAI)
- Create/edit via frontend Prompts page or PromptController API; fields: name, model, apiKey, prompt, maxTokens, temperature, queueId, maxMessages.
- Avoid hardcoding model or key in code; always read from DB.

Using OpenAI in flows or queues
- For queue-based AI: wbotMessageListener.handleOpenAi reads Queue.promptId/WhatsApp.promptId; reuse that flow.
- For FlowBuilder nodes: use IntegrationsServices/OpenAiService.handleOpenAi with node-provided settings.

Text-to-speech and media replies
- Use convertTextToSpeechAndSaveToFile then send audio via Baileys; always delete generated files after send.

Extending WhatsApp provider flows
- Add to WbotServices/providers.ts. Use formatBody for templating, sleep for pacing, and sendMessageImage/sendMessageLink helpers for media.
- Close tickets with UpdateTicketService when flows finish; follow the existing finalization pattern.

Versioning and changes
- Favor backward-compatible additions. If you need to change existing behavior (e.g., model selection), hide behind DB-configurable flags/fields.
- Avoid breaking API contracts consumed by the frontend without updating corresponding pages/hooks and socket events.

Security and PII
- Do not log message bodies or PII in plain logs. Redact when necessary.
- Keep all API keys and tokens out of the frontend and repo. Use settings tables or environment variables.

Appendix: Common do’s and don’ts

Do
- Reuse helpers in WbotServices and services/utils before introducing new abstractions.
- Keep external API wrappers small and colocated with the feature using them.
- Emit socket events mirroring existing action names and payload shapes.

Don’t
- Mix MUI v4 and v5 in the same component/page.
- Introduce new date libraries or state managers.
- Hardcode AI keys or models in code.