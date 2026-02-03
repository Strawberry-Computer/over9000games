import { getQuickJS } from "quickjs-emscripten";
import { validateGameSchema, sanitizeGameDefinition } from "../shared/game-schema.js";
import { renderBitmapText, renderCenteredBitmapText, generateFontTileSprites } from "./bitmap-font.js";
import { AudioManager } from "./audio/audio-manager.js";
import {
  QuickJSGameExecutor,
  getSpritePosition,
  getDefaultPalette,
  MAX_TILES_X,
  MAX_TILES_Y
} from "../shared/game-runner-common.js";

// Unified game state enum
const GameState = {
  STOPPED: 'stopped',    // No game loaded or game stopped
  RUNNING: 'running',    // Game actively playing
  PAUSED: 'paused',      // Game paused (shows leaderboard)
  GAME_OVER: 'game_over' // Game ended (shows leaderboard with final score)
};

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

    // Support larger worlds for scrolling: 128 tiles wide × 16 tall (1024px × 128px)
    this.state = {
      sprites: Array(64).fill(null).map(() => ({ spriteId: -1, x: 0, y: 0, flipH: false, flipV: false })),
      tiles: Array(MAX_TILES_Y).fill(null).map(() => Array(MAX_TILES_X).fill(-1)),
      backgroundColor: 0,
      palette: getDefaultPalette(),
      gameState: GameState.STOPPED, // Unified state machine
      score: 0,
      finalScore: 0,
      scroll: { x: 0, y: 0 }
    };

    this.maxTilesX = MAX_TILES_X;
    this.maxTilesY = MAX_TILES_Y;

    this.leaderboardLoading = false;
    this.loadingAnimationFrame = 0;

    this.gameDefinition = null;
    this.inputState = {};
    this.prevInputState = {};
    this.animationId = null;

    // QuickJS properties
    this.vm = null;
    this.QuickJS = null;
    this.runtime = null;
    this.executor = null;
    this.updateFunction = null;
    this.isInitialized = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.isGeneratedGame = false;

    // Audio system
    this.audioManager = new AudioManager();
    this.audioInitialized = false;

    this.setupInputHandlers();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing QuickJS game runner...");
      this.QuickJS = await getQuickJS();

      this.runtime = this.QuickJS.newRuntime()//{ variant: RELEASE_SYNC });
      this.runtime.setModuleLoader((moduleName) => {
        console.log("Module loader called for:", moduleName);
        return "";
      });

      this.vm = this.runtime.newContext();
      this.executor = new QuickJSGameExecutor(this.vm, this.QuickJS);

      this.isInitialized = true;
      console.log("QuickJS game runner initialized successfully");
    } catch (error) {
      console.error("Failed to initialize QuickJS game runner:", error);
      throw error;
    }
  }

  setupInputHandlers() {
    const buttons = ['up', 'down', 'left', 'right', 'a', 'b'];
    const keyMap = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'KeyZ': 'a',
      'KeyX': 'b'
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
          this.audioManager.tryResume(); // Auto-enable audio on keyboard input
          this.inputState[button] = true;
          e.preventDefault();
        }
      }

      // Handle special keys for pause/restart
      if (!document.activeElement || (
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        document.activeElement.contentEditable !== 'true'
      )) {
        if (e.code === 'Space') {
          this.togglePause();
          e.preventDefault();
        } else if (e.code === 'Enter') {
          if (window.restartCurrentGame) {
            window.restartCurrentGame();
          }
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

    ['up', 'down', 'left', 'right', 'a', 'b'].forEach(btn => {
      const element = document.getElementById(`btn-${btn}`);
      if (element) {
        element.addEventListener('mousedown', () => {
          this.audioManager.tryResume(); // Auto-enable audio on any interaction
          this.inputState[btn] = true;
        });
        element.addEventListener('mouseup', () => this.inputState[btn] = false);
        element.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.audioManager.tryResume(); // Auto-enable audio on any touch
          this.inputState[btn] = true;
        });
        element.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.inputState[btn] = false;
        });
      }
    });

    // Enhanced touch zone for d-pad
    this.setupDPadTouchZone();
  }

  setupDPadTouchZone() {
    const touchZone = document.getElementById('dpad-touch-zone');
    if (!touchZone) return;

    let isActive = false;
    const directionButtons = {
      up: document.getElementById('btn-up'),
      down: document.getElementById('btn-down'),
      left: document.getElementById('btn-left'),
      right: document.getElementById('btn-right')
    };

    const updateDirectionFromTouch = (touch) => {
      const rect = touchZone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = touch.clientX - centerX;
      const deltaY = touch.clientY - centerY;

      // Deadzone threshold (pixels)
      const deadzone = 15;

      // Clear all directions first
      ['up', 'down', 'left', 'right'].forEach(dir => {
        this.inputState[dir] = false;
        if (directionButtons[dir]) {
          directionButtons[dir].classList.remove('pressed');
        }
      });

      // Apply new directions based on touch position
      if (Math.abs(deltaX) > deadzone || Math.abs(deltaY) > deadzone) {
        if (Math.abs(deltaY) > Math.abs(deltaX) * 0.4) {
          if (deltaY < 0) {
            this.inputState['up'] = true;
            directionButtons.up?.classList.add('pressed');
          } else {
            this.inputState['down'] = true;
            directionButtons.down?.classList.add('pressed');
          }
        }

        if (Math.abs(deltaX) > Math.abs(deltaY) * 0.4) {
          if (deltaX < 0) {
            this.inputState['left'] = true;
            directionButtons.left?.classList.add('pressed');
          } else {
            this.inputState['right'] = true;
            directionButtons.right?.classList.add('pressed');
          }
        }
      }
    };

    const clearDirections = () => {
      ['up', 'down', 'left', 'right'].forEach(dir => {
        this.inputState[dir] = false;
        if (directionButtons[dir]) {
          directionButtons[dir].classList.remove('pressed');
        }
      });
      isActive = false;
    };

    // Unified start handler for both touch and mouse
    const handleStart = (e) => {
      e.preventDefault();
      this.audioManager.tryResume(); // Auto-enable audio on D-pad touch
      if (!isActive) {
        isActive = true;
        const point = e.touches ? e.touches[0] : e;
        updateDirectionFromTouch(point);
      }
    };

    // Unified move handler for both touch and mouse
    const handleMove = (e) => {
      e.preventDefault();
      if (isActive) {
        const point = e.touches ? e.touches[0] : e;
        updateDirectionFromTouch(point);
      }
    };

    // Unified end handler for both touch and mouse
    const handleEnd = (e) => {
      e.preventDefault();
      if (isActive) {
        clearDirections();
      }
    };

    // Add listeners for both touch and mouse events
    ['touchstart', 'mousedown'].forEach(evt => touchZone.addEventListener(evt, handleStart));
    ['touchmove', 'mousemove'].forEach(evt => touchZone.addEventListener(evt, handleMove));
    ['touchend', 'mouseup'].forEach(evt => touchZone.addEventListener(evt, handleEnd));

    touchZone.addEventListener('touchcancel', handleEnd);
    touchZone.addEventListener('mouseleave', handleEnd);
  }

  async loadCode(gameCode, options = {}) {
    const {
      autoStart = true,
      isPublished = false,
      isGenerated = false
    } = options;

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Stop any running game loop before disposing VM
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.state.gameState = GameState.STOPPED;

    if (this.vm) {
      this.vm.dispose();
      this.vm = null;
    }

    // Clear any persistent messages when loading new game
    this.displayMessage = null;
    this.displayTitle = null;

    this.vm = this.runtime.newContext();
    this.executor = new QuickJSGameExecutor(this.vm, this.QuickJS);

    console.log("Loading game code into QuickJS VM...");

    // Store game code for debug panel
    this.gameCode = gameCode;

    // Use shared executor to load game code
    const { metadata, resources, updateHandle } = this.executor.loadGameCode(gameCode);
    this.updateFunction = updateHandle;

    this.loadGame({
      metadata,
      ...resources,
      gameLogic: null
    });

    console.log("Game loaded successfully:", metadata.title);

    // Update debug panel with game resources
    this.updateDebugPanel();

    // Update debug panel with source code
    if (this.debugPanel) {
      this.debugPanel.setGameCode(gameCode);
    }

    // Apply options
    this.isPublished = isPublished;
    this.isGeneratedGame = isGenerated;

    if (autoStart) {
      this.startGame();
    }
  }

  loadGame(gameDefinition) {
    this.gameDefinition = gameDefinition;
    this.state.palette = gameDefinition.palette;
    this.preRenderSprites();
    this.state.score = 0;
    this.resetGame();
  }

  preRenderSprites() {
    if (!this.gameDefinition) return;

    // Sprite sheet is 128×256 (supports IDs 0-511)
    this.spriteCtx.fillStyle = '#000000';
    this.spriteCtx.fillRect(0, 0, 128, 256);

    // Render game sprites (typically IDs 0-63)
    if (Array.isArray(this.gameDefinition.sprites)) {
      this.gameDefinition.sprites.forEach((sprite, index) => {
        this.renderSpriteToSheet(sprite, index);
      });
    }

    // Pre-render font tiles (IDs 0x100+)
    this.preRenderFontTiles();
  }

  preRenderFontTiles() {
    // Generate font sprites using palette color 1 (typically white)
    const fontTiles = generateFontTileSprites(1);

    fontTiles.forEach(({tileId, sprite}) => {
      this.renderSpriteToSheet(sprite, tileId);
    });
  }

  renderSpriteToSheet(sprite, index) {
    const imageData = this.spriteCtx.createImageData(8, 8);
    const data = imageData.data;

    for (let y = 0; y < 8; y++) {
      const row = sprite[y];
      for (let x = 0; x < 8; x++) {
        const colorIndex = parseInt(row[x], 16);
        const color = this.state.palette[colorIndex] || 0x000000;
        const dataIndex = (y * 8 + x) * 4;

        data[dataIndex] = (color >> 16) & 0xFF;
        data[dataIndex + 1] = (color >> 8) & 0xFF;
        data[dataIndex + 2] = color & 0xFF;
        data[dataIndex + 3] = colorIndex === 0 ? 0 : 255;
      }
    }

    const position = getSpritePosition(index);
    this.spriteCtx.putImageData(imageData, position.x, position.y);
  }

  setSprite(slotId, spriteId, x, y, flipH = false, flipV = false) {
    if (slotId >= 0 && slotId < 64) {
      this.state.sprites[slotId] = { spriteId: spriteId, x, y, flipH, flipV };
    }
  }

  clearSprite(slotId) {
    if (slotId >= 0 && slotId < 64) {
      this.state.sprites[slotId] = { spriteId: -1, x: 0, y: 0, flipH: false, flipV: false };
    }
  }

  setTile(x, y, tileId) {
    if (x >= 0 && x < this.maxTilesX && y >= 0 && y < this.maxTilesY) {
      this.state.tiles[y][x] = tileId;
    }
  }

  clearTile(x, y) {
    if (x >= 0 && x < this.maxTilesX && y >= 0 && y < this.maxTilesY) {
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
    // Initialize audio in background (non-blocking)
    if (!this.audioInitialized) {
      try {
        this.audioManager.initialize().then(() => {
          this.audioInitialized = true;
          // Resume audio once initialized
          if (this.audioManager.ctx) {
            this.audioManager.resume().catch(err => {
              console.error("Audio resume failed:", err);
            });
          }
        }).catch(error => {
          console.error("Audio initialization failed:", error);
        });
      } catch (error) {
        console.error("Audio initialization failed:", error);
      }
    } else if (this.audioInitialized && this.audioManager.ctx) {
      // Resume audio in background (don't wait for it)
      this.audioManager.resume().catch(err => {
        console.error("Audio resume failed:", err);
      });
    }

    // Start the game immediately
    console.log("Starting game loop, state set to RUNNING");
    this.state.gameState = GameState.RUNNING;
    this.gameLoop();
  }

  stopGame(options = {}) {
    this.state.gameState = GameState.STOPPED;
    this.hideLeaderboard();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Optionally show a message after stopping
    if (options.message) {
      this.showMessage(options.message, options.title);
    }
  }

  pauseGame(showLeaderboard = true) {
    this.state.gameState = GameState.PAUSED;
    if (showLeaderboard) {
      this.showLeaderboardLoading();
    }
  }

  resumeGame() {
    this.state.gameState = GameState.RUNNING;
    this.hideLeaderboard();
    // Game loop should already be running when paused, so no need to restart it
  }

  restartGame() {
    this.resetGame();
    this.startGame();
  }

  togglePause() {
    if (this.state.gameState === GameState.GAME_OVER) return; // Can't pause when game is over

    if (this.state.gameState === GameState.PAUSED) {
      this.resumeGame();
    } else {
      this.pauseGame();
      // Always refresh leaderboard when pausing
      if (window.loadLeaderboard) {
        window.loadLeaderboard();
      }
    }
  }

  resetGame() {
    for (let i = 0; i < 64; i++) {
      this.state.sprites[i] = { spriteId: -1, x: 0, y: 0, flipH: false, flipV: false };
    }

    for (let y = 0; y < this.maxTilesY; y++) {
      for (let x = 0; x < this.maxTilesX; x++) {
        this.state.tiles[y][x] = -1;
      }
    }

    this.state.score = 0;
    this.state.backgroundColor = 0;
    this.state.gameState = GameState.STOPPED;
    this.state.scroll = { x: 0, y: 0 };

    if (this.gameDefinition && this.gameDefinition.initialState) {
      Object.assign(this.state, this.gameDefinition.initialState);
    }

    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.state.finalScore = 0;
    this.leaderboardData = [];
  }

  showLeaderboard(leaderboardData) {
    console.log("showLeaderboard called with:", leaderboardData, "length:", leaderboardData?.length);
    this.leaderboardData = leaderboardData || [];
    this.leaderboardLoading = false;
    console.log("showLeaderboard: set this.leaderboardData to:", this.leaderboardData, "length:", this.leaderboardData.length);

    // Force a render when not in running state (e.g., game over state)
    if (this.state.gameState !== GameState.RUNNING) {
      this.render();
    }
  }

  showLeaderboardLoading() {
    this.leaderboardLoading = true;
    this.leaderboardData = [];

    // Force a render when not in running state (e.g., game over state)
    if (this.state.gameState !== GameState.RUNNING) {
      this.render();
    }
  }

  setHighScoreMessage(message) {
    this.highScoreMessage = message;
  }

  hideLeaderboard() {
    this.leaderboardData = [];
    this.highScoreMessage = null;
  }

  updateScoreDisplay() {
    const gameInfoElement = document.getElementById('game-info');
    if (gameInfoElement && this.state.score !== undefined) {
      gameInfoElement.textContent = `SCORE: ${this.state.score}`;
    }
  }

  handleGameOver() {
    this.state.gameState = GameState.GAME_OVER;
    this.state.finalScore = this.state.score;

    console.log(`Game Over! Final Score: ${this.state.finalScore}`);

    // Update game info to show game over
    const gameInfoElement = document.getElementById('game-info');
    if (gameInfoElement) {
      gameInfoElement.textContent = `GAME OVER! SCORE: ${this.state.finalScore}`;
      gameInfoElement.style.color = "#ff0000";
    }

    // Auto-show leaderboard loading state on game over
    this.showLeaderboardLoading();

    // Submit score first, then load leaderboard
    if (window.submitScore) {
      window.submitScore(this.state.finalScore).then(() => {
        // Load leaderboard after score submission completes
        if (window.loadLeaderboard) {
          console.log("Calling loadLeaderboard after score submission");
          window.loadLeaderboard();
        }
      });
    } else {
      // If no score submission, just load leaderboard
      if (window.loadLeaderboard) {
        console.log("Calling loadLeaderboard from game over (no score submission)");
        window.loadLeaderboard();
      }
    }
  }


  gameLoop = () => {
    // Only continue loop if game is running or paused (stops completely when stopped or game over without loop)
    if (this.state.gameState === GameState.STOPPED) return;

    // Only update game logic when running
    if (this.state.gameState === GameState.RUNNING) {
      try {
        const commands = this.executeGameUpdate();
        this.processCommands(commands);
      } catch (error) {
        console.error("Game update error:", error);
        this.stopGame({ message: "Game crashed: " + error.message, title: "Error" });
        return;
      }

      this.frameCount++;

      // Update input state AFTER game update to preserve justPressed detection
      this.updateInput();
    }

    // Always render (shows game, paused overlay, or game over overlay)
    const renderStart = performance.now();
    this.render();
    const renderTime = performance.now() - renderStart;

    // Update debug panel state (throttled to avoid performance impact)
    if (this.debugPanel && this.frameCount % 10 === 0) {
      const spriteCount = this.state.sprites.filter(s => s.spriteId >= 0).length;
      const tileCount = this.state.tiles.reduce((sum, row) =>
        sum + row.filter(t => t >= 0).length, 0);

      this.debugPanel.updateState({
        score: this.state.score,
        gameOver: this.state.gameState === GameState.GAME_OVER,
        frame: this.frameCount,
        fps: this.lastFrameTime ? 1000 / ((performance.now() - this.lastFrameTime) * 10) : 60,
        spriteCount,
        tileCount,
        scrollX: this.state.scroll.x,
        scrollY: this.state.scroll.y,
        renderTime
      });
    }

    // Continue loop unless stopped
    if (this.state.gameState !== GameState.STOPPED) {
      this.animationId = requestAnimationFrame(this.gameLoop);
    }
  };

  updateInput() {
    Object.keys(this.inputState).forEach(key => {
      this.prevInputState[key] = this.inputState[key];
    });
  }

  executeGameUpdate() {
    if (!this.executor || !this.updateFunction) return [];

    try {
      const currentTime = performance.now();
      const deltaTime = this.lastFrameTime ? (currentTime - this.lastFrameTime) / 1000 : 0;
      this.lastFrameTime = currentTime;

      const inputState = this.getInputState();

      // Use shared executor's callUpdate method
      const commands = this.executor.callUpdate(this.updateFunction, deltaTime, inputState);

      return commands;

    } catch (error) {
      console.error("Failed to execute game update:", error);
      return {};
    }
  }

  getInputState() {
    const buttonStates = {
      up: this.isPressed('up'),
      down: this.isPressed('down'),
      left: this.isPressed('left'),
      right: this.isPressed('right'),
      a: this.isPressed('a'),
      b: this.isPressed('b')
    };

    const prevButtonStates = {
      up: this.prevInputState['up'],
      down: this.prevInputState['down'],
      left: this.prevInputState['left'],
      right: this.prevInputState['right'],
      a: this.prevInputState['a'],
      b: this.prevInputState['b']
    };

    return QuickJSGameExecutor.createInputState(buttonStates, prevButtonStates);
  }

  processCommands(commands) {
    if (!commands) return;

    // Clear sprites every frame
    for (let i = 0; i < 64; i++) {
      this.clearSprite(i);
    }

    // Clear tiles every frame
    for (let y = 0; y < this.maxTilesY; y++) {
      for (let x = 0; x < this.maxTilesX; x++) {
        this.state.tiles[y][x] = -1;
      }
    }

    if (commands.sprites && Array.isArray(commands.sprites)) {
      commands.sprites.forEach((sprite, index) => {
        if (index < 64) {
          this.setSprite(
            index,
            sprite.spriteId,
            sprite.x,
            sprite.y,
            sprite.flipH || false,
            sprite.flipV || false
          );
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

    if (commands.scroll !== undefined) {
      this.state.scroll = {
        x: commands.scroll.x || 0,
        y: commands.scroll.y || 0
      };
    }

    if (commands.score !== undefined) {
      this.setScore(commands.score);
      this.updateScoreDisplay();
    }

    // Process audio commands
    if (this.audioInitialized) {
      const audioCommands = [];

      // Sound commands
      if (commands.sounds && Array.isArray(commands.sounds)) {
        audioCommands.push(...commands.sounds.map(sound => ({
          type: 'sound',
          ...sound
        })));
      }

      // Global audio commands
      if (commands.audio) {
        audioCommands.push({
          type: 'audio',
          ...commands.audio
        });
      }

      if (audioCommands.length > 0) {
        this.audioManager.processCommands(audioCommands);
      }
    }

    if (commands.gameOver === true) {
      this.handleGameOver();
    }
  }

  showMessage(message, title = null) {
    // Store message to be displayed
    this.displayMessage = message;
    this.displayTitle = title;
    // Force a render to show the message
    this.render();
  }

  render() {
    const bgColor = this.state.palette[this.state.backgroundColor] || 0x000000;
    this.ctx.fillStyle = `#${bgColor.toString(16).padStart(6, '0')}`;
    this.ctx.fillRect(0, 0, 128, 128);

    // If there's a message to display, show it instead of game
    if (this.displayMessage && this.state.gameState === GameState.STOPPED) {
      this.renderMessageOverlay();
      return;
    }

    this.renderTiles();
    this.renderSprites();

    // Render leaderboard overlay when paused or game over
    if (this.state.gameState === GameState.PAUSED ||
        this.state.gameState === GameState.GAME_OVER) {
      this.renderLeaderboardOverlay();
    }
  }

  renderMessageOverlay() {
    // Semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, 128, 128);

    // Message box background
    this.ctx.fillStyle = '#2d2d2d';
    this.ctx.fillRect(0, 0, 128, 128);

    // Message box border (NES-style)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, 128, 2); // Top
    this.ctx.fillRect(0, 126, 128, 2); // Bottom
    this.ctx.fillRect(0, 0, 2, 128); // Left
    this.ctx.fillRect(126, 0, 2, 128); // Right

    // Inner border
    this.ctx.fillStyle = '#424242';
    this.ctx.fillRect(2, 2, 124, 2); // Top
    this.ctx.fillRect(2, 124, 124, 2); // Bottom
    this.ctx.fillRect(2, 2, 2, 124); // Left
    this.ctx.fillRect(124, 2, 2, 124); // Right

    const centerX = 64;
    let yPos = 20;

    // Title if provided
    if (this.displayTitle) {
      renderCenteredBitmapText(this.ctx, this.displayTitle, centerX, yPos, '#ffff00', 1);
      yPos += 20;
    }

    // Message text (split into lines if needed)
    const lines = this.displayMessage.split('\n');
    for (const line of lines) {
      renderCenteredBitmapText(this.ctx, line, centerX, yPos, '#ffffff', 1);
      yPos += 12;
    }
  }

  renderTiles() {
    const scrollX = this.state.scroll.x;
    const scrollY = this.state.scroll.y;

    for (let y = 0; y < this.maxTilesY; y++) {
      for (let x = 0; x < this.maxTilesX; x++) {
        const tileId = this.state.tiles[y][x];
        if (tileId >= 0) {
          // Convert world tile coordinates to screen pixel coordinates
          const screenX = x * 8 - scrollX;
          const screenY = y * 8 - scrollY;

          // Cull tiles outside viewport
          if (screenX < -8 || screenX >= 128 || screenY < -8 || screenY >= 128) {
            continue;
          }

          const position = getSpritePosition(tileId);
          this.ctx.drawImage(
            this.spriteCanvas,
            position.x, position.y, position.width, position.height,
            screenX, screenY, position.width, position.height
          );
        }
      }
    }
  }

  renderSprites() {
    const scrollX = this.state.scroll.x;
    const scrollY = this.state.scroll.y;

    for (let i = 0; i < 64; i++) {
      const sprite = this.state.sprites[i];
      if (sprite.spriteId >= 0) {
        // Convert world coordinates to screen coordinates
        const screenX = Math.round(sprite.x - scrollX);
        const screenY = Math.round(sprite.y - scrollY);

        // Cull sprites outside viewport
        if (screenX < -8 || screenX >= 128 || screenY < -8 || screenY >= 128) {
          continue;
        }

        const position = getSpritePosition(sprite.spriteId);

        // Apply sprite flipping if needed
        if (sprite.flipH || sprite.flipV) {
          this.ctx.save();

          // Move to sprite center
          this.ctx.translate(screenX + 4, screenY + 4);

          // Apply flipping
          this.ctx.scale(sprite.flipH ? -1 : 1, sprite.flipV ? -1 : 1);

          // Draw sprite centered at origin
          this.ctx.drawImage(
            this.spriteCanvas,
            position.x, position.y, position.width, position.height,
            -4, -4, position.width, position.height
          );

          this.ctx.restore();
        } else {
          // No flipping - standard draw
          this.ctx.drawImage(
            this.spriteCanvas,
            position.x, position.y, position.width, position.height,
            screenX, screenY, position.width, position.height
          );
        }
      }
    }
  }


  renderLeaderboardOverlay() {
    // Semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, 128, 128);

    // Leaderboard box background
    this.ctx.fillStyle = '#2d2d2d';
    this.ctx.fillRect(0, 0, 128, 128);

    // Leaderboard box border (NES-style)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, 128, 2); // Top
    this.ctx.fillRect(0, 126, 128, 2); // Bottom
    this.ctx.fillRect(0, 0, 2, 128); // Left
    this.ctx.fillRect(126, 0, 2, 128); // Right

    // Inner border
    this.ctx.fillStyle = '#424242';
    this.ctx.fillRect(2, 2, 124, 2); // Top
    this.ctx.fillRect(2, 124, 124, 2); // Bottom
    this.ctx.fillRect(2, 2, 2, 124); // Left
    this.ctx.fillRect(124, 2, 2, 124); // Right

    const centerX = 64;

    // Title - show "GAME OVER" if game over, otherwise "HIGH SCORES"
    if (this.state.gameState === GameState.GAME_OVER) {
      renderCenteredBitmapText(this.ctx, 'GAME OVER', centerX, 10, '#ff0000', 1);
      renderCenteredBitmapText(this.ctx, `SCORE: ${this.state.finalScore}`, centerX, 19, '#ffff00', 1);
    } else {
      renderCenteredBitmapText(this.ctx, 'HIGH SCORES', centerX, 10, '#ffff00', 1);
    }

    // High score message if available
    if (this.highScoreMessage) {
      const yPos = this.state.gameState === GameState.GAME_OVER ? 28 : 19;
      renderCenteredBitmapText(this.ctx, this.highScoreMessage, centerX, yPos, '#00ff00', 1);
    }

    // Render scores
    let startY = this.state.gameState === GameState.GAME_OVER ? 36 : 24;
    if (this.highScoreMessage) {
      startY += 10;
    }

    // Check if this is an unpublished game (leaderboard disabled)
    if (this.isPublished === false) {
      renderCenteredBitmapText(this.ctx, 'GAME', centerX, startY + 8, '#ffff00', 1);
      renderCenteredBitmapText(this.ctx, 'NOT SHARED', centerX, startY + 16, '#ffffff', 1);
    } else if (this.leaderboardLoading) {
      // Animate ellipsis every 20 frames (roughly 1/3 second at 60fps)
      this.loadingAnimationFrame = (this.loadingAnimationFrame + 1) % 80;
      const ellipsisCount = Math.floor(this.loadingAnimationFrame / 20);
      const dots = '.'.repeat(ellipsisCount);

      renderCenteredBitmapText(this.ctx, `LOADING${dots}`, centerX, startY + 15, '#ffff00', 1);
    } else if (this.leaderboardData.length === 0) {
      renderCenteredBitmapText(this.ctx, 'NO SCORES YET', centerX, startY + 15, '#ffffff', 1);
      renderCenteredBitmapText(this.ctx, 'BE THE FIRST!', centerX, startY + 25, '#ffffff', 1);
    } else {
      let yPos = startY;
      // Limit to 8 scores to fit within screen with TAP TO RESUME at bottom
      for (let i = 0; i < Math.min(this.leaderboardData.length, 8); i++) {
        const score = this.leaderboardData[i];
        const rank = i + 1;
        const medal = rank.toString();

        // Rank
        renderBitmapText(this.ctx, medal, 6, yPos, '#ffff00', 1);

        // Username (truncated if too long to prevent overlap with score)
        const maxUsernameLength = 6;
        const username = score.username.length > maxUsernameLength ?
          score.username.substring(0, maxUsernameLength) : score.username;
        renderBitmapText(this.ctx, username, 24, yPos, '#ffffff', 1);

        // Score (right-aligned, max 5 digits)
        let scoreText = score.score.toString();
        if (scoreText.length > 5) {
          scoreText = '99999';
        }
        const scoreWidth = scoreText.length * 8;
        renderBitmapText(this.ctx, scoreText, 122 - scoreWidth, yPos, '#00ff00', 1);

        yPos += 10;
      }
    }

    // Draw RESUME button if paused (not game over)
    if (this.state.gameState === GameState.PAUSED) {
      this.renderResumeButton();
    }

  }

  renderResumeButton() {
    // Just render "tap to resume" text without button styling
    const textY = 110;
    renderCenteredBitmapText(this.ctx, 'TAP TO RESUME', 64, textY, '#ffffff', 1);

    // Store bounds for click detection (lower half of screen)
    this.resumeButtonBounds = { x: 0, y: 100, width: 128, height: 28 };
  }

  isResumeButtonClicked(x, y) {
    if (!this.resumeButtonBounds) return false;
    const bounds = this.resumeButtonBounds;
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
  }

  clear() {
    this.ctx.clearRect(0, 0, 128, 128);
    this.spriteCtx.clearRect(0, 0, 128, 128);
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

    // Cleanup audio
    if (this.audioManager) {
      this.audioManager.cleanup();
    }

    this.QuickJS = null;
    this.gameDefinition = null;
    this.isInitialized = false;
  }

  // ==================== DEBUG PANEL INTEGRATION ====================

  getDebugData() {
    return {
      palette: this.state.palette || [],
      sprites: this.gameDefinition?.sprites || [],
      metadata: this.gameDefinition?.metadata || null,
      score: this.state.score,
      gameOver: this.state.gameState === GameState.GAME_OVER,
      frame: this.frameCount,
      scroll: this.state.scroll
    };
  }

  setDebugPanelRef(debugPanel) {
    this.debugPanel = debugPanel;
  }

  updateDebugPanel() {
    if (!this.debugPanel) return;

    // Update sprites and palette
    this.debugPanel.setGameResources(
      this.state.palette,
      this.gameDefinition?.sprites || []
    );
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