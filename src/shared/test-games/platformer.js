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
      [
        "00600600",
        "00600600",
        "01564510",
        "13444031",
        "01111110",
        "01111110",
        "13444031",
        "01511150"
      ],
      [
        "00100100",
        "10144014",
        "06266620",
        "01100110",
        "01100110",
        "10144014",
        "01011010",
        "00000000"
      ],
      [
        "10600601",
        "10600601",
        "06666660",
        "06266620",
        "06266620",
        "06666660",
        "00100100",
        "10111018"
      ],
      [
        "00511500",
        "17677670",
        "17677670",
        "01255120",
        "00222200",
        "00222200",
        "00222200",
        "00333300"
      ],
      [
        "00000000",
        "00211200",
        "00666600",
        "00aaaaa0",
        "00aaaaa0",
        "00200200",
        "00100100",
        "00000000"
      ],
      [
        "00100100",
        "00100100",
        "00333300",
        "00262600",
        "00262600",
        "00333300",
        "01000010",
        "01000010"
      ],
      [
        "91018109",
        "12000021",
        "81000018",
        "01000010",
        "81000018",
        "12000021",
        "91018109",
        "99999999"
      ],
      [
        "00ddddd0",
        "0fffffff",
        "ffffffff",
        "ffffffff",
        "ffffffff",
        "ffffffff",
        "0fffffff",
        "00ddddd0"
      ],
      [
        "00133100",
        "00333300",
        "01111110",
        "11111111",
        "11111111",
        "01111110",
        "00333300",
        "00100100"
      ],
      [
        "01333310",
        "13111131",
        "31222213",
        "12111121",
        "12111121",
        "31222213",
        "13111131",
        "01333310"
      ],
      [
        "10000001",
        "88888888",
        "88888888",
        "88888888",
        "88888888",
        "88888888",
        "88888888",
        "10000001"
      ],
      [
        "00000000",
        "00122100",
        "01222210",
        "12222221",
        "88888888",
        "88888888",
        "88888888",
        "88888888"
      ],
      [
        "00133100",
        "01377310",
        "13999931",
        "39111193",
        "39111193",
        "13999931",
        "01377310",
        "00133100"
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
const PLAYER_HEIGHT = 16; // 2 sprites tall
const ENEMY_WIDTH = SPRITE_SIZE;
const ENEMY_HEIGHT = 16; // 2 sprites tall
const COIN_SIZE = SPRITE_SIZE;
const PROJECTILE_SIZE = SPRITE_SIZE;

// Physics constants (pixels per second)
const PLAYER_SPEED = 80;
const GRAVITY = 400;
const JUMP_POWER = 120; // Reduced from 200 to prevent jumping over obstacles
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
const PLAYER_START_Y = 88; // Standing on platform at row 13 (104 - 16 = 88)

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
        { x: 48, y: 56, vx: -ENEMY_SPEED_1, health: 2, walkFrame: 0, walkTimer: 0 }, // Standing on stone platform (row 9: 72-16=56)
        { x: 96, y: 48, vx: ENEMY_SPEED_2, health: 2, walkFrame: 0, walkTimer: 0 }   // Standing on stone platform (row 8: 64-16=48)
      ],
      tilemap: [
        // 16 rows x 16 columns (128x128 screen) - 0=empty, 6=platform, 9=brick, 10=metal, 11=spikes, 12=exit
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12], // Row 0: Exit at top right
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
        { x: 48, y: 56, collected: false },   // Above stone platform (row 9: platform at 72, coin at 56)
        { x: 32, y: 32, collected: false },   // Above brick platform (row 5: platform at 40, coin at 32)
        { x: 96, y: 56, collected: false },   // Above stone platform (row 8: platform at 64, coin at 56)
        { x: 80, y: 16, collected: false },   // Above brick platform (row 3: platform at 24, coin at 16)
        { x: 112, y: 0, collected: false }    // Near exit (floating above platform)
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

    // Render player and enemies even when game over (frozen state)
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

    // Render enemies
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
  if (input.aPressed && gameState.projectiles.length < MAX_PROJECTILES) {
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

  // Helper function to check if a tile is solid
  function isSolidTile(tileId) {
    return tileId === TILE_PLATFORM || tileId === TILE_BRICK || tileId === TILE_METAL;
  }

  // Helper function to get tile at position
  function getTileAt(x, y) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    if (tileX >= 0 && tileX < TILES_X && tileY >= 0 && tileY < TILES_Y) {
      return gameState.tilemap[tileY][tileX];
    }
    return TILE_EMPTY;
  }

  // Horizontal collision detection
  if (Math.abs(gameState.player.vx) > 0) {
    const newX = gameState.player.x + gameState.player.vx * dt;
    const playerTop = gameState.player.y;
    const playerBottom = gameState.player.y + PLAYER_HEIGHT - 1;

    // Check left and right edges for solid tiles
    let canMoveHorizontally = true;
    if (gameState.player.vx < 0) { // Moving left
      const leftEdge = newX;
      // Check multiple points along the left edge
      for (let y = playerTop; y <= playerBottom; y += 2) {
        const tileId = getTileAt(leftEdge, y);
        if (isSolidTile(tileId)) {
          canMoveHorizontally = false;
          // Snap to the right edge of the tile
          const tileX = Math.floor(leftEdge / TILE_SIZE);
          gameState.player.x = (tileX + 1) * TILE_SIZE;
          break;
        }
      }
    } else if (gameState.player.vx > 0) { // Moving right
      const rightEdge = newX + PLAYER_WIDTH - 1;
      // Check multiple points along the right edge
      for (let y = playerTop; y <= playerBottom; y += 2) {
        const tileId = getTileAt(rightEdge, y);
        if (isSolidTile(tileId)) {
          canMoveHorizontally = false;
          // Snap to the left edge of the tile
          const tileX = Math.floor(rightEdge / TILE_SIZE);
          gameState.player.x = tileX * TILE_SIZE - PLAYER_WIDTH;
          break;
        }
      }
    }

    // Apply horizontal movement if allowed
    if (canMoveHorizontally) {
      gameState.player.x = newX;
    }
  }

  // Vertical collision detection
  gameState.player.onGround = false;

  // Check if currently standing on ground
  const currentBottomEdge = gameState.player.y + PLAYER_HEIGHT;
  const playerLeft = gameState.player.x;
  const playerRight = gameState.player.x + PLAYER_WIDTH - 1;

  for (let x = playerLeft; x <= playerRight; x += 4) {
    const tileId = getTileAt(x, currentBottomEdge);
    if (isSolidTile(tileId)) {
      gameState.player.onGround = true;
      break;
    }
  }

  // Apply vertical movement
  const newY = gameState.player.y + gameState.player.vy * dt;

  if (gameState.player.vy > 0) { // Falling down
    const bottomEdge = newY + PLAYER_HEIGHT;
    let hitPlatform = false;

    for (let x = playerLeft; x <= playerRight; x += 4) {
      const tileId = getTileAt(x, bottomEdge);

      // Check for deadly tiles
      if (tileId === TILE_SPIKES) {
        gameState.gameOver = true;
        return;
      }

      // Check for exit
      if (tileId === TILE_EXIT) {
        gameState.levelComplete = true;
        return;
      }

      // Check for solid platforms
      if (isSolidTile(tileId)) {
        const tileY = Math.floor(bottomEdge / TILE_SIZE);
        gameState.player.y = tileY * TILE_SIZE - PLAYER_HEIGHT;
        gameState.player.vy = 0;
        gameState.player.onGround = true;
        hitPlatform = true;
        break;
      }
    }

    if (!hitPlatform) {
      gameState.player.y = newY;
    }
  } else if (gameState.player.vy < 0) { // Jumping up
    const topEdge = newY;
    let hitCeiling = false;

    for (let x = playerLeft; x <= playerRight; x += 4) {
      const tileId = getTileAt(x, topEdge);
      if (isSolidTile(tileId)) {
        gameState.player.vy = 0;
        const tileY = Math.floor(topEdge / TILE_SIZE);
        gameState.player.y = (tileY + 1) * TILE_SIZE;
        hitCeiling = true;
        break;
      }
    }

    if (!hitCeiling) {
      gameState.player.y = newY;
    }
  } else {
    // No vertical velocity, but apply tiny movement for gravity
    gameState.player.y = newY;
  }

  // Check for any overlapping deadly tiles (spikes) - using current position
  const playerTop = gameState.player.y;
  const playerBottom = gameState.player.y + PLAYER_HEIGHT - 1;

  for (let x = playerLeft; x <= playerRight; x += 4) {
    for (let y = playerTop; y <= playerBottom; y += 4) {
      const tileId = getTileAt(x, y);
      if (tileId === TILE_SPIKES) {
        gameState.gameOver = true;
        return;
      }
      if (tileId === TILE_EXIT) {
        gameState.levelComplete = true;
        return;
      }
    }
  }

  // Check for enemy collision (instakill)
  for (const enemy of gameState.enemies) {
    if (enemy.health > 0 &&
        gameState.player.x + PLAYER_WIDTH > enemy.x &&
        gameState.player.x < enemy.x + ENEMY_WIDTH &&
        gameState.player.y + PLAYER_HEIGHT > enemy.y &&
        gameState.player.y < enemy.y + ENEMY_HEIGHT) {
      gameState.gameOver = true;
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

  // Render wizard (2-sprite character)
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

  // Render enemies (2-sprite characters)
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
    score: gameState.gameOver ? 0 : gameState.score,
    gameOver: gameState.gameOver || gameState.levelComplete
  };
}