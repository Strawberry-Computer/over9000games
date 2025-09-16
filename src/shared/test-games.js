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
      {
        width: 8,
        height: 8,
        layers: [
          [255,255,255,255,255,255,255,255],
          [0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0]
        ]
      },
      {
        width: 8,
        height: 8,
        layers: [
          [255,0,0,0,0,0,0,255],
          [255,0,0,0,0,0,0,255],
          [255,0,0,0,0,0,0,255],
          [255,0,0,0,0,0,0,255]
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

      function gameUpdate(deltaTime, input) {
        const paddleSpeed = 150; // pixels per second

        // Player 1 controls
        if (input.up && player1.y > 0) {
          player1.y -= paddleSpeed * deltaTime;
        }
        if (input.down && player1.y < 232) {
          player1.y += paddleSpeed * deltaTime;
        }

        // Simple AI for player 2
        if (ball.y < player2.y && player2.y > 0) {
          player2.y -= paddleSpeed * deltaTime;
        }
        if (ball.y > player2.y + 8 && player2.y < 232) {
          player2.y += paddleSpeed * deltaTime;
        }

        // Update ball position
        ball.x += ball.dx * deltaTime;
        ball.y += ball.dy * deltaTime;

        // Ball collision with top and bottom
        if (ball.y <= 0 || ball.y >= 248) {
          ball.dy *= -1;
        }

        // Ball collision with paddles
        if ((ball.x <= player1.x + 8 && ball.y >= player1.y && ball.y <= player1.y + 24) ||
            (ball.x >= player2.x - 8 && ball.y >= player2.y && ball.y <= player2.y + 24)) {
          ball.dx *= -1;
          score += 10;
        }

        // Reset ball if it goes off screen
        if (ball.x < 0 || ball.x > 256) {
          ball.x = 130;
          ball.y = 100;
          ball.dx = ball.dx > 0 ? 120 : -120;
          ball.dy = 120;
        }

        // Return commands
        return [
          {type: 'sprite', slotId: 0, spriteId: 1, x: player1.x, y: player1.y},
          {type: 'sprite', slotId: 1, spriteId: 1, x: player2.x, y: player2.y},
          {type: 'sprite', slotId: 2, spriteId: 0, x: ball.x, y: ball.y},
          {type: 'score', value: score}
        ];
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