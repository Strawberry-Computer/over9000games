// Test games for debugging and demonstration
export const TEST_GAMES = {
  'simple-movement': {
    metadata: {
      title: "Simple Movement Test",
      description: "A basic test game with a moving square - use arrow keys to move",
      controls: [
        {"key": "arrow keys", "action": "move player"},
        {"key": "a", "action": "unused"}
      ]
    },
    sprites: [
      {
        width: 8,
        height: 8,
        layers: [
          [255,129,129,129,129,129,129,255],
          [0,126,66,66,66,66,126,0],
          [0,0,60,36,36,60,0,0],
          [0,0,0,24,24,0,0,0]
        ]
      }
    ],
    tiles: {},
    palette: [0x000000, 0x666666, 0x888888, 0xAAAAAA, 0xCCCCCC, 0xFFFFFF, 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0x800000, 0x008000, 0x000080, 0x808080],
    initialState: {},
    updateCode: `
      // Game state
      let player = {x: 120, y: 120};

      function gameUpdate(deltaTime, input) {
        // Handle input with smooth movement
        const speed = 100; // pixels per second

        if (input.up) player.y -= speed * deltaTime;
        if (input.down) player.y += speed * deltaTime;
        if (input.left) player.x -= speed * deltaTime;
        if (input.right) player.x += speed * deltaTime;

        // Keep player on screen
        player.x = Math.max(0, Math.min(248, player.x));
        player.y = Math.max(0, Math.min(248, player.y));

        // Return commands
        return [
          {type: 'sprite', slotId: 0, spriteId: 0, x: player.x, y: player.y}
        ];
      }
    `
  },
  'pong': {
    metadata: {
      title: "Pong NES",
      description: "A retro-inspired Pong game where players control paddles to hit a bouncing ball.",
      controls: [
        {"key": "up", "action": "move paddle up"},
        {"key": "down", "action": "move paddle down"},
        {"key": "a", "action": "hit ball"}
      ]
    },
    sprites: [
      // 0: Ball (round white ball) - color index 1 (white)
      {
        width: 8,
        height: 8,
        layers: [
          [0x00, 0x3C, 0x7E, 0xFF, 0xFF, 0x7E, 0x3C, 0x00], // Layer 0: round shape
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1: off
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2: off
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3: off
        ]
      },
      // 1: Paddle top (rounded top) - color index 1 (white)
      {
        width: 8,
        height: 8,
        layers: [
          [0x3C, 0x7E, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], // Layer 0: rounded top
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1: off
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2: off
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3: off
        ]
      },
      // 2: Paddle middle (solid rectangle) - color index 1 (white)
      {
        width: 8,
        height: 8,
        layers: [
          [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], // Layer 0: solid
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1: off
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2: off
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3: off
        ]
      },
      // 3: Paddle bottom (rounded bottom) - color index 1 (white)
      {
        width: 8,
        height: 8,
        layers: [
          [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7E, 0x3C], // Layer 0: rounded bottom
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1: off
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2: off
          [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3: off
        ]
      }
    ],
    tiles: {},
    palette: [0x000000, 0xFFFFFF, 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0x888888, 0x444444, 0xAAAAAA, 0xCCCCCC, 0x800000, 0x008000, 0x000080, 0x808080],
    initialState: {},
    updateCode: `
      // Game state
      let player1 = {x: 10, y: 100};
      let player2 = {x: 238, y: 100};
      let ball = {x: 130, y: 100, dx: 120, dy: 120}; // pixels per second
      let score = 0;
      const paddleHeight = 24; // 3 sprites * 8 pixels each

      function drawPaddle(slotStart, paddleX, paddleY) {
        // Draw 3-sprite tall paddle with rounded ends
        return [
          {type: 'sprite', slotId: slotStart, spriteId: 1, x: paddleX, y: paddleY},     // Top
          {type: 'sprite', slotId: slotStart + 1, spriteId: 2, x: paddleX, y: paddleY + 8}, // Middle
          {type: 'sprite', slotId: slotStart + 2, spriteId: 3, x: paddleX, y: paddleY + 16} // Bottom
        ];
      }

      function gameUpdate(deltaTime, input) {
        const paddleSpeed = 150; // pixels per second

        // Player 1 controls
        if (input.up && player1.y > 0) {
          player1.y -= paddleSpeed * deltaTime;
        }
        if (input.down && player1.y < 256 - paddleHeight) {
          player1.y += paddleSpeed * deltaTime;
        }

        // Simple AI for player 2 (follows ball)
        const paddle2Center = player2.y + paddleHeight / 2;
        const ballCenter = ball.y + 4;

        if (ballCenter < paddle2Center - 2 && player2.y > 0) {
          player2.y -= paddleSpeed * deltaTime;
        }
        if (ballCenter > paddle2Center + 2 && player2.y < 256 - paddleHeight) {
          player2.y += paddleSpeed * deltaTime;
        }

        // Update ball position
        ball.x += ball.dx * deltaTime;
        ball.y += ball.dy * deltaTime;

        // Ball collision with top and bottom walls
        if (ball.y <= 0 || ball.y >= 248) {
          ball.dy *= -1;
          ball.y = Math.max(0, Math.min(248, ball.y)); // Keep in bounds
        }

        // Ball collision with paddles
        if (ball.x <= player1.x + 8 && ball.x >= player1.x &&
            ball.y >= player1.y && ball.y <= player1.y + paddleHeight) {
          ball.dx = Math.abs(ball.dx); // Bounce right
          score += 10;
        }

        if (ball.x >= player2.x - 8 && ball.x <= player2.x &&
            ball.y >= player2.y && ball.y <= player2.y + paddleHeight) {
          ball.dx = -Math.abs(ball.dx); // Bounce left
          score += 10;
        }

        // Reset ball if it goes off screen (scoring)
        if (ball.x < -8) {
          ball.x = 130;
          ball.y = 100;
          ball.dx = 120; // Serve right
          ball.dy = (Math.random() - 0.5) * 240; // Random angle
          score += 100; // Point for player 2
        }

        if (ball.x > 264) {
          ball.x = 130;
          ball.y = 100;
          ball.dx = -120; // Serve left
          ball.dy = (Math.random() - 0.5) * 240; // Random angle
          score += 100; // Point for player 1
        }

        // Build command list
        let commands = [];

        // Draw paddles (multi-sprite objects)
        commands.push(...drawPaddle(0, player1.x, player1.y));
        commands.push(...drawPaddle(3, player2.x, player2.y));

        // Draw ball
        commands.push({type: 'sprite', slotId: 6, spriteId: 0, x: ball.x, y: ball.y});

        // Update score
        commands.push({type: 'score', value: score});

        return commands;
      }
    `
  }
};

export function getTestGame(gameName) {
  return TEST_GAMES[gameName];
}

export function getAvailableTestGames() {
  return Object.keys(TEST_GAMES);
}