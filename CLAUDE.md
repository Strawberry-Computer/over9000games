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
- **NES Console**: 128×128 viewport, 128×16 tile world, 4-bit color, 8×8 sprites/tiles, scrolling support
- **QuickJS Engine**: Sandboxed JavaScript execution for user-generated games
- **AI Generation**: Async job-based OpenAI/Gemini integration for game creation
- **Game Schema**: Validation system for sprites, palettes, and game logic
- **Audio System**: 8-slot NES-style audio with 4 channels (pulse1, pulse2, triangle, noise)
- **Leaderboard**: Redis-based high score tracking with top 5 display

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

### AI Game Generation Flow (Async Job-Based)
1. User provides natural language game description
2. Client calls `POST /api/game/generate` → receives jobId
3. Server creates job in Redis via `src/server/job-manager.js`
4. Client polls `GET /api/jobs/:jobId` for status updates
5. On first poll, server starts OpenAI Responses API request
6. Subsequent polls check OpenAI completion status
7. When complete, game code returned to client
8. Response parsed by `src/shared/game-prompt.js` (markdown → JSON + JavaScript)
9. Game validated using `src/shared/game-schema.js`
10. QuickJS loads and executes game in client sandbox

### QuickJS Game Execution
Games must export three functions:
```javascript
function metadata() {
  return { title: "Game Title", description: "...", controls: [...] };
}

function resources() {
  return { sprites: [...], palette: [...], sounds: {...} };
}

function update(deltaTime, input) {
  // Game logic here
  return {
    sprites: [{spriteId: 0, x: 10, y: 20, flipH: false, flipV: false}],
    tiles: [{x: 5, y: 3, tileId: 2}],
    scroll: {x: 0, y: 0},
    background: 0,
    score: 100,
    sounds: [{slotId: 0, soundId: 'jump', channel: 'pulse1', note: 'C4', duration: 0.2, envelope: 'soft'}],
    gameOver: false
  };
}
```

### NES Console Rendering
- Display: 128×128 viewport, 128×16 tile world (supports side-scrolling up to 1024px wide)
- Sprites: Hex string arrays defining 8×8 pixel graphics with direct palette indexing
- State-based: Games return state objects, console processes and renders
- Camera: Automatic viewport culling based on scroll offset
- Performance: Single-pass canvas rendering with pre-compiled sprite sheets

### Devvit Integration
App registers subreddit menu for moderators (`/internal/menu/post-create`) and automatically creates posts on install (`onAppInstall`). Server accesses Reddit context via `@devvit/web/server` for user/post identification.

## API Endpoints

### Game Generation (Async Job-Based)
- `POST /api/game/generate`: Create async AI generation job (returns jobId)
- `POST /api/game/edit`: Create async game editing job (returns jobId)
- `GET /api/jobs/:jobId`: Poll job status and retrieve completed game
- `POST /api/game/test`: Load test game by name for development

### Leaderboard & Scores
- `POST /api/score/submit`: Submit player score to Redis leaderboard
- `GET /api/leaderboard`: Fetch top 5 high scores for current post

### Post Management
- `POST /api/post/create`: Create shareable game post with screenshot
- `GET /api/init`: Initialize application state and user context

### App Integration
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
- Sprite data uses hex string format for direct palette index mapping
- All rendering deferred through command system (no direct canvas access)
- State persistence handled by Redis with post-specific namespacing

### TypeScript Configuration
Project uses ES modules (`"type": "module"`) with separate tsconfig for client/server/shared. Vite handles WASM integration for QuickJS in client build.

### Key File Locations
- **Game Generation Logic**: `src/server/game-generator.js` - OpenAI/Gemini API integration
- **Game Schema Validation**: `src/shared/game-schema.js` - Validates sprites, metadata, and game structure
- **QuickJS Game Runner**: `src/client/game-runner.js` - Sandboxed game execution and rendering
- **Game Parsing**: `src/shared/game-prompt.js` - Parses LLM markdown responses
- **Test Games**: `src/shared/test-games/` - Manual test games for development
- **Generation Testing**: `scripts/test-generation.js` - AI model testing script

### Game Development Constraints
- **Sprite Limits**: Maximum 64 sprites on screen, 8×8 pixels each, cleared each frame
- **Sprite Flipping**: Sprites support `flipH` and `flipV` properties for horizontal/vertical mirroring
- **Font Sprites**: Pre-rendered font available at sprite IDs 0x100+ for HUD text rendering
- **Tile System**: 128×16 grid of background tiles (8×8 pixels each), cleared each frame
- **Color Palette**: Maximum 16 colors per game (4-bit)
- **Audio Slots**: 8 sound slots, 4 channels (pulse1, pulse2, triangle, noise)
- **Audio Features**: Sound IDs prevent restart, envelope presets (sharp/soft/fade/sustain), noise modes (random/periodic)
- **QuickJS Sandbox**: No external dependencies, limited execution time
- **State-Based Rendering**: Return state objects, no direct canvas access
- **Camera System**: Scroll offset for side-scrolling worlds up to 1024px wide

### Debugging Tips
- Use browser dev tools to debug QuickJS execution errors
- Check console logs for game generation and parsing errors
- Generated games saved to `./generated-games/` for inspection
- Game validation errors show specific sprite/palette issues