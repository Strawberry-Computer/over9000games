export async function generateGameWithAI(description) {
  // For now, generate a QuickJS-compatible game based on description
  // TODO: Integrate with actual LLM service for dynamic generation
  const gameDefinition = createQuickJSGame(description);
  return gameDefinition;
}

function createQuickJSGame(description) {
  const defaultPalette = [
    0x000000, 0x666666, 0x888888, 0xAAAAAA, 0xCCCCCC, 0xFFFFFF,
    0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF,
    0x800000, 0x008000, 0x000080, 0x808080
  ];

  const playerSprite = {
    id: "player",
    width: 8,
    height: 8,
    layers: [
      [0b00111100, 0b01111110, 0b11111111, 0b11111111, 0b11111111, 0b01111110, 0b00111100, 0b00000000],
      [0b00000000, 0b00100100, 0b00000000, 0b01111110, 0b00000000, 0b00000000, 0b00000000, 0b00000000],
      [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000],
      [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000]
    ]
  };

  const enemySprite = {
    id: "enemy",
    width: 8,
    height: 8,
    layers: [
      [0b11111111, 0b10000001, 0b10111101, 0b10100101, 0b10100101, 0b10111101, 0b10000001, 0b11111111],
      [0b00000000, 0b01111110, 0b01000010, 0b01011010, 0b01011010, 0b01000010, 0b01111110, 0b00000000],
      [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000],
      [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000]
    ]
  };

  const collectibleSprite = {
    id: "collectible",
    width: 8,
    height: 8,
    layers: [
      [0b00111100, 0b01000010, 0b10000001, 0b10000001, 0b10000001, 0b10000001, 0b01000010, 0b00111100],
      [0b00000000, 0b00111100, 0b01111110, 0b01111110, 0b01111110, 0b01111110, 0b00111100, 0b00000000],
      [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000],
      [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000]
    ]
  };

  const wallTile = {
    id: "wall",
    width: 8,
    height: 8,
    layers: [
      [0b11111111, 0b11111111, 0b11111111, 0b11111111, 0b11111111, 0b11111111, 0b11111111, 0b11111111],
      [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000],
      [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000],
      [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000]
    ]
  };

  // QuickJS-compatible update function using 'sys' interface
  const updateFunction = function(sys) {
    // Access game state from global scope
    if (!globalThis.gameState) {
      globalThis.gameState = {
        player: { x: 128, y: 128, speed: 2 },
        enemies: [
          { x: 50, y: 50, dx: 1, dy: 1 },
          { x: 200, y: 100, dx: -1, dy: 1 },
          { x: 100, y: 200, dx: 1, dy: -1 }
        ],
        collectibles: [
          { x: 80, y: 80, collected: false },
          { x: 180, y: 80, collected: false },
          { x: 80, y: 180, collected: false },
          { x: 180, y: 180, collected: false }
        ],
        gameStarted: false,
        gameOver: false
      };
    }

    const state = globalThis.gameState;

    if (!state.gameStarted && sys.justPressed('start')) {
      state.gameStarted = true;
      sys.setScore(0);
    }

    if (!state.gameStarted || state.gameOver) {
      // Show start screen
      sys.setSprite(0, 'player', 128, 128);
      return;
    }

    // Player movement
    if (sys.isPressed('up') && state.player.y > 0) state.player.y -= state.player.speed;
    if (sys.isPressed('down') && state.player.y < 248) state.player.y += state.player.speed;
    if (sys.isPressed('left') && state.player.x > 0) state.player.x -= state.player.speed;
    if (sys.isPressed('right') && state.player.x < 248) state.player.x += state.player.speed;

    // Enemy movement
    state.enemies.forEach((enemy, i) => {
      enemy.x += enemy.dx;
      enemy.y += enemy.dy;

      if (enemy.x <= 0 || enemy.x >= 248) enemy.dx = -enemy.dx;
      if (enemy.y <= 0 || enemy.y >= 248) enemy.dy = -enemy.dy;

      // Check collision with player
      if (Math.abs(enemy.x - state.player.x) < 8 && Math.abs(enemy.y - state.player.y) < 8) {
        state.gameOver = true;
      }

      sys.setSprite(10 + i, 'enemy', enemy.x, enemy.y);
    });

    // Collectible logic
    state.collectibles.forEach((item, i) => {
      if (!item.collected) {
        if (Math.abs(item.x - state.player.x) < 8 && Math.abs(item.y - state.player.y) < 8) {
          item.collected = true;
          sys.addScore(100);
          sys.clearSprite(20 + i);
        } else {
          sys.setSprite(20 + i, 'collectible', item.x, item.y);
        }
      }
    });

    // Check win condition
    if (state.collectibles.every(item => item.collected)) {
      sys.addScore(500); // Bonus for completing level
      state.gameOver = true;
    }

    // Draw walls around border
    for (let x = 0; x < 32; x++) {
      sys.setTile(x, 0, 'wall');
      sys.setTile(x, 31, 'wall');
    }
    for (let y = 0; y < 32; y++) {
      sys.setTile(0, y, 'wall');
      sys.setTile(31, y, 'wall');
    }

    // Draw player
    sys.setSprite(0, 'player', state.player.x, state.player.y);
  };

  return {
    metadata: {
      title: generateGameName(description),
      description: description.length > 100 ? description.substring(0, 100) + "..." : description,
      controls: [
        { key: "arrow keys", action: "move player" },
        { key: "start", action: "begin game" }
      ]
    },
    sprites: {
      player: playerSprite,
      enemy: enemySprite,
      collectible: collectibleSprite
    },
    tiles: {
      wall: wallTile
    },
    update: updateFunction,
    updateCode: updateFunction.toString(),
    initialState: {
      score: 0
    },
    palette: defaultPalette
  };
}

function generateGameName(description) {
  const keywords = description.toLowerCase().split(' ');
  const gameTypes = ['adventure', 'quest', 'challenge', 'game', 'mission'];

  if (keywords.includes('space')) return 'Space Adventure';
  if (keywords.includes('cat')) return 'Cat Quest';
  if (keywords.includes('platformer')) return 'Platform Challenge';
  if (keywords.includes('shooter')) return 'Arcade Shooter';
  if (keywords.includes('puzzle')) return 'Mind Puzzle';

  return 'Arcade Game';
}