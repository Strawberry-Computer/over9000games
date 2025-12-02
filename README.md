# RES-9000 - NES-Style Game Console for Reddit

A retro 8-bit game console built on Reddit's Devvit platform featuring authentic NES-style graphics and gameplay.

## Console Specifications

### Display
- **Resolution**: 128×128 pixels (viewport)
- **Color Depth**: 4-bit (16 colors)
- **Sprites**: 8×8 pixels, unlimited positioning
- **Max Sprites**: 64 simultaneous on screen
- **Background**: 128×16 tile grid (8×8 pixel tiles) - supports side-scrolling worlds up to 1024px wide
- **Camera System**: Viewport scrolling with automatic sprite/tile culling

### Graphics System
- **Sprite Definition**: Hex string format for direct palette indexing
- **Color Calculation**: Each hex character directly maps to palette index (0-F)
- **Rendering**: Dual-canvas architecture (sprite sheet + main canvas)
- **Performance**: Hardware-accelerated canvas blitting

### Input
- **Controls**: NES-style D-pad + A/B buttons
- **Keyboard Mapping**:
  - D-pad: Arrow keys
  - A/B buttons: Z/X keys (A=Z, B=X)
  - Special: Space to pause, Enter to restart
- **Response**: 60 FPS input polling

### Audio
- **Channels**: 4-channel NES-style audio (pulse1, pulse2, triangle, noise)
- **Sound Slots**: 8 independent sound slots for concurrent playback
- **Format**: Web Audio API with 8-bit sound synthesis
- **Sound Effects**: Note-based synthesis (C2-C6) with ADSR envelopes
- **Envelopes**: Presets (sharp, soft, fade, sustain) or custom ADSR values
- **Features**: Frequency sweeps, looping sounds, volume control, per-slot management
- **Music**: Continuous sounds via looping slots (background music via sustained loops)

## Technology Stack

- [Devvit](https://developers.reddit.com/): Reddit's developer platform
- [Express](https://expressjs.com/): Backend API server
- [TypeScript](https://www.typescriptlang.org/): Type-safe development
- [QuickJS](https://bellard.org/quickjs/): Sandboxed JavaScript execution for user games
- HTML5 Canvas: Hardware-accelerated graphics rendering
- OpenAI/Gemini APIs: AI-powered game generation
- [Vite](https://vitejs.dev/): Build system with WebAssembly support

## Architecture

### Core Systems
```
┌─────────────────────────────────────────────────────────────┐
│                    CONSOLE ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────┘

    Game Loop (60 FPS):
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   Game Update   │    │  Set Sprites/   │    │   Render Pass   │
    │   (User Code)   │ -> │  Tiles/Colors   │ -> │   (Console)     │
    │                 │    │  (Setters Only) │    │                 │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                           │
                                                  ┌─────────▼─────────┐
                                                  │ Canvas Rendering  │
                                                  │ (Single Pass)     │
                                                  └───────────────────┘
```

### Sprite System
- **Hex String Arrays**: Each sprite defined as 8 hex strings (one per row)
- **Direct Indexing**: Each character (0-F) directly specifies palette index
- **Pre-Rendering**: Sprites compiled to canvas sprite sheet at startup
- **Deferred Rendering**: Games set sprite positions, console renders all at once

### Game Development Pattern
```javascript
// Games export three functions: metadata(), resources(), and update()

function metadata() {
  return {
    title: "My Game",
    description: "A fun retro game",
    controls: ["arrows: move", "z: jump"]
  };
}

function resources() {
  return {
    sprites: [/* sprite data */],
    palette: [0x000000, 0xFFFFFF, /* ... */],
    sounds: {/* optional sound definitions */}
  };
}

function update(deltaTime, input) {
  // Update game logic
  player.x += velocity * deltaTime;

  // Return game state as object
  return {
    sprites: [
      { spriteId: 0, x: player.x, y: player.y },    // Player
      { spriteId: 1, x: enemy.x, y: enemy.y }       // Enemy
    ],
    tiles: [
      { x: 15, y: 20, tileId: 0 }  // Grass tile
    ],
    scroll: { x: player.x - 64, y: 0 },  // Camera follows player
    background: 0,  // Background color palette index
    score: score,
    gameOver: false
  };
}
```

## Getting Started

### Prerequisites
- Node.js 22+
- Reddit Developer Account
- OpenAI/Gemini API keys (for AI game generation)

### Setup
1. Clone this repository
2. `npm install`
3. `npm run login` - Authenticate with Reddit
4. Configure API keys in Devvit app settings (`openAIKey`, `geminiKey`)
5. `npm run dev` - Start development server

### Commands

#### Development
- `npm run dev`: Live development on Reddit (concurrent client/server watch + playtest)
- `npm run dev:client`: Client-only watch mode
- `npm run dev:server`: Server-only watch mode
- `npm run dev:devvit`: Devvit playtest mode only
- `npm run testbed`: Build and run local testbed server for testing without Devvit
- `npm run testbed:dev`: Testbed development mode with watch

#### Building & Deployment
- `npm run build`: Build client and server
- `npm run build:client`: Build client only
- `npm run build:server`: Build server only
- `npm run build:client:testbed`: Build testbed client
- `npm run deploy`: Upload to Reddit (staging)
- `npm run launch`: Publish for review
- `npm run type-check`: TypeScript validation
- `npm run login`: Authenticate with Reddit

### AI Game Generation Testing
- `node scripts/test-generation.js --model "openai/gpt-4o-mini" --prompt "snake game"`: Test single model
- `node scripts/test-generation.js --models "openai/gpt-4o-mini,anthropic/claude-3.5-sonnet"`: Test multiple models
- Set `OPENROUTER_API_KEY` environment variable for testing
- Generated games saved to `./generated-games/` directory

## Dynamic Game Generation Architecture

### Ultra-Minimal QuickJS Game System
```
┌─────────────────────────────────────────────────────────────────┐
│                    MINIMAL GAME ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

User Input: "Make a snake game"
    │
    ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   LLM Service   │    │   Game Schema    │    │  QuickJS Engine │
│   (Server)      │───▶│   Validation     │───▶│   (Client)      │
│                 │    │   (Client)       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Self-Contained  │    │   NES Console   │
                       │      Game        │    │   Integration   │
                       └──────────────────┘    └─────────────────┘
```

### Game Execution Flow
• **User Request**: Natural language game description
• **LLM Processing**: Generate self-contained game with sprites and logic
• **Schema Validation**: Basic structure validation only
• **QuickJS Execution**: Pure function call: `gameUpdate(deltaTime, input)`
• **Console Integration**: Games return command arrays for rendering

### Generated Game Structure
```javascript
const generatedGame = {
  metadata: {
    title: "Snake Game",
    description: "Classic snake game with apples"
  },

  // NES-style sprite definitions
  sprites: [
    [
      "11111111",  // Row 0: white border
      "12222221",  // Row 1: white border with green fill
      "12333321",  // Row 2: green with red center
      "12333321",  // Row 3: green with red center
      "12333321",  // Row 4: green with red center
      "12333321",  // Row 5: green with red center
      "12222221",  // Row 6: white border with green fill
      "11111111"   // Row 7: white border
    ]
    // ... more sprites
  ],

  palette: [
    0x000000, 0x00FF00, 0xFF0000, 0x808080, // Snake colors
    0xFFFF00, 0xFF8000, 0x8000FF, 0x00FFFF  // Food/UI colors
  ],

  // Self-contained game code
  updateCode: `
    // Game state (games manage their own variables)
    let snake = [{x: 10, y: 10}, {x: 9, y: 10}];
    let apple = {x: 15, y: 15};
    let direction = 'right';
    let score = 0;

    // Command builder functions
    function setSprite(slot, id, x, y) {
      return {type: 'sprite', slotId: slot, spriteId: id, x, y};
    }

    function setScore(value) {
      return {type: 'score', value};
    }

    // Main game function
    function gameUpdate(deltaTime, input) {
      let commands = [];

      // Handle input
      if (input.up && direction !== 'down') direction = 'up';
      if (input.down && direction !== 'up') direction = 'down';
      if (input.left && direction !== 'right') direction = 'left';
      if (input.right && direction !== 'left') direction = 'right';

      // Move snake (simplified)
      const head = {...snake[0]};
      if (direction === 'up') head.y--;
      if (direction === 'down') head.y++;
      if (direction === 'left') head.x--;
      if (direction === 'right') head.x++;

      snake.unshift(head);

      // Check apple collision
      if (head.x === apple.x && head.y === apple.y) {
        score += 10;
        apple = {x: Math.floor(Math.random() * 16), y: Math.floor(Math.random() * 16)};
      } else {
        snake.pop();
      }

      // Draw snake
      snake.forEach((segment, i) => {
        commands.push(setSprite(i, i === 0 ? 0 : 1, segment.x * 8, segment.y * 8));
      });

      // Draw apple
      commands.push(setSprite(60, 2, apple.x * 8, apple.y * 8));
      commands.push(setScore(score));

      return commands;
    }
  `
}`
```

### API Endpoints

#### Game Generation & Management
• `POST /api/game/generate` - Create async job for AI game generation (returns jobId)
• `POST /api/game/edit` - Create async job for editing existing game (returns jobId)
• `GET /api/jobs/:jobId` - Poll job status and retrieve completed game
• `POST /api/game/test` - Load test game by name for development

#### Leaderboard & Scores
• `POST /api/score/submit` - Submit player score to leaderboard
• `GET /api/leaderboard` - Fetch top 5 high scores for current post

#### Post Management
• `POST /api/post/create` - Create shareable game post with screenshot
• `POST /api/comment/post` - Post a comment on a Reddit post
• `GET /api/init` - Initialize application state and user context

#### App Integration
• `POST /internal/on-app-install` - App installation handler
• `POST /internal/menu/post-create` - Create new game post from subreddit menu
• `POST /internal/menu/migrate-screenshots` - Generate screenshots for old posts (moderator only)
• `POST /api/admin/migrate-screenshots` - Admin endpoint for screenshot migration

### Local Testing with Testbed

The testbed provides a local development environment for testing games without requiring the full Devvit infrastructure:

- **Standalone Server**: Express server with Devvit API mocks (`src/testbed/server.js`)
- **Fast Iteration**: No upload/deploy cycle needed for testing
- **Mocked APIs**: Simulates Reddit context, media uploads, and Redis storage
- **Commands**:
  - `npm run testbed`: Build and run testbed server
  - `npm run testbed:dev`: Development mode with hot reload
- **Access**: Open `http://localhost:3000` after starting testbed

### Security & Sandboxing

#### QuickJS Sandbox Features
• **Memory Limits**: Max heap size for game execution
• **Execution Timeout**: Prevent infinite loops
• **API Restrictions**: No network, file system, or DOM access
• **Resource Monitoring**: Track CPU usage per frame

#### Game Validation
• **Sprite Constraints**: Max 64 sprites, 8x8 pixel limit
• **Code Analysis**: Static analysis of generated JavaScript
• **Schema Compliance**: Ensure games use only allowed sys API

### Game Development

#### Game Interface
```javascript
// Games must export three functions:

function metadata() {
  return {
    title: "Game Title",
    description: "Game description",
    controls: ["arrows: move", "z: action"]
  };
}

function resources() {
  return {
    sprites: [/* 8×8 hex string arrays */],
    palette: [/* up to 16 hex colors */],
    sounds: {/* optional NES-style sound definitions */}
  };
}

function update(deltaTime, input) {
  // deltaTime: seconds since last frame (e.g., 0.016 for 60fps)
  // input: { up, down, left, right, a, b,
  //          upPressed, downPressed, leftPressed, rightPressed,
  //          aPressed, bPressed }

  // Return game state object
  return {
    sprites: [{spriteId, x, y, flipH?, flipV?}, ...], // Up to 64 sprites
    tiles: [{x, y, tileId}, ...],          // Background tiles (grid-based)
    scroll: {x, y},                        // Camera position
    background: colorIndex,                // Background color (0-15)
    score: number,                         // Current score
    sounds: [{channel, note, duration, ...}, ...], // Sound effects
    audio: {music, volume},                // Background music control
    gameOver: boolean                      // Triggers game over state
  };
}
```

#### Return Object Properties
- **sprites**: Array of `{spriteId, x, y, flipH?, flipV?}` objects (max 64, cleared each frame)
  - `flipH`: Optional boolean to flip sprite horizontally (useful for character facing direction)
  - `flipV`: Optional boolean to flip sprite vertically
- **tiles**: Array of `{x, y, tileId}` objects (cleared each frame, positioned on 8×8 grid)
- **scroll**: `{x, y}` camera offset for side-scrolling (default: `{x: 0, y: 0}`)
- **background**: Palette color index for background (0-15)
- **score**: Numeric score value for display
- **sounds**: Array of sound effect objects to play this frame
- **audio**: Music and audio control object
- **gameOver**: Boolean to trigger game over and leaderboard display

#### Execution Model
1. **LLM Generation**: Self-contained game code with metadata, resources, and update functions
2. **QuickJS Loading**: Game code loaded into sandbox, functions extracted
3. **Resource Loading**: Sprites and palette pre-rendered to sprite sheet
4. **Frame Execution**: `update(deltaTime, input)` called at 60 FPS
5. **State Processing**: Returned state object processed by console
6. **Console Rendering**: Sprites/tiles rendered with camera offset, culled if outside viewport

#### Leaderboard System
- **Automatic Display**: Game over triggers leaderboard overlay
- **Pause to View**: Press Space during gameplay to view high scores
- **Score Submission**: Automatic on game over (authenticated users only)
- **Top 5**: Shows top 5 scores with username and rank
- **Storage**: Redis sorted sets for efficient ranking
- **High Score Detection**: "NEW HIGH SCORE" message for top 5 entries

#### Audio System
Games trigger sound effects using 8 independent sound slots:
```javascript
return {
  // ... other game state ...
  sounds: [
    {
      slotId: 0,                   // Sound slot (0-7)
      soundId: 'jump',             // Optional ID to prevent restart
      channel: 'pulse1',           // pulse1, pulse2, triangle, noise
      note: 'C4',                  // Musical note (C2-C6) or use frequency
      duration: 0.2,               // Seconds
      volume: 0.5,                 // 0.0-1.0
      envelope: 'sharp',           // sharp, soft, fade, sustain, or custom ADSR
      loop: false                  // Enable looping for continuous sounds
    },
    {
      slotId: 1,                   // Background music on separate slot
      soundId: 'bgm_bass',
      channel: 'triangle',
      note: 'A2',
      duration: 1.0,
      volume: 0.3,
      envelope: 'sustain',
      loop: true                   // Loop for continuous background music
    }
  ]
};
```

**Sound Features:**
- **Frequency Sweeps**: Add `sweep: {target: 880}` or `sweep: {targetNote: 'A5', time: 0.5}` to slide pitch
- **Noise Modes**:
  - `mode: 'random'` - White noise for explosions/death sounds (default)
  - `mode: 'periodic'` - Periodic noise for hi-hats/damage sounds
- **Looping**: Set `loop: true` for continuous background music or ambient sounds
- **Sound IDs**: Use `soundId` to prevent restarting same sound on each frame (if same soundId is triggered multiple frames in a row, sound continues playing instead of restarting)
- **Master Volume**: Return `audio: {masterVolume: 0.7}` or `audio: {mute: true}` for global control
- **Envelope Presets**: `sharp`, `soft`, `fade`, `sustain` or custom ADSR object `{attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.05}`

**Font Sprites for HUD:**
The console provides pre-rendered font sprites at IDs `0x100+` for displaying text:
```javascript
// Display "SCORE: 100" using sprites (pixel-perfect positioning)
const scoreText = "SCORE: 100";
for (let i = 0; i < scoreText.length; i++) {
  sprites.push({
    spriteId: 0x100 + scoreText.charCodeAt(i),
    x: 10 + (i * 8),
    y: 2
  });
}

// Or use tiles for grid-aligned text
tiles.push({x: 1, y: 0, tileId: 0x100 + 'S'.charCodeAt(0)}); // Grid position (8, 0)
```

**Sprite Flipping for Character Direction:**
```javascript
// Character facing left/right without separate sprites
return {
  sprites: [
    {
      spriteId: 0,           // Player sprite
      x: player.x,
      y: player.y,
      flipH: player.facing < 0  // Flip horizontally when facing left
    }
  ]
};
```

## Project Structure

### Key Files and Directories

#### Client (`src/client/`)
- **main.js**: Main game console client with NES rendering engine
- **splash-main.js**: Game creation/selection splash screen
- **game-runner.js**: Client-side QuickJS sandbox for game execution
- **audio/audio-manager.js**: NES-style 4-channel audio system
- **bitmap-font.js**: Pre-rendered font sprite generation

#### Server (`src/server/`)
- **index.js**: Express server with API routes and Devvit integration
- **job-manager.js**: Redis-based async job queue for game generation
- **responses-api.js**: OpenAI Responses API integration
- **headless-game-runner.js**: Server-side game runner for screenshots
- **screenshot-renderer.js**: PNG screenshot generation
- **core/post.js**: Reddit post creation and management

#### Shared (`src/shared/`)
- **game-schema.js**: Game validation and schema definitions
- **game-prompt.js**: LLM response parsing (markdown → JSON + JavaScript)
- **game-prompt-common.js**: Common prompt utilities
- **game-runner-common.js**: Shared game execution logic
- **test-games/**: Manual test games (pong.js, platformer.js)

#### Testbed (`src/testbed/`)
- **server.js**: Local testing server with Devvit API mocks
- **loader.js**: Module loader for testbed environment
- **mocks/**: Devvit API mocks for local development

#### Scripts
- **test-generation.js**: AI model testing script for game generation

#### Configuration
- **devvit.json**: Devvit app configuration (entry points, menu items, settings)
- **package.json**: NPM scripts and dependencies
- **tsconfig.json**: TypeScript configuration for ES modules
