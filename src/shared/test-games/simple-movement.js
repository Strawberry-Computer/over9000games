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
      // Sprite 0: Layered square (multicolor)
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

  // Return command array
  return [
    {
      type: 'sprite',
      slotId: 0,
      spriteId: 0,
      x: gameState.player.x,
      y: gameState.player.y
    }
  ];
}