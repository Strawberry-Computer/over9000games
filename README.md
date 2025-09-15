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

## Game Development

### Console API (Setters Only)
```javascript
// Sprite management
setSprite(slotId, spriteId, x, y)     // Place sprite in slot
clearSprite(slotId)                   // Remove sprite from slot

// Tile management
setTile(x, y, tileId)                 // Set background tile
clearTile(x, y)                       // Clear tile to transparent

// Screen properties
setBackgroundColor(colorIndex)        // Set screen clear color
setPalette(paletteId, colors)         // Define 16-color palette

// Input (read-only)
isPressed(button)    // 'up', 'down', 'left', 'right', 'a', 'b'
justPressed(button)  // True for single frame

// Audio
playSound(channelId, frequency, duration)
playMusic(sequence)
```

### Rendering Model
1. **Game Update**: Modify sprite/tile positions using setters
2. **Console Render**: Single pass renders all sprites/tiles to canvas
3. **No Direct Drawing**: Games never call canvas methods directly
4. **60 FPS**: Update → Set → Render cycle repeats
