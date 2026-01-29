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

Start the development server immediately:

```bash
pnpm --filter server start:dev
```

The server will be available at `http://localhost:3000`

### Development

Start the development server:

```bash
pnpm --filter server start:dev
```

The server will run on `http://localhost:3000` by default.

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

[Add your license information here]

## 👤 Author

[Add author information here]
