function metadata() {
  return {
    title: "Pong NES",
    description: "A classic Pong game with two paddles and a ball",
    controls: [
      {key: "up", action: "move player 1 paddle up"},
      {key: "down", action: "move player 1 paddle down"}
    ]
  };
}

function resources() {
  return {
    sprites: [
      // Sprite 0: Square (for paddle middle) - white
      [
        [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]
      ],

      // Sprite 1: Paddle top (rounded top) - white
      [
        [0x3C, 0x7E, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]
      ],

      // Sprite 2: Paddle bottom (rounded bottom) - white
      [
        [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7E, 0x3C]
      ],

      // Sprite 3: Ball (round) - 1 layer sprite
      // 00111100 ← 0x3C
      // 01111110 ← 0x7E
      // 11111111 ← 0xFF
      // 11111111 ← 0xFF
      // 11111111 ← 0xFF
      // 11111111 ← 0xFF
      // 01111110 ← 0x7E
      // 00111100 ← 0x3C
      [
        [0x3C, 0x7E, 0xFF, 0xFF, 0xFF, 0xFF, 0x7E, 0x3C]
      ]
    ],
    palette: [0x000000, 0xFFFFFF, 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0x808080, 0x800000, 0x008000, 0x000080, 0x808000, 0x800080, 0x008080, 0xC0C0C0]
  };
}

let gameState;

function update(deltaTime, input) {
  // Initialize game state if needed
  if (!gameState) {
    gameState = {
      player1: { x: 10, y: 100 },
      player2: { x: 238, y: 100 },
      ball: { x: 130, y: 100, dx: 2, dy: 2 }
    };
  }

  // Player 1 controls (paddle is 32 pixels tall)
  if (input.up && gameState.player1.y > 0) gameState.player1.y -= 2;
  if (input.down && gameState.player1.y < 224) gameState.player1.y += 2; // 256 - 32 = 224

  // Player 2 controls (AI) - target center of paddle
  const player2Center = gameState.player2.y + 16; // Center of 32px paddle
  if (gameState.ball.y < player2Center - 4) gameState.player2.y -= 2;
  if (gameState.ball.y > player2Center + 4) gameState.player2.y += 2;
  // Keep AI paddle in bounds
  if (gameState.player2.y < 0) gameState.player2.y = 0;
  if (gameState.player2.y > 224) gameState.player2.y = 224;

  // Update ball position
  gameState.ball.x += gameState.ball.dx;
  gameState.ball.y += gameState.ball.dy;

  // Ball collision with top and bottom
  if (gameState.ball.y <= 0 || gameState.ball.y >= 232) {
    gameState.ball.dy *= -1;
  }

  // Ball collision with paddles (32 pixels tall)
  if ((gameState.ball.x <= gameState.player1.x + 8 &&
       gameState.ball.y + 8 >= gameState.player1.y &&
       gameState.ball.y <= gameState.player1.y + 32) ||
      (gameState.ball.x + 8 >= gameState.player2.x &&
       gameState.ball.y + 8 >= gameState.player2.y &&
       gameState.ball.y <= gameState.player2.y + 32)) {
    gameState.ball.dx *= -1;
  }

  // Reset ball if it goes off screen
  if (gameState.ball.x < 0 || gameState.ball.x > 256) {
    gameState.ball.x = 130;
    gameState.ball.y = 100;
    gameState.ball.dx = gameState.ball.dx > 0 ? 2 : -2;
    gameState.ball.dy = 2;
  }

  // Return grouped commands
  return {
    sprites: [
      // Player 1 paddle (rounded)
      {
        spriteId: 1, // Top rounded
        x: gameState.player1.x,
        y: gameState.player1.y
      },
      {
        spriteId: 0, // Middle square
        x: gameState.player1.x,
        y: gameState.player1.y + 8
      },
      {
        spriteId: 0, // Middle square
        x: gameState.player1.x,
        y: gameState.player1.y + 16
      },
      {
        spriteId: 2, // Bottom rounded
        x: gameState.player1.x,
        y: gameState.player1.y + 24
      },
      // Player 2 paddle (rounded)
      {
        spriteId: 1, // Top rounded
        x: gameState.player2.x,
        y: gameState.player2.y
      },
      {
        spriteId: 0, // Middle square
        x: gameState.player2.x,
        y: gameState.player2.y + 8
      },
      {
        spriteId: 0, // Middle square
        x: gameState.player2.x,
        y: gameState.player2.y + 16
      },
      {
        spriteId: 2, // Bottom rounded
        x: gameState.player2.x,
        y: gameState.player2.y + 24
      },
      // Ball
      {
        spriteId: 3, // Round ball
        x: gameState.ball.x,
        y: gameState.ball.y
      }
    ]
  };
}