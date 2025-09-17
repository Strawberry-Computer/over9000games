import { getQuickJS, RELEASE_SYNC } from "quickjs-emscripten";
import { validateGameSchema, sanitizeGameDefinition } from "../shared/game-schema.js";

export class GameRunner {
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
      sprites: Array(64).fill(null).map(() => ({ spriteId: -1, x: 0, y: 0 })),
      tiles: Array(32).fill(null).map(() => Array(32).fill(-1)),
      backgroundColor: 0,
      palette: this.getDefaultPalette(),
      gameRunning: false,
      score: 0
    };

    this.gameDefinition = null;
    this.inputState = {};
    this.prevInputState = {};
    this.animationId = null;

    // QuickJS properties
    this.vm = null;
    this.QuickJS = null;
    this.runtime = null;
    this.updateFunction = null;
    this.isInitialized = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.firstFrameCallback = null;
    this.firstFrameExecuted = false;

    this.setupInputHandlers();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing QuickJS game runner...");
      this.QuickJS = await getQuickJS();

      this.runtime = this.QuickJS.newRuntime({ variant: RELEASE_SYNC });
      this.runtime.setModuleLoader((moduleName) => {
        console.log("Module loader called for:", moduleName);
        return "";
      });

      this.vm = this.runtime.newContext();

      this.isInitialized = true;
      console.log("QuickJS game runner initialized successfully");
    } catch (error) {
      console.error("Failed to initialize QuickJS game runner:", error);
      throw error;
    }
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
        const activeElement = document.activeElement;
        const isInputElement = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true'
        );

        if (!isInputElement) {
          this.inputState[button] = true;
          e.preventDefault();
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      const button = keyMap[e.code];
      if (button) {
        const activeElement = document.activeElement;
        const isInputElement = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true'
        );

        if (!isInputElement) {
          this.inputState[button] = false;
          e.preventDefault();
        }
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

  async loadCode(gameCode) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.vm) {
      this.vm.dispose();
      this.vm = null;
    }

    this.vm = this.runtime.newContext();

    console.log("Loading game code into QuickJS VM...");

    const result = this.vm.evalCode(gameCode, "game.js");
    if (result.error) {
      const errorMsg = this.vm.dump(result.error);
      result.dispose();
      throw new Error(`Failed to load game code: ${errorMsg}`);
    }
    result.dispose();

    const metadataHandle = this.vm.getProp(this.vm.global, "metadata");
    const resourcesHandle = this.vm.getProp(this.vm.global, "resources");
    const updateHandle = this.vm.getProp(this.vm.global, "update");

    if (!metadataHandle || !resourcesHandle || !updateHandle) {
      throw new Error("Game code must define metadata, resources, and update functions");
    }

    const metadataResult = this.vm.callFunction(metadataHandle, this.vm.undefined);
    const resourcesResult = this.vm.callFunction(resourcesHandle, this.vm.undefined);

    if (metadataResult.error || resourcesResult.error) {
      const errorMsg = metadataResult.error ? this.vm.dump(metadataResult.error) : this.vm.dump(resourcesResult.error);
      metadataResult.dispose();
      resourcesResult.dispose();
      throw new Error(`Failed to call game functions: ${errorMsg}`);
    }

    const metadata = this.vm.dump(this.vm.unwrapResult(metadataResult));
    const resources = this.vm.dump(this.vm.unwrapResult(resourcesResult));

    this.updateFunction = updateHandle;

    metadataResult.dispose();
    resourcesResult.dispose();
    metadataHandle.dispose();
    resourcesHandle.dispose();

    this.loadGame({
      metadata,
      ...resources,
      gameLogic: null
    });

    console.log("Game loaded successfully:", metadata.title);
  }

  loadGame(gameDefinition) {
    this.gameDefinition = gameDefinition;
    this.state.palette = gameDefinition.palette;
    this.preRenderSprites();
    this.state.score = 0;
    this.resetGame();
  }

  getSpritePosition(spriteId) {
    const x = ((spriteId | 0) % 32) * 8;  // 32 sprites per row (256px ÷ 8px)
    const y = Math.floor((spriteId | 0) / 32) * 8;
    return { x, y, width: 8, height: 8 };
  }

  preRenderSprites() {
    if (!this.gameDefinition) return;

    this.spriteCtx.fillStyle = '#000000';
    this.spriteCtx.fillRect(0, 0, 256, 256);

    if (Array.isArray(this.gameDefinition.sprites)) {
      this.gameDefinition.sprites.forEach((sprite, index) => {
        this.renderSpriteToSheet(sprite, index);
      });
    }
  }

  renderSpriteToSheet(sprite, index) {
    const imageData = this.spriteCtx.createImageData(8, 8);
    const data = imageData.data;

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pixelIndex = y * 8 + x;
        const byteIndex = Math.floor(pixelIndex / 8);
        const bitIndex = 7 - (pixelIndex % 8);

        let colorIndex = 0;
        for (let layer = 0; layer < sprite.length; layer++) {
          if (sprite[layer] && sprite[layer][byteIndex] & (1 << bitIndex)) {
            colorIndex |= (1 << layer);
          }
        }

        const color = this.state.palette[colorIndex] || 0x000000;
        const dataIndex = (y * 8 + x) * 4;

        data[dataIndex] = (color >> 16) & 0xFF;
        data[dataIndex + 1] = (color >> 8) & 0xFF;
        data[dataIndex + 2] = color & 0xFF;
        data[dataIndex + 3] = colorIndex === 0 ? 0 : 255;
      }
    }

    const position = this.getSpritePosition(index);
    this.spriteCtx.putImageData(imageData, position.x, position.y);
  }

  setSprite(slotId, spriteId, x, y) {
    if (slotId >= 0 && slotId < 64) {
      this.state.sprites[slotId] = { spriteId: spriteId, x, y };
    }
  }

  clearSprite(slotId) {
    if (slotId >= 0 && slotId < 64) {
      this.state.sprites[slotId] = { spriteId: -1, x: 0, y: 0 };
    }
  }

  setTile(x, y, tileId) {
    if (x >= 0 && x < 32 && y >= 0 && y < 32) {
      this.state.tiles[y][x] = tileId;
    }
  }

  clearTile(x, y) {
    if (x >= 0 && x < 32 && y >= 0 && y < 32) {
      this.state.tiles[y][x] = -1;
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
    for (let i = 0; i < 64; i++) {
      this.state.sprites[i] = { spriteId: -1, x: 0, y: 0 };
    }

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        this.state.tiles[y][x] = -1;
      }
    }

    this.state.score = 0;
    this.state.backgroundColor = 0;

    if (this.gameDefinition && this.gameDefinition.initialState) {
      Object.assign(this.state, this.gameDefinition.initialState);
    }

    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.firstFrameExecuted = false;
  }

  setFirstFrameCallback(callback) {
    this.firstFrameCallback = callback;
    this.firstFrameExecuted = false;
  }

  gameLoop = () => {
    if (!this.state.gameRunning) return;

    this.updateInput();

    try {
      const commands = this.executeGameUpdate();
      this.processCommands(commands);
    } catch (error) {
      console.error("Game update error:", error);
    }

    this.render();
    this.frameCount++;

    // Execute first frame callback after first frame is rendered
    if (this.frameCount === 1 && !this.firstFrameExecuted && this.firstFrameCallback) {
      this.firstFrameExecuted = true;
      // Use setTimeout to ensure render is complete
      setTimeout(() => {
        if (this.firstFrameCallback) {
          this.firstFrameCallback();
        }
      }, 50);
    }

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  updateInput() {
    Object.keys(this.inputState).forEach(key => {
      this.prevInputState[key] = this.inputState[key];
    });
  }

  executeGameUpdate() {
    if (!this.vm || !this.updateFunction) return [];

    try {
      const currentTime = performance.now();
      const deltaTime = this.lastFrameTime ? (currentTime - this.lastFrameTime) / 1000 : 0;
      this.lastFrameTime = currentTime;

      const inputState = this.getInputState();

      const deltaTimeHandle = this.vm.newNumber(deltaTime);
      const inputStateHandle = this.vm.newObject();

      Object.entries(inputState).forEach(([key, value]) => {
        const keyHandle = this.vm.newString(key);
        const valueHandle = this.vm.newNumber(value ? 1 : 0);
        this.vm.setProp(inputStateHandle, keyHandle, valueHandle);
        keyHandle.dispose();
        valueHandle.dispose();
      });

      const result = this.vm.callFunction(this.updateFunction, this.vm.undefined, deltaTimeHandle, inputStateHandle);

      deltaTimeHandle.dispose();
      inputStateHandle.dispose();

      if (result.error) {
        const errorMsg = this.vm.dump(result.error);
        result.dispose();
        throw new Error(`Update function error: ${errorMsg}`);
      }

      const commands = this.vm.dump(this.vm.unwrapResult(result));
      result.dispose();

      return commands;

    } catch (error) {
      console.error("Failed to execute game update:", error);
      return {};
    }
  }

  getInputState() {
    return {
      up: this.isPressed('up'),
      down: this.isPressed('down'),
      left: this.isPressed('left'),
      right: this.isPressed('right'),
      a: this.isPressed('a'),
      b: this.isPressed('b'),
      start: this.isPressed('start'),
      select: this.isPressed('select'),
      upPressed: this.justPressed('up'),
      downPressed: this.justPressed('down'),
      leftPressed: this.justPressed('left'),
      rightPressed: this.justPressed('right'),
      aPressed: this.justPressed('a'),
      bPressed: this.justPressed('b'),
      startPressed: this.justPressed('start'),
      selectPressed: this.justPressed('select')
    };
  }

  processCommands(commands) {
    if (!commands) return;

    for (let i = 0; i < 64; i++) {
      this.clearSprite(i);
    }

    if (commands.sprites && Array.isArray(commands.sprites)) {
      commands.sprites.forEach((sprite, index) => {
        if (index < 64) {
          this.setSprite(index, sprite.spriteId, sprite.x, sprite.y);
        }
      });
    }

    if (commands.tiles && Array.isArray(commands.tiles)) {
      commands.tiles.forEach(tile => {
        this.setTile(tile.x, tile.y, tile.tileId);
      });
    }

    if (commands.background !== undefined) {
      this.setBackgroundColor(commands.background);
    }

    if (commands.score !== undefined) {
      this.setScore(commands.score);
    }
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
        if (tileId >= 0) {
          const position = this.getSpritePosition(tileId);
          this.ctx.drawImage(
            this.spriteCanvas,
            position.x, position.y, position.width, position.height,
            x * 8, y * 8, position.width, position.height
          );
        }
      }
    }
  }

  renderSprites() {
    for (let i = 0; i < 64; i++) {
      const sprite = this.state.sprites[i];
      if (sprite.spriteId >= 0) {
        const position = this.getSpritePosition(sprite.spriteId);
        this.ctx.drawImage(
          this.spriteCanvas,
          position.x, position.y, position.width, position.height,
          Math.round(sprite.x), Math.round(sprite.y), position.width, position.height
        );
      }
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, 256, 256);
    this.spriteCtx.clearRect(0, 0, 256, 256);
  }

  dispose() {
    if (this.updateFunction) {
      this.updateFunction.dispose();
      this.updateFunction = null;
    }

    if (this.vm) {
      this.vm.dispose();
      this.vm = null;
    }

    if (this.runtime) {
      this.runtime.dispose();
      this.runtime = null;
    }

    this.QuickJS = null;
    this.gameDefinition = null;
    this.isInitialized = false;
  }
}

let gameRunner = null;

export function getGameRunner(canvasId, spriteCanvasId) {
  if (!gameRunner) {
    gameRunner = new GameRunner(canvasId, spriteCanvasId);
  }
  return gameRunner;
}

export function disposeGameRunner() {
  if (gameRunner) {
    gameRunner.dispose();
    gameRunner = null;
  }
}