# Atendechat - Deployment Guide

## Deployment Configuration

This project is configured for deployment on Replit using **VM deployment** to maintain state for WhatsApp sessions and queue processing.

### Build Process

The build process is handled by `build.sh` which:

1. **Builds Backend**
   - Installs backend dependencies (including devDependencies for TypeScript compilation)
   - Compiles TypeScript to JavaScript (`npm run build`)
   - Output: `backend/dist/` directory

2. **Builds Frontend**
   - Installs frontend dependencies
   - Sets `NODE_OPTIONS=--openssl-legacy-provider` (required for React Scripts 3.4 with Node.js 20+)
   - Sets `GENERATE_SOURCEMAP=false` (reduces build size)
   - Builds React app (`npm run build`)
   - Output: `frontend/build/` directory

### Production Startup

The production server is started by `start-production.sh` which:

1. **Starts Redis** (required for Bull queue system)
   - Runs on port 6379
   - Daemonized background process

2. **Starts Backend** (port 8080)
   - Runs compiled Node.js code: `node dist/server.js`
   - Handles WhatsApp connections, WebSocket, API endpoints

3. **Starts Frontend** (port 5000)
   - Serves static build files using `serve`
   - Proxies API requests to backend on port 8080

### Deployment Type: VM

**Why VM deployment?**
- Maintains WhatsApp session state
- Keeps Redis queue data in memory
- Runs continuously for real-time messaging
- Supports background job processing

### Environment Variables

The following environment variables are automatically configured by Replit:

**Database (PostgreSQL)**
- `DATABASE_URL` - Full connection string
- `PGHOST` - Database host
- `PGPORT` - Database port
- `PGUSER` - Database user
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name

**Additional Required Secrets (configure in Replit Secrets)**
- `JWT_SECRET` - JWT authentication secret
- `BACKEND_URL` - Public URL of backend (for Evolution API webhooks)
- Any API keys (OpenAI, Evolution API credentials, etc.)

### Port Configuration

- **Port 5000**: Frontend (public webview)
- **Port 8080**: Backend API (internal)
- **Port 6379**: Redis (internal)

### Pre-deployment Checklist

Before deploying to production:

1. ✅ Ensure all database migrations are applied
2. ✅ Verify `JWT_SECRET` is configured in Replit Secrets
3. ✅ Set `BACKEND_URL` to your deployed backend URL
4. ✅ Configure WhatsApp Evolution API credentials if using
5. ✅ Test build process locally: `bash build.sh`
6. ✅ Verify all required environment variables are set

### Troubleshooting

**Build fails with "NODE_OPTIONS not set"**
- The `build.sh` script exports this automatically
- Ensure the script has executable permissions: `chmod +x build.sh`

**Frontend build fails**
- Check Node.js version (requires Node.js 20+)
- Ensure `serve` package is installed: `cd frontend && npm install serve`

**Backend build fails**
- Verify TypeScript is in devDependencies
- Run `cd backend && npm install --include=dev`

**Redis connection errors**
- Ensure Redis is started before backend
- Check if port 6379 is available

### Manual Deployment Commands

If needed, you can run commands manually:

```bash
# Build everything
bash build.sh

# Start production server
bash start-production.sh

# Just build backend
cd backend && npm run build

# Just build frontend
cd frontend && NODE_OPTIONS=--openssl-legacy-provider npm run build
```

### Monitoring

Once deployed, monitor:
- Backend logs for connection issues
- Redis memory usage (queue data)
- WhatsApp session status
- Database connection pool
- Frontend serving correctly on port 5000

### Scaling Considerations

- VM deployment runs on a single instance
- For high traffic, consider:
  - Optimizing queue processing
  - Database connection pooling
  - Caching frequently accessed data
  - Profile picture caching (if Evolution API traffic grows)

---

**Last Updated**: November 14, 2025
