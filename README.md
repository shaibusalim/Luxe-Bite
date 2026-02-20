# Luxe Bite Express

A modern food ordering platform built with React, Express, and PostgreSQL.

## Quick Start

```sh
git clone <REPO_URL>
cd luxe-bite-express
npm i

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Development
npm run dev          # Start frontend dev server (port 8080)
npm run server       # Start backend API server (port 3002)
```

## Available Scripts

- `dev`: Start Vite dev server (frontend)
- `build`: Production build (frontend)
- `preview`: Preview built app
- `server` / `start`: Start the API server
- `lint`: Run eslint
- `test` / `test:watch`: Run tests with Vitest

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Express.js + Node.js
- **Database:** PostgreSQL (Neon/Supabase compatible)
- **Payments:** Paystack
- **Auth:** JWT

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options:

1. **Vercel (Frontend) + Render (Backend)** - Recommended
2. **Railway** - All-in-one platform
3. **Self-hosted VPS** - Full control

## Environment Variables

See `.env.example` for all required environment variables.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (min 16 chars)
- `PORT` - Backend port (default: 3002)

**Optional:**
- `PAYSTACK_SECRET_KEY` - For payment processing
- `ALLOWED_ORIGINS` - CORS allowed origins
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - Initial admin account

## Features

- 🍔 Menu management
- 🛒 Shopping cart
- 💳 Paystack integration
- 📦 Order management
- 👤 User authentication
- 🎨 Modern UI with animations
- 📱 Responsive design

## Project Structure

```
luxe-bite-express/
├── src/              # Frontend React app
├── server/          # Backend Express API
├── dist/            # Production build (generated)
├── uploads/          # Uploaded images (create this)
└── .env             # Environment variables (create from .env.example)
```
