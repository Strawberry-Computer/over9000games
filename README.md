# Over9000Games - NES-Style Game Console for Reddit

A retro 8-bit game console built on Reddit's Devvit platform featuring authentic NES-style graphics and gameplay.

## Console Specifications

### Display
- **Resolution**: 256×256 pixels
- **Color Depth**: 4-bit (16 colors)
- **Sprites**: 8×8 pixels, unlimited positioning
- **Max Sprites**: 64 simultaneous on screen
- **Background**: 32×32 tile grid (8×8 pixel tiles)

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
- HTML5 Canvas: Hardware-accelerated graphics rendering

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
  setSprite(0, 'player_walk', player.x, player.y);
  setSprite(1, 'enemy', enemy.x, enemy.y);
  setTile(15, 20, 'grass');

  // Animation handled by changing sprite ID
  const coinFrame = Math.floor(time / 10) % 4;
  setSprite(2, `coin_frame_${coinFrame}`, coin.x, coin.y);
}

// Console handles actual rendering after game update
```

## Getting Started

### Prerequisites
- Node.js 22+
- Reddit Developer Account

### Setup
1. Clone this repository
2. `npm install`
3. `npm run login` - Authenticate with Reddit
4. `npm run dev` - Start development server

### Commands
- `npm run dev`: Live development on Reddit
- `npm run build`: Build client and server
- `npm run deploy`: Upload to Reddit (staging)
- `npm run launch`: Publish for review
- `npm run type-check`: TypeScript validation

## Dynamic Game Generation Architecture

### QuickJS Game Execution System
```
┌─────────────────────────────────────────────────────────────────┐
│                    DYNAMIC GAME ARCHITECTURE                    │
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
                       │  Generated Game  │    │   NES Console   │
                       │     Object       │    │   Integration   │
                       └──────────────────┘    └─────────────────┘
```

### Game Generation Flow
• **User Request**: Natural language game description
• **LLM Processing**: Generate complete game definition (sprites, logic, metadata)
• **Schema Validation**: Ensure generated game follows NES console API
• **QuickJS Execution**: Sandboxed JavaScript execution on client
• **Console Integration**: Game manipulates NES console through `sys` interface

### Generated Game Object Structure
```javascript
const generatedGame = {
  metadata: {
    title: "Snake Game",
    description: "Classic snake game with apples",
    controls: [
      {key: "arrow keys", action: "move snake"},
      {key: "a", action: "boost speed"}
    ]
  },

  // NES-style sprite definitions
  sprites: {
    "snake_head": {
      id: "snake_head",
      width: 8, height: 8,
      layers: [
        [0xFF, 0x81, 0x81, 0xFF, 0xFF, 0x81, 0x81, 0xFF], // Layer 0
        [0x00, 0x7E, 0x42, 0x42, 0x42, 0x42, 0x7E, 0x00], // Layer 1
        [0x00, 0x00, 0x3C, 0x24, 0x24, 0x3C, 0x00, 0x00], // Layer 2
        [0x00, 0x00, 0x00, 0x18, 0x18, 0x00, 0x00, 0x00]  // Layer 3
      ]
    },
    // ... more sprites
  },

  tiles: {
    "wall": { /* tile definition */ }
  },

  palette: [
    0x000000, 0x00FF00, 0xFF0000, 0x808080, // Snake colors
    0xFFFF00, 0xFF8000, 0x8000FF, 0x00FFFF  // Food/UI colors
  ],

  // Game logic executed in QuickJS sandbox
  update: (sys) => {
    // Handle input
    if (sys.isPressed('up') && gameState.direction !== 'down') {
      gameState.direction = 'up';
    }

    // Update snake position
    moveSnake(gameState);
    checkCollisions(gameState);

    // Clear all sprites
    for(let i = 0; i < 64; i++) sys.clearSprite(i);

    // Draw snake body
    gameState.snake.forEach((segment, i) => {
      const spriteId = i === 0 ? 'snake_head' : 'snake_body';
      sys.setSprite(i, spriteId, segment.x * 8, segment.y * 8);
    });

    // Draw apple
    sys.setSprite(60, 'apple', gameState.apple.x * 8, gameState.apple.y * 8);

    sys.setScore(gameState.score);
  },

  initialState: {
    snake: [{x: 10, y: 10}, {x: 9, y: 10}],
    apple: {x: 15, y: 15},
    direction: 'right',
    score: 0,
    gameOver: false
  }
}
```

### API Endpoints

#### Game Generation
• `POST /api/games/generate` - Generate game from description
• `POST /api/games/validate` - Validate game schema
• `GET /api/games/:id` - Get game definition

#### Game State Management
• `POST /api/games/:id/save` - Save game state to Redis
• `POST /api/games/:id/load` - Load saved game state
• `POST /api/games/:id/score` - Submit high score

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

#### System Interface (sys parameter)
```javascript
// Available in QuickJS game update function
function update(sys) {
  // Sprite management
  sys.setSprite(slotId, spriteId, x, y);    // Place sprite in slot
  sys.clearSprite(slotId);                   // Remove sprite from slot

  // Tile management
  sys.setTile(x, y, tileId);                // Set background tile
  sys.clearTile(x, y);                      // Clear tile to transparent

  // Screen properties
  sys.setBackgroundColor(colorIndex);       // Set screen clear color

  // Input (read-only)
  sys.isPressed(button);     // 'up', 'down', 'left', 'right', 'a', 'b'
  sys.justPressed(button);   // True for single frame

  // Score management
  sys.setScore(score);
  sys.addScore(points);
  sys.getScore();
}
```

#### Execution Model
1. **LLM Generation**: Complete game object with sprites and logic
2. **Client Validation**: Schema compliance check
3. **QuickJS Loading**: Game code loaded into sandbox
4. **NES Integration**: Game update called each frame (60 FPS)
5. **Console Rendering**: NES console renders sprites/tiles set by game
