function metadata() {
  return {
    title: "Tomb Explorer",
    description: "Explore ancient ruins and collect treasure - use arrow keys to move and spacebar to jump",
    controls: [
      {key: "left/right arrows", action: "move explorer"},
      {key: "up arrow or B", action: "jump"},
      {key: "A button", action: "throw torch"}
    ]
  };
}

function resources() {
  return {
    sprites: [
      // NOTE: Sprite slots 2 and 5 are AVAILABLE for new sprites
      // Sprite 0: Explorer head - brown hat brim, tan face, clear features
      [
        "09999990",
        "9dd99dd9",
        "dd0dd0dd",
        "dd0dd0dd",
        "0ddddddd",
        "00d22d00",
        "00d99d00",
        "000dd000"
      ],
      // Sprite 1: Explorer body - tan shirt with brown vest and belt
      [
        "00d99d00",
        "0d9dd9d0",
        "d99dd99d",
        "d9dddd9d",
        "0d9009d0",
        "0dd00dd0",
        "0dd00dd0",
        "09d00d90"
      ],
      // Sprite 2: Heart - red health indicator
      [
        "00000000",
        "02200220",
        "22222222",
        "22222222",
        "02222220",
        "00222200",
        "00022000",
        "00000000"
      ],
      // Sprite 3: Scorpion front - claws and head connecting to body
      [
        "90000000",
        "99000000",
        "09900088",
        "00998888",
        "00988888",
        "09900088",
        "99000000",
        "90000000"
      ],
      // Sprite 4: Scorpion back - body segments with tail curving upward
      [
        "00000009",
        "00000990",
        "88889800",
        "88888000",
        "88888000",
        "88889000",
        "88899000",
        "88900000"
      ],
      // Sprite 5: Bat - wings spread, flying enemy
      [
        "00000000",
        "90000009",
        "99800899",
        "09988990",
        "00988900",
        "00088000",
        "00000000",
        "00000000"
      ],
      // Sprite 6: Weathered stone platform with cracks and shadows
      [
        "88017708",
        "80777781",
        "17888871",
        "78811887",
        "78811887",
        "17888871",
        "80777781",
        "88888888"
      ],
      // Sprite 7: Bright golden coin like Mario - shiny yellow with white highlights
      [
        "00555500",
        "05511550",
        "51111115",
        "51111115",
        "51111115",
        "51111115",
        "05511550",
        "00555500"
      ],
      // Sprite 8: Flaming torch projectile with orange/red fire
      [
        "00055000",
        "00e5e500",
        "0e5e5e50",
        "0e52225e",
        "0e52225e",
        "0e5555e0",
        "00e55e00",
        "0005e000"
      ],
      // Sprite 9: Weathered sandstone brick with dark mortar and cracks
      [
        "0cddddc0",
        "ddd99ddd",
        "dd9889dd",
        "0cddddc0",
        "dddd9ddd",
        "dd9889dd",
        "ddd99ddd",
        "0cddddc0"
      ],
      // Sprite 10: Rusty metal platform with rivets and corrosion
      [
        "08888880",
        "87771778",
        "77999977",
        "71999917",
        "71999917",
        "77999977",
        "87771778",
        "08888880"
      ],
      // Sprite 11: Rusty metal spikes with dark shadows
      [
        "00000000",
        "00088000",
        "00899800",
        "08999980",
        "89988998",
        "88888888",
        "88888888",
        "88888888"
      ],
      // Sprite 12: Ancient wooden exit door with metal bands
      [
        "00999900",
        "09d88d90",
        "9d8dd8d9",
        "d8dddd8d",
        "d8dddd8d",
        "9d8dd8d9",
        "09d88d90",
        "00999900"
      ]
    ],
    palette: [
      0x000000, // 0: Black
      0xFFFFFF, // 1: Pure white (for coin highlights)
      0xCC3300, // 2: Brick red
      0x556B2F, // 3: Olive drab (unused but kept)
      0x4A4A4A, // 4: Dark gray (unused but kept)
      0xFFD700, // 5: Bright gold (Mario-style coin)
      0x5C8A8A, // 6: Muted teal (unused but kept)
      0x6B6B6B, // 7: Medium gray
      0x4A4A4A, // 8: Dark gray/shadow
      0x8B4513, // 9: Saddle brown
      0x2F4F2F, // a: Dark olive (unused but kept)
      0xDEB887, // b: Burlywood/light tan
      0x696969, // c: Dim gray
      0xD2B48C, // d: Tan
      0xCD853F, // e: Peru/bronze
      0xF5DEB3  // f: Wheat (unused but kept)
    ]
  };
}

// Game constants
const SCREEN_WIDTH = 128;
const SCREEN_HEIGHT = 128;
const WORLD_WIDTH = 512;  // 64 tiles wide for scrolling
const SPRITE_SIZE = 8;
const TILE_SIZE = 8;
const TILES_X = 64;  // Expanded for scrolling
const TILES_Y = 16;

// Character dimensions
const PLAYER_WIDTH = SPRITE_SIZE;
const PLAYER_HEIGHT = 16; // 2 sprites tall
const SCORPION_WIDTH = 16; // 2 sprites wide
const SCORPION_HEIGHT = SPRITE_SIZE;
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

// Camera dead zone (horizontal range where player can move without camera following)
const CAMERA_DEAD_ZONE_LEFT = 40;  // Pixels from left edge of screen before camera moves left
const CAMERA_DEAD_ZONE_RIGHT = 40; // Pixels from right edge of screen before camera moves right

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
const SPRITE_EXPLORER_HEAD = 0;
const SPRITE_EXPLORER_BODY = 1;
const SPRITE_HEART = 2;
const SPRITE_SCORPION_FRONT = 3;
const SPRITE_SCORPION_BACK = 4;
const SPRITE_BAT = 5;
const SPRITE_TREASURE = 7;
const SPRITE_TORCH = 8;

// Background music - NES style two-channel adventure theme
const MUSIC = {
  bass: [ // Triangle channel - walking bass line with chord progression
    {note: 'C2', duration: 0.4}, {note: 'C2', duration: 0.4}, {note: 'E2', duration: 0.4},
    {note: 'G2', duration: 0.4}, {note: 'G2', duration: 0.4}, {note: 'B2', duration: 0.4},
    {note: 'A2', duration: 0.4}, {note: 'A2', duration: 0.4}, {note: 'C3', duration: 0.4},
    {note: 'F2', duration: 0.4}, {note: 'F2', duration: 0.4}, {note: 'A2', duration: 0.4},
    {note: 'E2', duration: 0.4}, {note: 'E2', duration: 0.4}, {note: 'G2', duration: 0.4},
    {note: 'D2', duration: 0.4}, {note: 'D2', duration: 0.4}, {note: 'F2', duration: 0.4},
    {note: 'C2', duration: 0.4}, {note: 'C2', duration: 0.4}, {note: 'E2', duration: 0.4},
    {note: 'G2', duration: 0.6}, {note: 'F2', duration: 0.6}, {note: 'E2', duration: 0.6}
  ],
  melody: [ // Pulse channel - epic adventure melody with variation
    // Phrase 1: Opening motif
    {note: 'E4', duration: 0.2}, {note: 'E4', duration: 0.2}, {note: 'E4', duration: 0.4},
    {note: 'G4', duration: 0.2}, {note: 'E4', duration: 0.2}, {note: 'C4', duration: 0.4},
    {note: 'E4', duration: 0.2}, {note: 'G4', duration: 0.2}, {note: 'C5', duration: 0.6},

    // Phrase 2: Development
    {note: 'B4', duration: 0.2}, {note: 'B4', duration: 0.2}, {note: 'B4', duration: 0.4},
    {note: 'A4', duration: 0.2}, {note: 'G4', duration: 0.2}, {note: 'E4', duration: 0.4},
    {note: 'G4', duration: 0.2}, {note: 'A4', duration: 0.2}, {note: 'B4', duration: 0.6},

    // Phrase 3: Climax
    {note: 'C5', duration: 0.2}, {note: 'D5', duration: 0.2}, {note: 'E5', duration: 0.4},
    {note: 'D5', duration: 0.2}, {note: 'C5', duration: 0.2}, {note: 'B4', duration: 0.4},
    {note: 'A4', duration: 0.2}, {note: 'B4', duration: 0.2}, {note: 'C5', duration: 0.6},

    // Phrase 4: Resolution
    {note: 'G4', duration: 0.2}, {note: 'E4', duration: 0.2}, {note: 'D4', duration: 0.4},
    {note: 'E4', duration: 0.2}, {note: 'F4', duration: 0.2}, {note: 'G4', duration: 0.4},
    {note: 'E4', duration: 0.4}, {note: 'C4', duration: 0.8}
  ]
};

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
        facing: 1, // 1 = right, -1 = left
        health: 3, // Start with 3 hearts
        invincible: false,
        invincibleTimer: 0
      },
      enemies: [
        { x: 32, y: 56, vx: -ENEMY_SPEED_1, vy: 0, onGround: false, health: 1, type: 'scorpion', walkFrame: 0, walkTimer: 0 },   // Scorpion on row 9 platform
        { x: 160, y: 96, vx: ENEMY_SPEED_2, vy: 0, onGround: false, health: 1, type: 'scorpion', walkFrame: 0, walkTimer: 0 },   // Scorpion on ground
        { x: 216, y: 56, vx: -ENEMY_SPEED_1, vy: 0, onGround: false, health: 1, type: 'scorpion', walkFrame: 0, walkTimer: 0 },  // Scorpion on row 9 platform
        { x: 368, y: 56, vx: ENEMY_SPEED_2, vy: 0, onGround: false, health: 1, type: 'scorpion', walkFrame: 0, walkTimer: 0 }    // Scorpion on row 9 platform
      ],
      bats: [
        { x: 120, y: 40, vx: -30, vy: 0, health: 1, pattern: 'sine', phase: 0 },  // Flying bat with sine wave pattern
        { x: 280, y: 32, vx: 35, vy: 0, health: 1, pattern: 'sine', phase: Math.PI },  // Flying bat
        { x: 420, y: 48, vx: -30, vy: 0, health: 1, pattern: 'sine', phase: Math.PI/2 }   // Flying bat
      ],
      tilemap: [
        // 16 rows x 64 columns (512px wide world with scrolling) - 0=empty, 6=platform, 9=brick, 10=metal, 11=spikes, 12=exit
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12], // Row 0: Exit at far right
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,6,6,6],   // Row 1: Platform to exit
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 2
        [0,0,0,0,0,0,0,0,0,9,9,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,9,9,0,0,0,0,0,0,0,0,0,0,0,0,9,9,9,0,0,0,0,0,0,0,0,0,0,0,9,9,9,0,0,0,0,0],   // Row 3: Brick platforms
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 4
        [0,0,0,0,9,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,9,0,0,0,0,0,0,0,0,0,0,0,0,9,9,0,0,0,0,0,0,0,0,0,0,0,0,0,9,9,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 5: Brick platforms
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 6
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 7
        [0,0,0,0,0,0,0,0,0,0,0,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,6,0,0,0,0,0,0,0],   // Row 8: Stone platforms
        [0,0,0,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 9: Stone platforms
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 10
        [0,0,0,0,0,0,0,0,11,11,11,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,0,11,11,11,0,0,0,0,0,0,11,11,11,0,0,0,0,0,0,0,0,11,11,11,0,0,0,0,0,0,0,0,0], // Row 11: Spikes
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 12
        [0,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],   // Row 13: Starting platform
        [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],   // Row 14: Ground
        [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6]    // Row 15: Ground
      ],
      coins: [
        { x: 48, y: 56, collected: false },
        { x: 32, y: 32, collected: false },
        { x: 96, y: 56, collected: false },
        { x: 80, y: 16, collected: false },
        { x: 160, y: 32, collected: false },
        { x: 224, y: 16, collected: false },
        { x: 280, y: 56, collected: false },
        { x: 336, y: 32, collected: false },
        { x: 400, y: 64, collected: false },
        { x: 456, y: 16, collected: false },
        { x: 488, y: 0, collected: false }
      ],
      projectiles: [],
      gravity: GRAVITY,
      jumpPower: JUMP_POWER,
      playerSpeed: PLAYER_SPEED,
      score: 0,
      gameOver: false,
      levelComplete: false,
      camera: {
        x: 0,  // Current camera position
        targetX: 0  // Target camera position (where we want to be)
      },
      music: {
        bass: {index: 0, timer: 0},
        melody: {index: 0, timer: 0}
      }
    };
    // Initialize camera to player's starting position
    gameState.camera.x = Math.max(0, Math.min(gameState.player.x - 64, WORLD_WIDTH - SCREEN_WIDTH));
    gameState.camera.targetX = gameState.camera.x;
  }

  const dt = deltaTime; // Use deltaTime directly
  const sounds = [];

  // Update invincibility timer
  if (gameState.player.invincible) {
    gameState.player.invincibleTimer -= dt;
    if (gameState.player.invincibleTimer <= 0) {
      gameState.player.invincible = false;
      gameState.player.invincibleTimer = 0;
    }
  }

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
      spriteId: SPRITE_EXPLORER_HEAD,
      x: gameState.player.x,
      y: gameState.player.y
    });
    sprites.push({
      spriteId: SPRITE_EXPLORER_BODY,
      x: gameState.player.x,
      y: gameState.player.y + SPRITE_SIZE
    });

    // Render scorpions (2 sprites wide)
    for (const enemy of gameState.enemies) {
      if (enemy.health > 0) {
        sprites.push({
          spriteId: SPRITE_SCORPION_FRONT,
          x: enemy.x,
          y: enemy.y
        });
        sprites.push({
          spriteId: SPRITE_SCORPION_BACK,
          x: enemy.x + SPRITE_SIZE,
          y: enemy.y
        });
      }
    }

    // Render bats
    for (const bat of gameState.bats) {
      if (bat.health > 0) {
        sprites.push({
          spriteId: SPRITE_BAT,
          x: bat.x,
          y: bat.y
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
    // Jump sound
    sounds.push({
      slotId: 0,
      soundId: 'jump',
      channel: 'pulse1',
      frequency: 800,
      duration: 0.12,
      volume: 0.5,
      envelope: 'soft',
      sweep: {target: 200, time: 0.12}
    });
  }

  // Attack (using A button)
  if (input.aPressed && gameState.projectiles.length < MAX_PROJECTILES) {
    gameState.projectiles.push({
      x: gameState.player.x + (gameState.player.facing > 0 ? SPRITE_SIZE : -SPRITE_SIZE),
      y: gameState.player.y + 4,
      vx: gameState.player.facing * PROJECTILE_SPEED,
      life: PROJECTILE_LIFETIME
    });
    // Shoot sound
    sounds.push({
      slotId: 1,
      soundId: 'shoot',
      channel: 'pulse2',
      frequency: 1200,
      duration: 0.08,
      volume: 0.6,
      envelope: 'sharp'
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

  // Check for scorpion collision (damage with invincibility)
  for (const enemy of gameState.enemies) {
    if (enemy.health > 0 && !gameState.player.invincible &&
        gameState.player.x + PLAYER_WIDTH > enemy.x &&
        gameState.player.x < enemy.x + SCORPION_WIDTH &&
        gameState.player.y + PLAYER_HEIGHT > enemy.y &&
        gameState.player.y < enemy.y + SCORPION_HEIGHT) {
      gameState.player.health--;
      gameState.player.invincible = true;
      gameState.player.invincibleTimer = 1.5; // 1.5 seconds of invincibility

      // Damage sound
      sounds.push({
        slotId: 6,
        channel: 'noise',
        mode: 'periodic',
        frequency: 100,
        duration: 0.2,
        volume: 0.6,
        envelope: 'fade'
      });

      if (gameState.player.health <= 0) {
        gameState.gameOver = true;
        return;
      }
    }
  }

  // Check for bat collision (damage with invincibility)
  for (const bat of gameState.bats) {
    if (bat.health > 0 && !gameState.player.invincible &&
        gameState.player.x + PLAYER_WIDTH > bat.x &&
        gameState.player.x < bat.x + SPRITE_SIZE &&
        gameState.player.y + PLAYER_HEIGHT > bat.y &&
        gameState.player.y < bat.y + SPRITE_SIZE) {
      gameState.player.health--;
      gameState.player.invincible = true;
      gameState.player.invincibleTimer = 1.5;

      // Damage sound
      sounds.push({
        slotId: 6,
        channel: 'noise',
        mode: 'periodic',
        frequency: 100,
        duration: 0.2,
        volume: 0.6,
        envelope: 'fade'
      });

      if (gameState.player.health <= 0) {
        gameState.gameOver = true;
        return;
      }
    }
  }

  // Keep player in world bounds
  if (gameState.player.x < 0) gameState.player.x = 0;
  if (gameState.player.x > WORLD_WIDTH - PLAYER_WIDTH) gameState.player.x = WORLD_WIDTH - PLAYER_WIDTH;
  if (gameState.player.y > SCREEN_HEIGHT) {
    gameState.player.y = PLAYER_START_Y;
    gameState.player.x = PLAYER_START_X;
    gameState.player.vy = 0;
  }

  // Update scorpion enemies with deltaTime and gravity
  for (const enemy of gameState.enemies) {
    if (enemy.health <= 0) continue;

    // Apply gravity
    if (!enemy.onGround) {
      enemy.vy += GRAVITY * dt;
    }

    // Update position
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;

    // Enemy walking animation
    enemy.walkTimer += dt;
    if (enemy.walkTimer > ENEMY_WALK_INTERVAL) {
      enemy.walkFrame = 1 - enemy.walkFrame;
      enemy.walkTimer = 0;
    }

    // Check if standing on ground
    enemy.onGround = false;
    const enemyBottom = enemy.y + SCORPION_HEIGHT;
    const enemyLeft = enemy.x;
    const enemyRight = enemy.x + SCORPION_WIDTH - 1;

    // Check for ground beneath scorpion
    for (let x = enemyLeft; x <= enemyRight; x += 4) {
      const tileId = getTileAt(x, enemyBottom);
      if (isSolidTile(tileId)) {
        enemy.onGround = true;
        break;
      }
    }

    // Apply vertical collision if falling
    if (enemy.vy > 0) {
      let hitPlatform = false;
      for (let x = enemyLeft; x <= enemyRight; x += 4) {
        const tileId = getTileAt(x, enemyBottom);
        if (isSolidTile(tileId)) {
          const tileY = Math.floor(enemyBottom / TILE_SIZE);
          enemy.y = tileY * TILE_SIZE - SCORPION_HEIGHT;
          enemy.vy = 0;
          enemy.onGround = true;
          hitPlatform = true;
          break;
        }
      }
    }

    // Enemy AI: reverse direction at edges or walls
    const nextX = enemy.x + (enemy.vx > 0 ? SCORPION_WIDTH : 0);
    const checkX = enemy.vx > 0 ? nextX : nextX - 1;
    const checkTileX = Math.floor(checkX / TILE_SIZE);
    const groundCheckTileX = Math.floor((enemy.x + (enemy.vx > 0 ? SCORPION_WIDTH : -1)) / TILE_SIZE);
    const groundCheckY = Math.floor((enemy.y + SCORPION_HEIGHT + 1) / TILE_SIZE);

    // Check for wall ahead
    let hitWall = false;
    for (let y = enemy.y; y < enemy.y + SCORPION_HEIGHT; y += 4) {
      const tileId = getTileAt(checkX, y);
      if (isSolidTile(tileId)) {
        hitWall = true;
        break;
      }
    }

    // Check if there's no ground ahead (edge of platform)
    let noGroundAhead = false;
    if (enemy.onGround && groundCheckTileX >= 0 && groundCheckTileX < TILES_X && groundCheckY < TILES_Y) {
      const groundTile = gameState.tilemap[groundCheckY][groundCheckTileX];
      if (groundTile === TILE_EMPTY) {
        noGroundAhead = true;
      }
    }

    // Reverse if hitting wall, edge, or world bounds
    if (hitWall || noGroundAhead || enemy.x <= 0 || enemy.x >= WORLD_WIDTH - SCORPION_WIDTH) {
      enemy.vx *= -1;
    }
  }

  // Update bats with sine wave flight pattern
  for (const bat of gameState.bats) {
    if (bat.health <= 0) continue;

    // Horizontal movement
    bat.x += bat.vx * dt;

    // Sine wave vertical movement
    bat.phase += dt * 3; // Control wave speed
    bat.y = bat.y + Math.sin(bat.phase) * 0.5; // Subtle up/down oscillation

    // Reverse direction at world bounds
    if (bat.x <= 0 || bat.x >= WORLD_WIDTH - SPRITE_SIZE) {
      bat.vx *= -1;
    }

    // Keep bats in vertical bounds
    if (bat.y < 16) bat.y = 16;
    if (bat.y > 80) bat.y = 80;
  }

  // Update projectiles with deltaTime
  gameState.projectiles = gameState.projectiles.filter(proj => {
    proj.x += proj.vx * dt;
    proj.life -= dt;

    // Remove if out of bounds or expired
    if (proj.x < 0 || proj.x > WORLD_WIDTH || proj.life <= 0) return false;

    // Check collision with scorpions
    for (const enemy of gameState.enemies) {
      if (enemy.health > 0 &&
          proj.x + PROJECTILE_SIZE > enemy.x && proj.x < enemy.x + SCORPION_WIDTH &&
          proj.y + PROJECTILE_SIZE > enemy.y && proj.y < enemy.y + SCORPION_HEIGHT) {
        enemy.health--;
        if (enemy.health <= 0) {
          gameState.score += ENEMY_KILL_SCORE;
          // Enemy death sound
          sounds.push({
            slotId: 2,
            channel: 'noise',
            mode: 'random',
            duration: 0.3,
            volume: 0.5,
            envelope: 'fade'
          });
        } else {
          // Enemy hit sound
          sounds.push({
            slotId: 2,
            channel: 'noise',
            mode: 'periodic',
            frequency: 150,
            duration: 0.1,
            volume: 0.4,
            envelope: 'sharp'
          });
        }
        return false;
      }
    }

    // Check collision with bats
    for (const bat of gameState.bats) {
      if (bat.health > 0 &&
          proj.x + PROJECTILE_SIZE > bat.x && proj.x < bat.x + SPRITE_SIZE &&
          proj.y + PROJECTILE_SIZE > bat.y && proj.y < bat.y + SPRITE_SIZE) {
        bat.health--;
        if (bat.health <= 0) {
          gameState.score += ENEMY_KILL_SCORE;
          // Bat death sound
          sounds.push({
            slotId: 2,
            channel: 'noise',
            mode: 'random',
            duration: 0.3,
            volume: 0.5,
            envelope: 'fade'
          });
        }
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
      // Coin sound
      sounds.push({
        slotId: 3,
        channel: 'pulse1',
        note: 'E5',
        duration: 0.08,
        volume: 0.6,
        envelope: 'sustain'
      });
    }
  }

  // Update background music
  // Bass track
  gameState.music.bass.timer += dt;
  const bassNote = MUSIC.bass[gameState.music.bass.index];
  if (gameState.music.bass.timer >= bassNote.duration) {
    gameState.music.bass.index = (gameState.music.bass.index + 1) % MUSIC.bass.length;
    gameState.music.bass.timer = 0;
  }

  // Melody track
  gameState.music.melody.timer += dt;
  const melodyNote = MUSIC.melody[gameState.music.melody.index];
  if (gameState.music.melody.timer >= melodyNote.duration) {
    gameState.music.melody.index = (gameState.music.melody.index + 1) % MUSIC.melody.length;
    gameState.music.melody.timer = 0;
  }

  // Add music to sounds (slots 4-5 reserved for music)
  sounds.push({
    slotId: 4,
    soundId: `bass_${gameState.music.bass.index}`,
    channel: 'triangle',
    note: bassNote.note,
    duration: bassNote.duration,
    volume: 0.2,
    envelope: 'sustain'
  });

  sounds.push({
    slotId: 5,
    soundId: `melody_${gameState.music.melody.index}`,
    channel: 'pulse1',
    note: melodyNote.note,
    duration: melodyNote.duration,
    volume: 0.25,
    envelope: 'soft'
  });

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

  // Render treasure
  for (const coin of gameState.coins) {
    if (!coin.collected) {
      sprites.push({
        spriteId: SPRITE_TREASURE,
        x: coin.x,
        y: coin.y
      });
    }
  }

  // Render explorer (2-sprite character)
  sprites.push({
    spriteId: SPRITE_EXPLORER_HEAD,
    x: gameState.player.x,
    y: gameState.player.y
  });
  sprites.push({
    spriteId: SPRITE_EXPLORER_BODY,
    x: gameState.player.x,
    y: gameState.player.y + SPRITE_SIZE
  });

  // Render scorpions (2 sprites wide)
  for (const enemy of gameState.enemies) {
    if (enemy.health > 0) {
      sprites.push({
        spriteId: SPRITE_SCORPION_FRONT,
        x: enemy.x,
        y: enemy.y
      });
      sprites.push({
        spriteId: SPRITE_SCORPION_BACK,
        x: enemy.x + SPRITE_SIZE,
        y: enemy.y
      });
    }
  }

  // Render bats (single sprite)
  for (const bat of gameState.bats) {
    if (bat.health > 0) {
      sprites.push({
        spriteId: SPRITE_BAT,
        x: bat.x,
        y: bat.y
      });
    }
  }

  // Render torches
  for (const proj of gameState.projectiles) {
    sprites.push({
      spriteId: SPRITE_TORCH,
      x: proj.x,
      y: proj.y
    });
  }

  // Render health hearts (fixed position on screen, adjusted for camera scroll)
  for (let i = 0; i < gameState.player.health; i++) {
    sprites.push({
      spriteId: SPRITE_HEART,
      x: gameState.camera.x + 2 + (i * 10), // Position relative to camera
      y: 2
    });
  }

  // Camera dead zone logic - only move camera when player approaches screen edges
  const playerScreenX = gameState.player.x - gameState.camera.x; // Player position relative to camera

  // Check if player is outside the dead zone
  if (playerScreenX < CAMERA_DEAD_ZONE_LEFT) {
    // Player too far left, move camera left to keep them in dead zone
    gameState.camera.x = gameState.player.x - CAMERA_DEAD_ZONE_LEFT;
  } else if (playerScreenX + PLAYER_WIDTH > SCREEN_WIDTH - CAMERA_DEAD_ZONE_RIGHT) {
    // Player too far right, move camera right to keep them in dead zone
    gameState.camera.x = gameState.player.x + PLAYER_WIDTH - (SCREEN_WIDTH - CAMERA_DEAD_ZONE_RIGHT);
  }

  // Clamp camera to world bounds
  gameState.camera.x = Math.max(0, Math.min(gameState.camera.x, WORLD_WIDTH - SCREEN_WIDTH));

  return {
    tiles,
    sprites,
    scroll: { x: Math.round(gameState.camera.x), y: 0 },
    score: gameState.gameOver ? 0 : gameState.score,
    gameOver: gameState.gameOver || gameState.levelComplete,
    sounds: sounds
  };
}