function metadata() {
  return {
    title: "Simple Movement Test",
    description: "A basic test game with a moving square - use arrow keys to move",
    controls: [
      {key: "arrow keys", action: "move player"},
      {key: "a", action: "unused"}
    ]
  };
}

function resources() {
  return {
    sprites: [
      // Sprite 0: 4-layer multicolor square (16 colors possible)
      // Layer 0 (border):    Layer 1 (outer):     Layer 2 (middle):    Layer 3 (center):
      // 11111111 ← 0xFF      00000000 ← 0x00       00000000 ← 0x00       00000000 ← 0x00
      // 10000001 ← 0x81      01111110 ← 0x7E       00000000 ← 0x00       00000000 ← 0x00
      // 10000001 ← 0x81      01000010 ← 0x42       00111100 ← 0x3C       00000000 ← 0x00
      // 10000001 ← 0x81      01000010 ← 0x42       00100100 ← 0x24       00011000 ← 0x18
      // 10000001 ← 0x81      01000010 ← 0x42       00100100 ← 0x24       00011000 ← 0x18
      // 10000001 ← 0x81      01000010 ← 0x42       00111100 ← 0x3C       00000000 ← 0x00
      // 10000001 ← 0x81      01111110 ← 0x7E       00000000 ← 0x00       00000000 ← 0x00
      // 11111111 ← 0xFF      00000000 ← 0x00       00000000 ← 0x00       00000000 ← 0x00
      // Combines to: border (palette[1]), outer ring (palette[3]), middle ring (palette[5]), center (palette[9])
      [
        [0xFF, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0xFF],
        [0x00, 0x7E, 0x42, 0x42, 0x42, 0x42, 0x7E, 0x00],
        [0x00, 0x00, 0x3C, 0x24, 0x24, 0x3C, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x18, 0x18, 0x00, 0x00, 0x00]
      ]
    ],
    palette: [0x000000, 0x666666, 0x888888, 0xAAAAAA, 0xCCCCCC, 0xFFFFFF, 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0x800000, 0x008000, 0x000080, 0x808080]
  };
}

let gameState;

function update(deltaTime, input) {
  // Initialize game state if needed
  if (!gameState) {
    gameState = {
      player: { x: 120, y: 120 }
    };
  }

  // Handle input
  if (input.up) gameState.player.y -= 2;
  if (input.down) gameState.player.y += 2;
  if (input.left) gameState.player.x -= 2;
  if (input.right) gameState.player.x += 2;

  // Return grouped commands
  return {
    sprites: [
      {
        spriteId: 0,
        x: gameState.player.x,
        y: gameState.player.y
      }
    ]
  };
}