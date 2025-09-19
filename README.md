# Over9000Games - NES-Style Game Console for Reddit

A retro 8-bit game console built on Reddit's Devvit platform featuring authentic NES-style graphics and gameplay.

## Console Specifications

### Display
- **Resolution**: 128×128 pixels
- **Color Depth**: 4-bit (16 colors)
- **Sprites**: 8×8 pixels, unlimited positioning
- **Max Sprites**: 64 simultaneous on screen
- **Background**: 16×16 tile grid (8×8 pixel tiles)

### Graphics System
- **Sprite Definition**: 4-layer bitmask system
- **Color Calculation**: Each pixel = Layer3|Layer2|Layer1|Layer0 (4-bit)
- **Rendering**: Dual-canvas architecture (sprite sheet + main canvas)
- **Performance**: Hardware-accelerated canvas blitting

### Input
- **Controls**: NES-style D-pad + A/B buttons + Start/Select
- **Mapping**: Arrow keys, Z/X, Enter/Space
- **Response**: 60 FPS input polling

### Audio
- **Channels**: 4-channel audio (2 pulse, 1 triangle, 1 noise)
- **Format**: Web Audio API with 8-bit sound synthesis
- **Music**: Simple pattern-based sequencer

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
- **4-Layer Bitmasks**: Each sprite defined as 4 JavaScript bitmask arrays
- **Color Composition**: `color = Layer3<<3 | Layer2<<2 | Layer1<<1 | Layer0`
- **Pre-Rendering**: Sprites compiled to canvas sprite sheet at startup
- **Deferred Rendering**: Games set sprite positions, console renders all at once

### Game Development Pattern
```javascript
// Game loop - setters only, no direct rendering
function gameUpdate() {
  // Update game logic
  player.x += velocity;

  // Set sprite positions (deferred)
  setSprite(0, 0, player.x, player.y); // 0 = player_walk sprite
  setSprite(1, 1, enemy.x, enemy.y);   // 1 = enemy sprite
  setTile(15, 20, 0); // 0 = grass tile

  // Animation handled by changing sprite ID
  const coinFrame = Math.floor(time / 10) % 4;
  setSprite(2, 2 + coinFrame, coin.x, coin.y); // 2-5 = coin animation frames
}

// Console handles actual rendering after game update
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
- `npm run dev`: Live development on Reddit
- `npm run build`: Build client and server
- `npm run deploy`: Upload to Reddit (staging)
- `npm run launch`: Publish for review
- `npm run type-check`: TypeScript validation

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
    {
      width: 8, height: 8,
      layers: [
        [0xFF, 0x81, 0x81, 0xFF, 0xFF, 0x81, 0x81, 0xFF], // Layer 0
        [0x00, 0x7E, 0x42, 0x42, 0x42, 0x42, 0x7E, 0x00], // Layer 1
        [0x00, 0x00, 0x3C, 0x24, 0x24, 0x3C, 0x00, 0x00], // Layer 2
        [0x00, 0x00, 0x00, 0x18, 0x18, 0x00, 0x00, 0x00]  // Layer 3
      ]
    }
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
• `POST /api/games/generate` - Generate game from natural language description
• `GET /api/games/:id` - Retrieve game definition and state
• `POST /api/games/:id/save` - Persist game state to Redis
• `POST /api/games/:id/load` - Load saved game state

#### App Integration
• `GET /api/init` - Initialize application state and user context
• `POST /internal/on-app-install` - App installation handler
• `POST /internal/menu/post-create` - Create new game post from subreddit menu

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

#### Minimal Game Interface
```javascript
// Games must define this function
function gameUpdate(deltaTime, input) {
  // deltaTime: seconds since last frame (e.g., 0.016 for 60fps)
  // input: { up, down, left, right, a, b, start, select,
  //          upPressed, downPressed, leftPressed, rightPressed,
  //          aPressed, bPressed, startPressed, selectPressed }

  // Return array of commands
  return [
    {type: 'sprite', slotId: 0, spriteId: 1, x: 10, y: 20},
    {type: 'clearSprite', slotId: 1},
    {type: 'tile', x: 5, y: 3, tileId: 2},
    {type: 'clearTile', x: 5, y: 3},
    {type: 'background', colorIndex: 2},
    {type: 'score', value: 100},
    {type: 'sound', soundId: 'beep'}
  ];
}
```

#### Command Types
- **sprite**: `{type: 'sprite', slotId, spriteId, x, y}` - Place sprite
- **clearSprite**: `{type: 'clearSprite', slotId}` - Remove sprite
- **tile**: `{type: 'tile', x, y, tileId}` - Set background tile
- **clearTile**: `{type: 'clearTile', x, y}` - Clear tile
- **background**: `{type: 'background', colorIndex}` - Set background color
- **score**: `{type: 'score', value}` - Update score display
- **sound**: `{type: 'sound', soundId}` - Play sound (TODO)

#### Execution Model
1. **LLM Generation**: Self-contained game code with sprites
2. **QuickJS Loading**: Raw game code loaded into sandbox
3. **Frame Execution**: `gameUpdate(deltaTime, input)` called at 60 FPS
4. **Command Processing**: Returned commands executed by NES console
5. **Console Rendering**: Sprites/tiles rendered based on commands
