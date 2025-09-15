// NES-style game console implementation

export class NESConsole {
  constructor(canvasId, spriteCanvasId) {
    this.canvas = document.getElementById(canvasId);
    this.spriteCanvas = document.getElementById(spriteCanvasId);

    if (!this.canvas || !this.spriteCanvas) {
      throw new Error("Canvas elements not found");
    }

    this.ctx = this.canvas.getContext("2d");
    this.spriteCtx = this.spriteCanvas.getContext("2d");

    this.ctx.imageSmoothingEnabled = false;
    this.spriteCtx.imageSmoothingEnabled = false;

    this.state = {
      sprites: Array(64).fill(null).map(() => ({ spriteId: 0, x: 0, y: 0 })),
      tiles: Array(32).fill(null).map(() => Array(32).fill(0)),
      backgroundColor: 0,
      palette: this.getDefaultPalette(),
      gameRunning: false,
      score: 0
    };

    this.gameDefinition = null;
    this.inputState = {};
    this.prevInputState = {};
    this.animationId = null;
    this.spriteIdMap = new Map();
    this.spritePositions = [];

    this.setupInputHandlers();
  }

  getDefaultPalette() {
    return [
      0x000000, 0x666666, 0x888888, 0xAAAAAA, 0xCCCCCC, 0xFFFFFF,
      0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF,
      0x800000, 0x008000, 0x000080, 0x808080
    ];
  }

  setupInputHandlers() {
    const buttons = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
    const keyMap = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'KeyZ': 'a',
      'KeyX': 'b',
      'Enter': 'start',
      'Space': 'select'
    };

    buttons.forEach(btn => {
      this.inputState[btn] = false;
      this.prevInputState[btn] = false;
    });

    document.addEventListener('keydown', (e) => {
      const button = keyMap[e.code];
      if (button) {
        this.inputState[button] = true;
        e.preventDefault();
      }
    });

    document.addEventListener('keyup', (e) => {
      const button = keyMap[e.code];
      if (button) {
        this.inputState[button] = false;
        e.preventDefault();
      }
    });

    ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'].forEach(btn => {
      const element = document.getElementById(`btn-${btn}`);
      if (element) {
        element.addEventListener('mousedown', () => this.inputState[btn] = true);
        element.addEventListener('mouseup', () => this.inputState[btn] = false);
        element.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.inputState[btn] = true;
        });
        element.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.inputState[btn] = false;
        });
      }
    });
  }

  loadGame(gameDefinition) {
    this.gameDefinition = gameDefinition;
    this.state.palette = gameDefinition.palette;
    this.buildSpriteMap();
    this.preRenderSprites();

    // Game logic is now handled by QuickJS runner

    this.state.score = 0;
    this.resetGame();
  }

  buildSpriteMap() {
    if (!this.gameDefinition) return;

    this.spriteIdMap.clear();
    this.spritePositions = [{ x: 0, y: 0, width: 8, height: 8 }]; // sprite 0 = empty

    let spriteId = 1;
    let currentX = 8; // Start after empty sprite
    let currentY = 0;
    const sheetWidth = 256;

    // Add sprites
    Object.values(this.gameDefinition.sprites).forEach(sprite => {
      if (currentX + sprite.width > sheetWidth) {
        currentX = 0;
        currentY += 8; // Assume 8px row height for now
      }

      this.spriteIdMap.set(sprite.id, spriteId);
      this.spritePositions[spriteId] = {
        x: currentX,
        y: currentY,
        width: sprite.width,
        height: sprite.height
      };

      currentX += sprite.width;
      spriteId++;
    });

    // Add tiles
    Object.values(this.gameDefinition.tiles).forEach(tile => {
      if (currentX + tile.width > sheetWidth) {
        currentX = 0;
        currentY += 8;
      }

      this.spriteIdMap.set(tile.id, spriteId);
      this.spritePositions[spriteId] = {
        x: currentX,
        y: currentY,
        width: tile.width,
        height: tile.height
      };

      currentX += tile.width;
      spriteId++;
    });
  }

  preRenderSprites() {
    if (!this.gameDefinition) return;

    // Clear sprite sheet
    this.spriteCtx.fillStyle = '#000000';
    this.spriteCtx.fillRect(0, 0, 256, 256);

    // Render all sprites to the sprite sheet
    Object.values(this.gameDefinition.sprites).forEach(sprite => {
      this.renderSpriteToSheet(sprite);
    });

    Object.values(this.gameDefinition.tiles).forEach(tile => {
      this.renderSpriteToSheet(tile);
    });
  }

  renderSpriteToSheet(sprite) {
    const imageData = this.spriteCtx.createImageData(sprite.width, sprite.height);
    const data = imageData.data;

    for (let y = 0; y < sprite.height; y++) {
      for (let x = 0; x < sprite.width; x++) {
        const pixelIndex = y * sprite.width + x;
        const byteIndex = Math.floor(pixelIndex / 8);
        const bitIndex = 7 - (pixelIndex % 8);

        let colorIndex = 0;
        for (let layer = 0; layer < 4; layer++) {
          if (sprite.layers[layer][byteIndex] & (1 << bitIndex)) {
            colorIndex |= (1 << layer);
          }
        }

        const color = this.state.palette[colorIndex] || 0x000000;
        const dataIndex = (y * sprite.width + x) * 4;

        data[dataIndex] = (color >> 16) & 0xFF;     // R
        data[dataIndex + 1] = (color >> 8) & 0xFF;  // G
        data[dataIndex + 2] = color & 0xFF;         // B
        data[dataIndex + 3] = colorIndex === 0 ? 0 : 255; // A (transparent if color 0)
      }
    }

    const spriteId = this.spriteIdMap.get(sprite.id);
    if (spriteId === undefined) return;

    const position = this.spritePositions[spriteId];
    if (!position) return;

    // Render to sprite sheet canvas at calculated position
    this.spriteCtx.putImageData(imageData, position.x, position.y);
  }

  setSprite(slotId, spriteId, x, y) {
    if (slotId >= 0 && slotId < 64) {
      const id = this.spriteIdMap.get(spriteId) || 0;
      this.state.sprites[slotId] = { spriteId: id, x, y };
    }
  }

  clearSprite(slotId) {
    if (slotId >= 0 && slotId < 64) {
      this.state.sprites[slotId] = { spriteId: 0, x: 0, y: 0 };
    }
  }

  setTile(x, y, tileId) {
    if (x >= 0 && x < 32 && y >= 0 && y < 32) {
      const id = this.spriteIdMap.get(tileId) || 0;
      this.state.tiles[y][x] = id;
    }
  }

  clearTile(x, y) {
    if (x >= 0 && x < 32 && y >= 0 && y < 32) {
      this.state.tiles[y][x] = 0;
    }
  }

  setBackgroundColor(colorIndex) {
    this.state.backgroundColor = colorIndex;
  }

  setPalette(_paletteId, colors) {
    this.state.palette = colors;
  }

  isPressed(button) {
    return this.inputState[button] || false;
  }

  justPressed(button) {
    return (this.inputState[button] || false) && !(this.prevInputState[button] || false);
  }

  getScore() {
    return this.state.score;
  }

  setScore(score) {
    this.state.score = score;
  }

  addScore(points) {
    this.state.score += points;
  }

  startGame() {
    this.state.gameRunning = true;
    this.gameLoop();
  }

  stopGame() {
    this.state.gameRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resetGame() {
    // Clear all sprites
    for (let i = 0; i < 64; i++) {
      this.state.sprites[i] = { spriteId: 0, x: 0, y: 0 };
    }

    // Clear all tiles
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        this.state.tiles[y][x] = 0;
      }
    }

    this.state.score = 0;
    this.state.backgroundColor = 0;

    if (this.gameDefinition && this.gameDefinition.initialState) {
      Object.assign(this.state, this.gameDefinition.initialState);
    }
  }

  gameLoop = () => {
    if (!this.state.gameRunning) return;

    this.updateInput();

    // Game logic is now handled by QuickJS runner
    // NES console just handles rendering

    this.render();
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  updateInput() {
    Object.keys(this.inputState).forEach(key => {
      this.prevInputState[key] = this.inputState[key];
    });
  }

  render() {
    const bgColor = this.state.palette[this.state.backgroundColor] || 0x000000;
    this.ctx.fillStyle = `#${bgColor.toString(16).padStart(6, '0')}`;
    this.ctx.fillRect(0, 0, 256, 256);

    this.renderTiles();
    this.renderSprites();
  }

  renderTiles() {
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const tileId = this.state.tiles[y][x];
        if (tileId > 0) {
          const position = this.spritePositions[tileId];
          if (position) {
            this.ctx.drawImage(
              this.spriteCanvas,
              position.x, position.y, position.width, position.height,
              x * 8, y * 8, position.width, position.height
            );
          }
        }
      }
    }
  }

  renderSprites() {
    for (let i = 0; i < 64; i++) {
      const sprite = this.state.sprites[i];
      if (sprite.spriteId > 0) {
        const position = this.spritePositions[sprite.spriteId];
        if (position) {
          this.ctx.drawImage(
            this.spriteCanvas,
            position.x, position.y, position.width, position.height,
            sprite.x, sprite.y, position.width, position.height
          );
        }
      }
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, 256, 256);
    this.spriteCtx.clearRect(0, 0, 256, 256);
  }
}