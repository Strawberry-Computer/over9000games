function(sys) {
  if (!globalThis.gameState) {
    globalThis.gameState = {
      player1: { x: 10, y: 100 },
      player2: { x: 238, y: 100 },
      ball: { x: 130, y: 100, dx: 2, dy: 2 }
    };
  }

  // Player 1 controls
  if (sys.isPressed('up') && globalThis.gameState.player1.y > 0) globalThis.gameState.player1.y -= 2;
  if (sys.isPressed('down') && globalThis.gameState.player1.y < 232) globalThis.gameState.player1.y += 2;

  // Player 2 controls (AI or second player)
  if (globalThis.gameState.ball.y < globalThis.gameState.player2.y) globalThis.gameState.player2.y -= 2;
  if (globalThis.gameState.ball.y > globalThis.gameState.player2.y + 8) globalThis.gameState.player2.y += 2;

  // Update ball position
  globalThis.gameState.ball.x += globalThis.gameState.ball.dx;
  globalThis.gameState.ball.y += globalThis.gameState.ball.dy;

  // Ball collision with top and bottom
  if (globalThis.gameState.ball.y <= 0 || globalThis.gameState.ball.y >= 232) {
    globalThis.gameState.ball.dy *= -1; // Reverse direction
  }

  // Ball collision with paddles
  if ((globalThis.gameState.ball.x <= globalThis.gameState.player1.x + 8 && globalThis.gameState.ball.y >= globalThis.gameState.player1.y && globalThis.gameState.ball.y <= globalThis.gameState.player1.y + 8) ||
      (globalThis.gameState.ball.x >= globalThis.gameState.player2.x - 8 && globalThis.gameState.ball.y >= globalThis.gameState.player2.y && globalThis.gameState.ball.y <= globalThis.gameState.player2.y + 8)) {
    globalThis.gameState.ball.dx *= -1; // Reverse direction
  }

  // Reset ball if it goes off screen
  if (globalThis.gameState.ball.x < 0 || globalThis.gameState.ball.x > 256) {
    globalThis.gameState.ball.x = 130;
    globalThis.gameState.ball.y = 100;
    globalThis.gameState.ball.dx = globalThis.gameState.ball.dx > 0 ? 2 : -2;
    globalThis.gameState.ball.dy = 2;
  }

  // Set sprites using DIFFERENT SLOTS
  sys.setSprite(0, 1, globalThis.gameState.player1.x, globalThis.gameState.player1.y); // Player 1 paddle
  sys.setSprite(1, 1, globalThis.gameState.player2.x, globalThis.gameState.player2.y); // Player 2 paddle
  sys.setSprite(2, 0, globalThis.gameState.ball.x, globalThis.gameState.ball.y); // Ball
}