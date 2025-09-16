function(sys) {
  if (!globalThis.gameState) {
    globalThis.gameState = {
      player: { x: 120, y: 120 }
    };
  }

  if (sys.isPressed('up')) globalThis.gameState.player.y -= 2;
  if (sys.isPressed('down')) globalThis.gameState.player.y += 2;
  if (sys.isPressed('left')) globalThis.gameState.player.x -= 2;
  if (sys.isPressed('right')) globalThis.gameState.player.x += 2;

  sys.setSprite(0, 0, globalThis.gameState.player.x, globalThis.gameState.player.y);
}