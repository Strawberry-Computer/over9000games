# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Devvit web application for Reddit that implements a simple counter game. It's built using the Reddit Developer Platform (Devvit) and consists of a client-server architecture with TypeScript.

## Architecture

### Key Components
- **Client** (`src/client/`): Vanilla TypeScript frontend that renders in Reddit posts
- **Server** (`src/server/`): Express.js backend with Redis state management
- **Shared Types** (`src/shared/types/`): Common TypeScript interfaces between client and server

### Build System
- Uses Vite for both client and server builds
- Client builds to `dist/client/` (static assets)
- Server builds to `dist/server/index.cjs` (Node.js bundle)
- Devvit configuration in `devvit.json` defines entry points and deployment settings

### Data Flow
1. Client fetches initial state via `/api/init` endpoint
2. Counter operations use `/api/increment` and `/api/decrement` POST endpoints
3. Server uses Redis for persistent state storage across Reddit posts
4. Context (`postId`, `subredditName`, `username`) provided by Devvit runtime

## Essential Commands

### Development
- `npm run dev`: Concurrent development mode (client watch + server watch + devvit playtest)
- `npm run dev:client`: Client-only watch mode
- `npm run dev:server`: Server-only watch mode
- `npm run dev:devvit`: Devvit playtest mode only

### Building & Deployment
- `npm run build`: Build both client and server for production
- `npm run deploy`: Build and upload to Reddit (does not publish)
- `npm run launch`: Full pipeline - build, deploy, and publish for review
- `npm run type-check`: TypeScript compilation check

### Authentication
- `npm run login`: Authenticate CLI with Reddit account

## Devvit-Specific Patterns

### Menu Integration
The app registers a subreddit menu item for moderators to create new posts (`/internal/menu/post-create`).

### App Lifecycle
- `onAppInstall` trigger automatically creates an initial post when installed
- Posts are created using `reddit.submitCustomPost()` with custom splash screen

### Context Access
Server routes access Reddit context via `@devvit/web/server`:
```typescript
const { postId, subredditName } = context;
const username = await reddit.getCurrentUsername();
```

### Redis Integration
State persisted using Redis instance provided by Devvit runtime:
```typescript
await redis.get("count");
await redis.incrBy("count", 1);
```

## API Endpoints

- `GET /api/init`: Initialize counter state and user context
- `POST /api/increment`: Increment counter by 1
- `POST /api/decrement`: Decrement counter by 1
- `POST /internal/on-app-install`: App installation handler
- `POST /internal/menu/post-create`: Create new post from subreddit menu

## Development Notes

### Environment Setup
Requires Node.js 22+ and Reddit developer account connected via `npm run login`.

### Local Testing
Use `npm run dev` which starts playtest mode in the configured development subreddit (`over9000games_dev`).

### TypeScript Configuration
Project uses ES modules (`"type": "module"`) with strict TypeScript compilation via `tsc --build`.