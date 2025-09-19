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
      [
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111"
      ],
      [
        "00111100",
        "01111110",
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111"
      ],
      [
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "01111110",
        "00111100"
      ],
      [
        "00000000",
        "00222200",
        "02222220",
        "22222222",
        "22222222",
        "02222220",
        "00222200",
        "00000000"
      ]
    ],
    palette: [0x000000, 0xFFFFFF, 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0x808080, 0x800000, 0x008000, 0x000080, 0x808000, 0x800080, 0x008080, 0xC0C0C0]
  };
}

// Game constants
const SCREEN_WIDTH = 128;
const SCREEN_HEIGHT = 128;
const SPRITE_SIZE = 8;
const PADDLE_HEIGHT = 32; // 4 sprites tall
const PADDLE_WIDTH = SPRITE_SIZE;
const PADDLE_MARGIN = 4;
const BALL_SIZE = SPRITE_SIZE;

// Movement speeds (pixels per second)
const PLAYER_SPEED = 120;
const AI_SPEED = 100;
const BALL_SPEED = 60;

// Game timing
const GAME_DURATION = 120000; // 2 minutes in milliseconds

// Scoring
const HIT_SCORE = 1;
const WIN_SCORE = 10;

let gameState;

function update(deltaTime, input) {
  // Initialize game state if needed
  if (!gameState) {
    gameState = {
      player1: { x: PADDLE_MARGIN, y: SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
      player2: { x: SCREEN_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH, y: SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
      ball: { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2, dx: BALL_SPEED, dy: BALL_SPEED },
      score: 0,
      gameOver: false,
      startTime: Date.now()
    };
  }

  // Don't update if game is over
  if (gameState.gameOver) {
    return {
      sprites: [],
      score: gameState.score,
      gameOver: true
    };
  }

  // Player 1 controls
  const maxPlayerY = SCREEN_HEIGHT - PADDLE_HEIGHT;
  if (input.up && gameState.player1.y > 0) gameState.player1.y -= PLAYER_SPEED * deltaTime;
  if (input.down && gameState.player1.y < maxPlayerY) gameState.player1.y += PLAYER_SPEED * deltaTime;

  // Player 2 controls (AI) - target center of paddle
  const player2Center = gameState.player2.y + PADDLE_HEIGHT / 2;
  const deadZone = 4;
  if (gameState.ball.y < player2Center - deadZone) gameState.player2.y -= AI_SPEED * deltaTime;
  if (gameState.ball.y > player2Center + deadZone) gameState.player2.y += AI_SPEED * deltaTime;
  // Keep AI paddle in bounds
  if (gameState.player2.y < 0) gameState.player2.y = 0;
  if (gameState.player2.y > maxPlayerY) gameState.player2.y = maxPlayerY;

  // Update ball position using deltaTime
  gameState.ball.x += gameState.ball.dx * deltaTime;
  gameState.ball.y += gameState.ball.dy * deltaTime;

  // Ball collision with top and bottom
  const maxBallY = SCREEN_HEIGHT - BALL_SIZE;
  if (gameState.ball.y <= 0 || gameState.ball.y >= maxBallY) {
    gameState.ball.dy *= -1;
  }

  // Ball collision with paddles
  const ballRight = gameState.ball.x + BALL_SIZE;
  const ballBottom = gameState.ball.y + BALL_SIZE;
  const player1Right = gameState.player1.x + PADDLE_WIDTH;
  const player1Bottom = gameState.player1.y + PADDLE_HEIGHT;
  const player2Bottom = gameState.player2.y + PADDLE_HEIGHT;

  if ((gameState.ball.x <= player1Right &&
       ballBottom >= gameState.player1.y &&
       gameState.ball.y <= player1Bottom) ||
      (ballRight >= gameState.player2.x &&
       ballBottom >= gameState.player2.y &&
       gameState.ball.y <= player2Bottom)) {
    gameState.ball.dx *= -1;
    gameState.score += HIT_SCORE;
  }

  // Check for game over conditions
  const ballOffsetMargin = 10;
  if (gameState.ball.x < -ballOffsetMargin) {
    // Ball went off left side - AI wins, game over
    gameState.gameOver = true;
  } else if (gameState.ball.x > SCREEN_WIDTH + ballOffsetMargin) {
    // Ball went off right side - Player wins, bonus points
    gameState.score += WIN_SCORE;
    // Reset ball for continued play
    gameState.ball.x = SCREEN_WIDTH / 2;
    gameState.ball.y = SCREEN_HEIGHT / 2;
    gameState.ball.dx = -BALL_SPEED;
    gameState.ball.dy = BALL_SPEED;
  }

  // Game over after specified duration
  const playTime = Date.now() - gameState.startTime;
  if (playTime > GAME_DURATION) {
    gameState.gameOver = true;
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
        y: gameState.player1.y + SPRITE_SIZE
      },
      {
        spriteId: 0, // Middle square
        x: gameState.player1.x,
        y: gameState.player1.y + SPRITE_SIZE * 2
      },
      {
        spriteId: 2, // Bottom rounded
        x: gameState.player1.x,
        y: gameState.player1.y + SPRITE_SIZE * 3
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
        y: gameState.player2.y + SPRITE_SIZE
      },
      {
        spriteId: 0, // Middle square
        x: gameState.player2.x,
        y: gameState.player2.y + SPRITE_SIZE * 2
      },
      {
        spriteId: 2, // Bottom rounded
        x: gameState.player2.x,
        y: gameState.player2.y + SPRITE_SIZE * 3
      },
      // Ball
      {
        spriteId: 3, // Round ball
        x: gameState.ball.x,
        y: gameState.ball.y
      }
    ],
    score: gameState.score,
    gameOver: gameState.gameOver
  };
}