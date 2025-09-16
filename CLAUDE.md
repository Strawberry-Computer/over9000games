# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Devvit web application that implements a retro NES-style game console for Reddit with AI-powered game generation. It features authentic 8-bit graphics, a QuickJS sandbox for dynamic game execution, and LLM integration for procedural game creation.

## Architecture

### Key Components
- **Client** (`src/client/`): NES console emulator with HTML5 Canvas rendering
- **Server** (`src/server/`): Express.js backend with AI game generation and Redis state
- **Shared** (`src/shared/`): Game schema validation, prompts, and shared utilities
- **Scripts** (`scripts/`): AI model testing and game generation tools

### Core Systems
- **NES Console**: 256×256 pixel display, 4-bit color depth, 8×8 sprites and tiles
- **QuickJS Engine**: Sandboxed JavaScript execution for user-generated games
- **AI Generation**: OpenAI/Gemini integration for procedural game creation
- **Game Schema**: Validation system for sprites, palettes, and game logic

### Build System
- Uses Vite for both client and server builds with WebAssembly support
- Client builds to `dist/client/` (includes QuickJS WASM)
- Server builds to `dist/server/index.cjs` (Node.js bundle)
- Devvit configuration defines entry points and API key settings

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

### Testing & Scripts
- `node scripts/test-generation.js --model "openai/gpt-4o-mini" --prompt "snake game"`: Test AI generation
- `node scripts/test-generation.js --models "openai/gpt-4o-mini,anthropic/claude-3.5-sonnet"`: Test multiple models
- Set `OPENROUTER_API_KEY` environment variable for testing

## Core Architecture Patterns

### AI Game Generation Flow
1. User provides natural language game description
2. Server generates game using OpenAI/Gemini via `src/server/game-generator.js`
3. Response parsed by `src/shared/game-prompt.js` (markdown → JSON + JavaScript)
4. Game validated using `src/shared/game-schema.js`
5. QuickJS executes game in client sandbox

### QuickJS Game Execution
Games are self-contained JavaScript modules with this pattern:
```javascript
function gameUpdate(deltaTime, input) {
  // Game logic here
  return [
    {type: 'sprite', slotId: 0, spriteId: 1, x: 10, y: 20},
    {type: 'score', value: 100}
  ];
}
```

### NES Console Rendering
- Sprites: 4-layer bitmask arrays defining 8×8 pixel graphics
- Commands: Games return command arrays, console handles rendering
- Performance: Single-pass canvas rendering with pre-compiled sprite sheets

### Devvit Integration
App registers subreddit menu for moderators (`/internal/menu/post-create`) and automatically creates posts on install (`onAppInstall`). Server accesses Reddit context via `@devvit/web/server` for user/post identification.

## API Endpoints

### Game Management
- `POST /api/games/generate`: Generate game from natural language description
- `GET /api/games/:id`: Retrieve game definition and state
- `POST /api/games/:id/save`: Persist game state to Redis
- `POST /api/games/:id/load`: Load saved game state

### Legacy Endpoints
- `GET /api/init`: Initialize application state and user context
- `POST /internal/on-app-install`: App installation handler
- `POST /internal/menu/post-create`: Create new game post from subreddit menu

## Development Notes

### Environment Setup
- Requires Node.js 22+ and Reddit developer account via `npm run login`
- Configure API keys in Devvit settings: `openAIKey` and `geminiKey` (secrets)
- For testing: Set `OPENROUTER_API_KEY` environment variable

### Local Testing
- `npm run dev`: Full development mode with live reload and playtest
- Uses development subreddit `over9000games_dev` for testing
- QuickJS games run in sandboxed environment with memory/execution limits

### Game Development Workflow
1. Test AI generation: `node scripts/test-generation.js --model "openai/gpt-4o-mini" --prompt "your game idea"`
2. Generated games saved to `./generated-games/` directory
3. Manual games can be placed in `src/shared/test-games/` for testing
4. Use browser dev tools to debug QuickJS execution errors

### Architecture Considerations
- Games must be self-contained (no external dependencies)
- Sprite data uses 4-layer bitmask format for NES-style color composition
- All rendering deferred through command system (no direct canvas access)
- State persistence handled by Redis with post-specific namespacing

### TypeScript Configuration
Project uses ES modules (`"type": "module"`) with separate tsconfig for client/server/shared. Vite handles WASM integration for QuickJS in client build.