# Mobile Video Conferencing

A modern video conferencing application built with a monorepo architecture using NestJS for the backend and supporting mobile clients.

## 📋 Project Structure

```
├── apps/
│   └── server/          # NestJS backend server
├── package.json         # Root workspace configuration
├── pnpm-workspace.yaml  # PNPM workspace configuration
└── pnpm-lock.yaml       # Dependency lock file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)

### Installation

1. Install dependencies across the workspace:

```bash
pnpm install
```

### Quick Start

Start all development servers:

**Backend Server** (NestJS on port 3000):
```bash
cd apps/server
pnpm start:dev
```

**Web Application** (port 5173):
```bash
cd apps/web
pnpm dev
```

**Mobile Application** (Metro bundler with dev client):
```bash
cd apps/mobile
npx expo start --dev-client
```

### Development

Each application runs independently:
- **Backend**: `http://localhost:3000`
- **Web**: `http://localhost:5173`
- **Mobile**: Start with `npx expo start --dev-client` and select your device/emulator

### Build

Build the server for production:

```bash
pnpm --filter server build
```

### Testing

Run tests for the server:

```bash
pnpm --filter server test
```

Run end-to-end tests:

```bash
pnpm --filter server test:e2e
```

## 📦 Server Application

The server application is built with [NestJS](https://nestjs.com/) and includes:

- **Health Check** - Monitor server health status
- **Rooms Management** - Create and manage video conference rooms
- **Controllers** - HTTP endpoints for API interactions

For more information, see [apps/server/README.md](apps/server/README.md)

## 🛠️ Technologies

- **Framework**: NestJS
- **Runtime**: Node.js
- **Package Manager**: pnpm
- **Testing**: Jest

## 📝 License

All Rights Reserved © 2026 Andrei-Alexandru Otea

This is an academic thesis project. Unauthorized copying, reproduction, or distribution of this work is prohibited.

## 👤 Author

Andrei-Alexandru Otea
