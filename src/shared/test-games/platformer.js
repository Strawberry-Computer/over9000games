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
      // Sprite 0: Player - blue (palette index 4)
      [
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 0 (bit 0)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1 (bit 1)
        [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], // Layer 2 (bit 2) = 4 (blue)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3 (bit 3)
      ],

      // Sprite 1: Enemy - red (palette index 2)
      [
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 0
        [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], // Layer 1 (bit 1) = 2 (red)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 2
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // Layer 3
      ],

      // Sprite 2: Enemy body - red
      [
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x18, 0x3C, 0x7E, 0x7E, 0x3C, 0x18, 0x00], // Red shape
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
      ],

      // Sprite 3: Enemy legs - red
      [
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x18, 0x18, 0x18, 0x18, 0x00, 0x00], // Red legs
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
      ],

      // Sprite 4: Platform block - gray (palette index 8)
      [
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0xFF, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0xFF]  // Layer 3 (bit 3) = 8 (gray)
      ],

      // Sprite 5: Collectible coin - yellow (palette index 5)
      [
        [0x3C, 0x7E, 0xFF, 0xFF, 0xFF, 0xFF, 0x7E, 0x3C], // Layer 0 (bit 0)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Layer 1
        [0x3C, 0x7E, 0xFF, 0xFF, 0xFF, 0xFF, 0x7E, 0x3C], // Layer 2 (bit 2)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]  // 1+4=5 (yellow)
      ],

      // Sprite 6: Attack projectile - white (palette index 1)
      [
        [0x18, 0x3C, 0x7E, 0x7E, 0x7E, 0x7E, 0x3C, 0x18], // Layer 0 (bit 0) = 1 (white)
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
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

let gameState;

function update(deltaTime, input) {
  // Initialize game state
  if (!gameState) {
    gameState = {
      player: {
        x: 50,
        y: 224, // On ground platform (240 - 16 = 224)
        vx: 0,
        vy: 0,
        onGround: true,
        walkFrame: 0,
        walkTimer: 0,
        facing: 1 // 1 = right, -1 = left
      },
      enemies: [
        { x: 150, y: 200, vx: -30, health: 2, walkFrame: 0, walkTimer: 0 },
        { x: 200, y: 120, vx: 25, health: 2, walkFrame: 0, walkTimer: 0 }
      ],
      platforms: [
        { x: 0, y: 240, width: 256, height: 16 },    // Ground
        { x: 100, y: 180, width: 80, height: 8 },     // Platform 1
        { x: 150, y: 140, width: 64, height: 8 },     // Platform 2
        { x: 80, y: 100, width: 96, height: 8 }       // Platform 3
      ],
      coins: [
        { x: 120, y: 160, collected: false },
        { x: 170, y: 120, collected: false },
        { x: 110, y: 80, collected: false }
      ],
      projectiles: [],
      gravity: 400,
      jumpPower: 200,
      playerSpeed: 80,
      score: 0
    };
  }

  const dt = deltaTime; // Use deltaTime directly

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
  if (input.a && gameState.projectiles.length < 3) {
    gameState.projectiles.push({
      x: gameState.player.x + (gameState.player.facing > 0 ? 8 : -8),
      y: gameState.player.y + 4,
      vx: gameState.player.facing * 150,
      life: 1.0
    });
  }

  // Apply gravity to player
  if (!gameState.player.onGround) {
    gameState.player.vy += gameState.gravity * dt;
  }

  // Update player position with deltaTime
  gameState.player.x += gameState.player.vx * dt;
  gameState.player.y += gameState.player.vy * dt;

  // Player walking animation
  if (Math.abs(gameState.player.vx) > 0) {
    gameState.player.walkTimer += dt;
    if (gameState.player.walkTimer > 0.2) {
      gameState.player.walkFrame = 1 - gameState.player.walkFrame;
      gameState.player.walkTimer = 0;
    }
  } else {
    gameState.player.walkFrame = 0;
  }

  // Platform collision for player
  gameState.player.onGround = false;
  for (const platform of gameState.platforms) {
    if (gameState.player.x + 8 > platform.x &&
        gameState.player.x < platform.x + platform.width &&
        gameState.player.y + 16 > platform.y &&
        gameState.player.y + 16 < platform.y + platform.height + 8) {

      if (gameState.player.vy > 0) { // Falling
        gameState.player.y = platform.y - 16;
        gameState.player.vy = 0;
        gameState.player.onGround = true;
      }
    }
  }

  // Keep player in bounds
  if (gameState.player.x < 0) gameState.player.x = 0;
  if (gameState.player.x > 248) gameState.player.x = 248;
  if (gameState.player.y > 256) {
    gameState.player.y = 200;
    gameState.player.x = 50;
    gameState.player.vy = 0;
  }

  // Update enemies with deltaTime
  for (const enemy of gameState.enemies) {
    if (enemy.health <= 0) continue;

    enemy.x += enemy.vx * dt;

    // Enemy walking animation
    enemy.walkTimer += dt;
    if (enemy.walkTimer > 0.3) {
      enemy.walkFrame = 1 - enemy.walkFrame;
      enemy.walkTimer = 0;
    }

    // Enemy AI: reverse direction at edges or walls
    let hitWall = false;
    for (const platform of gameState.platforms) {
      if (enemy.x <= platform.x || enemy.x >= platform.x + platform.width - 8) {
        if (enemy.y + 16 >= platform.y && enemy.y + 16 < platform.y + platform.height + 8) {
          hitWall = true;
          break;
        }
      }
    }

    if (hitWall || enemy.x <= 0 || enemy.x >= 248) {
      enemy.vx *= -1;
    }
  }

  // Update projectiles with deltaTime
  gameState.projectiles = gameState.projectiles.filter(proj => {
    proj.x += proj.vx * dt;
    proj.life -= dt;

    // Remove if out of bounds or expired
    if (proj.x < 0 || proj.x > 256 || proj.life <= 0) return false;

    // Check collision with enemies
    for (const enemy of gameState.enemies) {
      if (enemy.health > 0 &&
          proj.x + 4 > enemy.x && proj.x < enemy.x + 8 &&
          proj.y + 4 > enemy.y && proj.y < enemy.y + 16) {
        enemy.health--;
        if (enemy.health <= 0) gameState.score += 100;
        return false;
      }
    }

    return true;
  });

  // Coin collection
  for (const coin of gameState.coins) {
    if (!coin.collected &&
        gameState.player.x + 8 > coin.x && gameState.player.x < coin.x + 8 &&
        gameState.player.y + 16 > coin.y && gameState.player.y < coin.y + 8) {
      coin.collected = true;
      gameState.score += 50;
    }
  }

  // Build render commands (new grouped format)
  const tiles = [];
  const sprites = [];

  // Render platforms as tiles
  for (const platform of gameState.platforms) {
    for (let x = 0; x < platform.width; x += 8) {
      const tileX = Math.floor((platform.x + x) / 8);
      const tileY = Math.floor(platform.y / 8);
      tiles.push({
        x: tileX,
        y: tileY,
        tileId: 4 // Platform sprite used as tile (gray)
      });
    }
  }

  // Render coins
  for (const coin of gameState.coins) {
    if (!coin.collected) {
      sprites.push({
        spriteId: 5, // Yellow coin
        x: coin.x,
        y: coin.y
      });
    }
  }

  // Render player (blue sprite)
  sprites.push({
    spriteId: 0, // Blue player
    x: gameState.player.x,
    y: gameState.player.y
  });

  // Render enemies (multi-sprite)
  for (const enemy of gameState.enemies) {
    if (enemy.health > 0) {
      sprites.push({
        spriteId: 1, // Enemy head (red)
        x: enemy.x,
        y: enemy.y
      });
      sprites.push({
        spriteId: 2, // Enemy body (red)
        x: enemy.x,
        y: enemy.y + 8
      });
      sprites.push({
        spriteId: 3, // Enemy legs (red)
        x: enemy.x,
        y: enemy.y + 16
      });
    }
  }

  // Render projectiles
  for (const proj of gameState.projectiles) {
    sprites.push({
      spriteId: 6, // White projectile
      x: proj.x,
      y: proj.y
    });
  }

  return {
    tiles,
    sprites,
    score: gameState.score
  };
}