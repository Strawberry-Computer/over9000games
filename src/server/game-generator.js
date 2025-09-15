export async function generateGameWithAI(description) {
  const gameDefinition = createSimpleGame(description);
  return gameDefinition;
}

function createSimpleGame(description) {
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

  const gameLogic = `
// Simple game logic - collect items while avoiding enemies
let player = { x: 128, y: 128, speed: 2 };
let enemies = [
  { x: 50, y: 50, dx: 1, dy: 1 },
  { x: 200, y: 100, dx: -1, dy: 1 },
  { x: 100, y: 200, dx: 1, dy: -1 }
];
let collectibles = [
  { x: 80, y: 80, collected: false },
  { x: 180, y: 80, collected: false },
  { x: 80, y: 180, collected: false },
  { x: 180, y: 180, collected: false }
];
let gameStarted = false;
let gameOver = false;

function gameUpdate() {
  if (!gameStarted && console.justPressed('start')) {
    gameStarted = true;
    console.setScore(0);
  }

  if (!gameStarted || gameOver) {
    // Show start screen
    console.setSprite(0, 'player', 128, 128);
    return;
  }

  // Player movement
  if (console.isPressed('up') && player.y > 0) player.y -= player.speed;
  if (console.isPressed('down') && player.y < 248) player.y += player.speed;
  if (console.isPressed('left') && player.x > 0) player.x -= player.speed;
  if (console.isPressed('right') && player.x < 248) player.x += player.speed;

  // Enemy movement
  enemies.forEach((enemy, i) => {
    enemy.x += enemy.dx;
    enemy.y += enemy.dy;

    if (enemy.x <= 0 || enemy.x >= 248) enemy.dx = -enemy.dx;
    if (enemy.y <= 0 || enemy.y >= 248) enemy.dy = -enemy.dy;

    // Check collision with player
    if (Math.abs(enemy.x - player.x) < 8 && Math.abs(enemy.y - player.y) < 8) {
      gameOver = true;
      // Dispatch game over event
      document.dispatchEvent(new CustomEvent('gameOver', { detail: { score: console.getScore() } }));
    }

    console.setSprite(10 + i, 'enemy', enemy.x, enemy.y);
  });

  // Collectible logic
  collectibles.forEach((item, i) => {
    if (!item.collected) {
      if (Math.abs(item.x - player.x) < 8 && Math.abs(item.y - player.y) < 8) {
        item.collected = true;
        console.addScore(100);
        console.clearSprite(20 + i);
      } else {
        console.setSprite(20 + i, 'collectible', item.x, item.y);
      }
    }
  });

  // Check win condition
  if (collectibles.every(item => item.collected)) {
    console.addScore(500); // Bonus for completing level
    gameOver = true;
    document.dispatchEvent(new CustomEvent('gameOver', { detail: { score: console.getScore() } }));
  }

  // Draw walls around border
  for (let x = 0; x < 32; x++) {
    console.setTile(x, 0, 'wall');
    console.setTile(x, 31, 'wall');
  }
  for (let y = 0; y < 32; y++) {
    console.setTile(0, y, 'wall');
    console.setTile(31, y, 'wall');
  }

  // Draw player
  console.setSprite(0, 'player', player.x, player.y);
}

// Call the update function
if (typeof console !== 'undefined') {
  gameUpdate(console);
}
`;

  return {
    name: generateGameName(description),
    description: description.length > 100 ? description.substring(0, 100) + "..." : description,
    sprites: {
      player: playerSprite,
      enemy: enemySprite,
      collectible: collectibleSprite
    },
    tiles: {
      wall: wallTile
    },
    gameLogic,
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