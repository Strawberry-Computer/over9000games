function metadata() {
  return {
    title: "Multi-Color Platformer",
    description: "A complex platformer with multi-sprite characters and enemies - use arrow keys to move and spacebar to jump",
    controls: [
      {key: "left/right arrows", action: "move player"},
      {key: "up arrow or B", action: "jump"},
      {key: "A button", action: "attack"}
    ]
  };
}

function resources() {
  return {
    sprites: [
      // Sprite 0: Wizard head - purple hat with white face and gray beard
      [
        [0x00, 0x00, 0x18, 0x3C, 0x66, 0x66, 0x3C, 0x18], // Layer 0 (bit 0) - white face
        [0x3C, 0x7E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1 (bit 1) - purple hat
        [0x00, 0x00, 0x24, 0x42, 0x18, 0x18, 0x42, 0x66], // Layer 2 (bit 2) - eyes and beard highlights
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3 (bit 3)
      ],

      // Sprite 1: Wizard body - purple robes with belt
      [
        [0x18, 0x24, 0x00, 0x18, 0x18, 0x24, 0x18, 0x00], // Layer 0 (bit 0) - white arms and belt
        [0x00, 0x00, 0x3C, 0x66, 0x66, 0x00, 0x00, 0x00], // Layer 1 (bit 1) - purple robe
        [0x00, 0x18, 0x42, 0x00, 0x00, 0x42, 0x66, 0x00], // Layer 2 (bit 2) - robe details
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3 (bit 3)
      ],

      // Sprite 2: Wizard legs with staff - purple robe bottom with brown staff
      // Bit combinations: 0=black, 1=white, 2=red, 3=green, 4=blue, 5=yellow, 6=magenta, 7=cyan
      [
        [0x81, 0x81, 0x00, 0x00, 0x00, 0x00, 0x81, 0x81], // Layer 0 (bit 0) - staff base (bit 0 only = white)
        [0x18, 0x18, 0x3C, 0x24, 0x24, 0x3C, 0x18, 0x18], // Layer 1 (bit 1) - purple robe (bit 1 only = red, but we want purple = red+blue)
        [0x18, 0x18, 0x3C, 0x24, 0x24, 0x3C, 0x00, 0x00], // Layer 2 (bit 2) - blue component for purple robe (bit 1+2 = red+blue = magenta/purple)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x18]  // Layer 3 (bit 3) - staff orb (bit 3 only = dark color)
      ],

      // Sprite 3: Enemy head - red skin with yellow eyes and spikes
      [
        [0x18, 0x24, 0x24, 0x18, 0x00, 0x00, 0x00, 0x00], // Layer 0 (bit 0) - eyes
        [0x3C, 0x42, 0x42, 0x42, 0x7E, 0x7E, 0x7E, 0x3C], // Layer 1 (bit 1) - red head
        [0x81, 0x99, 0x99, 0x81, 0x00, 0x00, 0x00, 0x00], // Layer 2 (bit 2) - spiky hair
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3 (bit 3)
      ],

      // Sprite 4: Enemy body - purple shirt with red arms
      [
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 0 (bit 0)
        [0x18, 0x24, 0x00, 0x00, 0x00, 0x24, 0x18, 0x00], // Layer 1 (bit 1) - red arms
        [0x00, 0x00, 0x3C, 0x7E, 0x7E, 0x00, 0x00, 0x00], // Layer 2 (bit 2) - purple shirt
        [0x00, 0x18, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00]  // Layer 3 (bit 3) - shirt details
      ],

      // Sprite 5: Enemy legs - black pants with red feet
      [
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x3C], // Layer 0 (bit 0) - red feet
        [0x18, 0x18, 0x3C, 0x24, 0x24, 0x3C, 0x00, 0x00], // Layer 1 (bit 1) - black pants
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2 (bit 2)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3 (bit 3)
      ],

      // Sprite 6: Platform block - textured stone (gray with highlights)
      [
        [0x42, 0x24, 0x81, 0x18, 0x81, 0x24, 0x42, 0x99], // Layer 0 (bit 0) - texture details
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1 (bit 1)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2 (bit 2)
        [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]  // Layer 3 (bit 3) - stone base
      ],

      // Sprite 7: Collectible coin - yellow with gray edges
      [
        [0x18, 0x3C, 0x7E, 0x7E, 0x7E, 0x7E, 0x3C, 0x18], // Layer 0 (bit 0) - yellow base (bit 0+2 = 5 = yellow)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1 (bit 1)
        [0x18, 0x3C, 0x7E, 0x7E, 0x7E, 0x7E, 0x3C, 0x18], // Layer 2 (bit 2) - yellow base (bit 0+2 = 5 = yellow)
        [0x00, 0x42, 0x81, 0x99, 0x99, 0x81, 0x42, 0x00]  // Layer 3 (bit 3) - gray edge details (bit 3 = 8 = gray)
      ],

      // Sprite 8: Energy blast projectile - cyan with white core
      [
        [0x18, 0x3C, 0x7E, 0x7E, 0x7E, 0x7E, 0x3C, 0x18], // Layer 0 (bit 0) - white core
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1 (bit 1)
        [0x00, 0x18, 0x00, 0x00, 0x00, 0x00, 0x18, 0x00], // Layer 2 (bit 2) - cyan glow
        [0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C]  // Layer 3 (bit 3) - outer glow
      ],

      // Sprite 9: Brick tile - orange/brown brick pattern
      [
        [0x00, 0xFF, 0x81, 0xFF, 0xFF, 0x81, 0xFF, 0x00], // Layer 0 (bit 0) - white mortar lines
        [0xFF, 0x00, 0x7E, 0x00, 0x00, 0x7E, 0x00, 0xFF], // Layer 1 (bit 1) - red brick base (bit 0+1 = yellow/orange)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2 (bit 2)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3 (bit 3)
      ],

      // Sprite 10: Metal tile - silver/gray metal with bolts
      [
        [0x42, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x42], // Layer 0 (bit 0) - white bolt highlights
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1 (bit 1)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2 (bit 2)
        [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]  // Layer 3 (bit 3) - gray metal base (bit 3 = 8 = gray)
      ],

      // Sprite 11: Spikes - red spikes with gray base
      [
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 0 (bit 0)
        [0x18, 0x3C, 0x7E, 0xFF, 0xFF, 0x7E, 0x3C, 0x18], // Layer 1 (bit 1) - red spikes (bit 1 = 2 = red)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2 (bit 2)
        [0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF]  // Layer 3 (bit 3) - gray base (bit 3 = 8 = gray)
      ],

      // Sprite 12: Exit portal - glowing green/cyan swirl
      [
        [0x18, 0x3C, 0x7E, 0xFF, 0xFF, 0x7E, 0x3C, 0x18], // Layer 0 (bit 0) - white core
        [0x24, 0x42, 0x81, 0x00, 0x00, 0x81, 0x42, 0x24], // Layer 1 (bit 1) - green swirl (bit 0+1 = 3 = green)
        [0x18, 0x3C, 0x66, 0x99, 0x99, 0x66, 0x3C, 0x18], // Layer 2 (bit 2) - cyan glow (bit 0+2 = 5 = yellow, bit 2 = 4 = blue)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3 (bit 3)
      ]
    ],
    palette: [
      0x000000, // 0: Black
      0xFFFFFF, // 1: White
      0xFF0000, // 2: Red
      0x00FF00, // 3: Green
      0x0000FF, // 4: Blue
      0xFFFF00, // 5: Yellow
      0xFF00FF, // 6: Magenta
      0x00FFFF, // 7: Cyan
      0x808080, // 8: Gray
      0x800000, // 9: Dark red
      0x008000, // 10: Dark green
      0x000080, // 11: Dark blue
      0x808000, // 12: Olive
      0x800080, // 13: Purple
      0x008080, // 14: Teal
      0xC0C0C0  // 15: Light gray
    ]
  };
}

// Game constants
const SCREEN_WIDTH = 128;
const SCREEN_HEIGHT = 128;
const SPRITE_SIZE = 8;
const TILE_SIZE = 8;
const TILES_X = 16;
const TILES_Y = 16;

// Character dimensions
const PLAYER_WIDTH = SPRITE_SIZE;
const PLAYER_HEIGHT = 24; // 3 sprites tall
const ENEMY_WIDTH = SPRITE_SIZE;
const ENEMY_HEIGHT = 24; // 3 sprites tall
const COIN_SIZE = SPRITE_SIZE;
const PROJECTILE_SIZE = SPRITE_SIZE;

// Physics constants (pixels per second)
const PLAYER_SPEED = 80;
const GRAVITY = 400;
const JUMP_POWER = 200;
const ENEMY_SPEED_1 = 30;
const ENEMY_SPEED_2 = 25;
const PROJECTILE_SPEED = 150;
const PROJECTILE_LIFETIME = 1.0; // seconds

// Animation timing
const PLAYER_WALK_INTERVAL = 0.2; // seconds
const ENEMY_WALK_INTERVAL = 0.3; // seconds

// Game limits
const MAX_PROJECTILES = 3;

// Scoring
const ENEMY_KILL_SCORE = 100;
const COIN_SCORE = 50;

// Starting positions
const PLAYER_START_X = 16;
const PLAYER_START_Y = 104;

// Tile IDs
const TILE_EMPTY = 0;
const TILE_PLATFORM = 6;
const TILE_BRICK = 9;
const TILE_METAL = 10;
const TILE_SPIKES = 11;
const TILE_EXIT = 12;

// Sprite IDs
const SPRITE_WIZARD_HEAD = 0;
const SPRITE_WIZARD_BODY = 1;
const SPRITE_WIZARD_LEGS = 2;
const SPRITE_ENEMY_HEAD = 3;
const SPRITE_ENEMY_BODY = 4;
const SPRITE_ENEMY_LEGS = 5;
const SPRITE_COIN = 7;
const SPRITE_PROJECTILE = 8;

let gameState;

function update(deltaTime, input) {
  // Initialize game state
  if (!gameState) {
    gameState = {
      player: {
        x: PLAYER_START_X,
        y: PLAYER_START_Y,
        vx: 0,
        vy: 0,
        onGround: true,
        walkFrame: 0,
        walkTimer: 0,
        facing: 1 // 1 = right, -1 = left
      },
      enemies: [
        { x: 48, y: 72, vx: -ENEMY_SPEED_1, health: 2, walkFrame: 0, walkTimer: 0 }, // On stone platform (row 9)
        { x: 96, y: 64, vx: ENEMY_SPEED_2, health: 2, walkFrame: 0, walkTimer: 0 }   // On stone platform (row 8)
      ],
      tilemap: [
        // 16 rows x 16 columns (128x128 screen) - 0=empty, 6=platform, 9=brick, 10=metal, 11=spikes, 12=exit
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,12], // Row 0: Exit at top right
        [0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,6],   // Row 1: Platform to exit
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 2
        [0,0,0,0,0,0,0,0,0,9,9,9,0,0,0,0],   // Row 3: Brick platform
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 4
        [0,0,0,0,9,9,0,0,0,0,0,0,0,0,0,0],   // Row 5: Brick platform
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 6
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 7
        [0,0,0,0,0,0,0,0,0,0,0,6,6,6,0,0],   // Row 8: Stone platform
        [0,0,0,6,6,6,0,0,0,0,0,0,0,0,0,0],   // Row 9: Stone platform
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 10
        [0,0,0,0,0,0,0,0,11,11,11,0,0,0,0,0], // Row 11: Spikes
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 12
        [0,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 13: Starting platform
        [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],   // Row 14: Ground
        [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6]    // Row 15: Ground
      ],
      coins: [
        { x: 48, y: 64, collected: false },   // Above stone platform (row 9)
        { x: 32, y: 32, collected: false },   // Above brick platform (row 5)
        { x: 96, y: 56, collected: false },   // Above stone platform (row 8)
        { x: 80, y: 16, collected: false },   // Above brick platform (row 3)
        { x: 112, y: 8, collected: false }    // Near exit
      ],
      projectiles: [],
      gravity: GRAVITY,
      jumpPower: JUMP_POWER,
      playerSpeed: PLAYER_SPEED,
      score: 0,
      gameOver: false,
      levelComplete: false
    };
  }

  const dt = deltaTime; // Use deltaTime directly

  // Check for game over or level complete
  if (gameState.gameOver || gameState.levelComplete) {
    // Stop game logic, just render current state
    const tiles = [];
    const sprites = [];

    // Render tilemap
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const tileId = gameState.tilemap[y][x];
        if (tileId !== 0) {
          tiles.push({
            x: x,
            y: y,
            tileId: tileId
          });
        }
      }
    }

    return {
      tiles,
      sprites,
      score: gameState.score,
      gameOver: gameState.gameOver,
      levelComplete: gameState.levelComplete
    };
  }

  // Player input handling with deltaTime
  if (input.left) {
    gameState.player.vx = -gameState.playerSpeed;
    gameState.player.facing = -1;
  } else if (input.right) {
    gameState.player.vx = gameState.playerSpeed;
    gameState.player.facing = 1;
  } else {
    gameState.player.vx = 0;
  }

  // Jump (using up arrow or B button)
  if ((input.up || input.b) && gameState.player.onGround) {
    gameState.player.vy = -gameState.jumpPower;
    gameState.player.onGround = false;
  }

  // Attack (using A button)
  if (input.a && gameState.projectiles.length < MAX_PROJECTILES) {
    gameState.projectiles.push({
      x: gameState.player.x + (gameState.player.facing > 0 ? SPRITE_SIZE : -SPRITE_SIZE),
      y: gameState.player.y + 4,
      vx: gameState.player.facing * PROJECTILE_SPEED,
      life: PROJECTILE_LIFETIME
    });
  }

  // Apply gravity to player
  if (!gameState.player.onGround) {
    gameState.player.vy += gameState.gravity * dt;
  }

  // Update player position with deltaTime
  gameState.player.x += gameState.player.vx * dt;
  gameState.player.y += gameState.player.vy * dt;

  // No camera in single screen mode

  // Player walking animation
  if (Math.abs(gameState.player.vx) > 0) {
    gameState.player.walkTimer += dt;
    if (gameState.player.walkTimer > PLAYER_WALK_INTERVAL) {
      gameState.player.walkFrame = 1 - gameState.player.walkFrame;
      gameState.player.walkTimer = 0;
    }
  } else {
    gameState.player.walkFrame = 0;
  }

  // Platform collision for player using tilemap
  gameState.player.onGround = false;

  // Check tiles under player's feet (bottom edge)
  const playerBottom = gameState.player.y + PLAYER_HEIGHT;
  const playerLeft = gameState.player.x;
  const playerRight = gameState.player.x + PLAYER_WIDTH;

  // Convert to tile coordinates
  const tileY = Math.floor(playerBottom / TILE_SIZE);
  const leftTileX = Math.floor(playerLeft / TILE_SIZE);
  const rightTileX = Math.floor(playerRight / TILE_SIZE);

  // Check if falling onto a platform
  if (gameState.player.vy > 0 && tileY < TILES_Y) {
    for (let tileX = leftTileX; tileX <= rightTileX; tileX++) {
      if (tileX >= 0 && tileX < TILES_X && gameState.tilemap[tileY] && gameState.tilemap[tileY][tileX] !== TILE_EMPTY) {
        const tileId = gameState.tilemap[tileY][tileX];

        // Check for spikes
        if (tileId === TILE_SPIKES) {
          gameState.gameOver = true;
          return;
        }

        // Check for exit
        if (tileId === TILE_EXIT) {
          gameState.levelComplete = true;
          return;
        }

        // Land on solid platform
        if (tileId === TILE_PLATFORM || tileId === TILE_BRICK || tileId === TILE_METAL) {
          gameState.player.y = tileY * TILE_SIZE - PLAYER_HEIGHT;
          gameState.player.vy = 0;
          gameState.player.onGround = true;
          break;
        }
      }
    }
  }

  // Check for spikes or exit while standing/moving
  const playerCenterX = gameState.player.x + PLAYER_WIDTH / 2;
  const playerCenterY = gameState.player.y + PLAYER_HEIGHT / 2;
  const centerTileX = Math.floor(playerCenterX / TILE_SIZE);
  const centerTileY = Math.floor(playerCenterY / TILE_SIZE);

  if (centerTileX >= 0 && centerTileX < TILES_X && centerTileY >= 0 && centerTileY < TILES_Y) {
    const tileId = gameState.tilemap[centerTileY][centerTileX];
    if (tileId === TILE_SPIKES) {
      gameState.gameOver = true;
      return;
    }
    if (tileId === TILE_EXIT) {
      gameState.levelComplete = true;
      return;
    }
  }

  // Keep player in bounds
  if (gameState.player.x < 0) gameState.player.x = 0;
  if (gameState.player.x > SCREEN_WIDTH - PLAYER_WIDTH) gameState.player.x = SCREEN_WIDTH - PLAYER_WIDTH;
  if (gameState.player.y > SCREEN_HEIGHT) {
    gameState.player.y = PLAYER_START_Y;
    gameState.player.x = PLAYER_START_X;
    gameState.player.vy = 0;
  }

  // Update enemies with deltaTime
  for (const enemy of gameState.enemies) {
    if (enemy.health <= 0) continue;

    enemy.x += enemy.vx * dt;

    // Enemy walking animation
    enemy.walkTimer += dt;
    if (enemy.walkTimer > ENEMY_WALK_INTERVAL) {
      enemy.walkFrame = 1 - enemy.walkFrame;
      enemy.walkTimer = 0;
    }

    // Enemy AI: reverse direction at edges using tilemap
    let hitWall = false;
    const enemyBottom = enemy.y + ENEMY_HEIGHT;
    const enemyTileY = Math.floor(enemyBottom / TILE_SIZE);

    // Check if enemy is at edge of platform
    const nextX = enemy.x + (enemy.vx > 0 ? ENEMY_WIDTH : -ENEMY_WIDTH);
    const nextTileX = Math.floor(nextX / TILE_SIZE);

    // Reverse if at world edge or no platform ahead
    if (nextX <= 0 || nextX >= SCREEN_WIDTH - ENEMY_WIDTH ||
        nextTileX < 0 || nextTileX >= TILES_X ||
        !gameState.tilemap[enemyTileY] ||
        gameState.tilemap[enemyTileY][nextTileX] === TILE_EMPTY) {
      enemy.vx *= -1;
    }
  }

  // Update projectiles with deltaTime
  gameState.projectiles = gameState.projectiles.filter(proj => {
    proj.x += proj.vx * dt;
    proj.life -= dt;

    // Remove if out of bounds or expired
    if (proj.x < 0 || proj.x > SCREEN_WIDTH || proj.life <= 0) return false;

    // Check collision with enemies
    for (const enemy of gameState.enemies) {
      if (enemy.health > 0 &&
          proj.x + PROJECTILE_SIZE > enemy.x && proj.x < enemy.x + ENEMY_WIDTH &&
          proj.y + PROJECTILE_SIZE > enemy.y && proj.y < enemy.y + ENEMY_HEIGHT) {
        enemy.health--;
        if (enemy.health <= 0) gameState.score += ENEMY_KILL_SCORE;
        return false;
      }
    }

    return true;
  });

  // Coin collection
  for (const coin of gameState.coins) {
    if (!coin.collected &&
        gameState.player.x + PLAYER_WIDTH > coin.x && gameState.player.x < coin.x + COIN_SIZE &&
        gameState.player.y + PLAYER_HEIGHT > coin.y && gameState.player.y < coin.y + COIN_SIZE) {
      coin.collected = true;
      gameState.score += COIN_SCORE;
    }
  }

  // Build render commands (new grouped format)
  const tiles = [];
  const sprites = [];

  // Render tilemap
  for (let y = 0; y < TILES_Y; y++) {
    for (let x = 0; x < TILES_X; x++) {
      const tileId = gameState.tilemap[y][x];
      if (tileId !== TILE_EMPTY) {
        tiles.push({
          x: x,
          y: y,
          tileId: tileId
        });
      }
    }
  }

  // Render coins
  for (const coin of gameState.coins) {
    if (!coin.collected) {
      sprites.push({
        spriteId: SPRITE_COIN,
        x: coin.x,
        y: coin.y
      });
    }
  }

  // Render wizard (multi-sprite character)
  sprites.push({
    spriteId: SPRITE_WIZARD_HEAD,
    x: gameState.player.x,
    y: gameState.player.y
  });
  sprites.push({
    spriteId: SPRITE_WIZARD_BODY,
    x: gameState.player.x,
    y: gameState.player.y + SPRITE_SIZE
  });
  sprites.push({
    spriteId: SPRITE_WIZARD_LEGS,
    x: gameState.player.x,
    y: gameState.player.y + SPRITE_SIZE * 2
  });

  // Render enemies (multi-sprite)
  for (const enemy of gameState.enemies) {
    if (enemy.health > 0) {
      sprites.push({
        spriteId: SPRITE_ENEMY_HEAD,
        x: enemy.x,
        y: enemy.y
      });
      sprites.push({
        spriteId: SPRITE_ENEMY_BODY,
        x: enemy.x,
        y: enemy.y + SPRITE_SIZE
      });
      sprites.push({
        spriteId: SPRITE_ENEMY_LEGS,
        x: enemy.x,
        y: enemy.y + SPRITE_SIZE * 2
      });
    }
  }

  // Render projectiles
  for (const proj of gameState.projectiles) {
    sprites.push({
      spriteId: SPRITE_PROJECTILE,
      x: proj.x,
      y: proj.y
    });
  }

  return {
    tiles,
    sprites,
    score: gameState.score,
    gameOver: gameState.gameOver || gameState.levelComplete
  };
}