import { getQuickJS } from "quickjs-emscripten";
import { validateGameSchema, sanitizeGameDefinition } from "../shared/game-schema.js";

export class QuickJSGameRunner {
  constructor(nesConsole) {
    this.nesConsole = nesConsole;
    this.vm = null;
    this.QuickJS = null;
    this.gameDefinition = null;
    this.gameState = {};
    this.isInitialized = false;
    this.updateHandle = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing QuickJS game runner...");
      this.QuickJS = await getQuickJS();
      this.vm = this.QuickJS.newContext();
      this.setupSandbox();
      this.isInitialized = true;
      console.log("QuickJS game runner initialized successfully");
    } catch (error) {
      console.error("Failed to initialize QuickJS game runner:", error);
      throw error;
    }
  }

  setupSandbox() {
    // Create sys interface that bridges to NES console
    const sysInterfaceCode = `
      const sys = {
        // Sprite management
        setSprite: function(slotId, spriteId, x, y) {
          globalThis._nesConsole.setSprite(slotId, spriteId, x, y);
        },

        clearSprite: function(slotId) {
          globalThis._nesConsole.clearSprite(slotId);
        },

        // Tile management
        setTile: function(x, y, tileId) {
          globalThis._nesConsole.setTile(x, y, tileId);
        },

        clearTile: function(x, y) {
          globalThis._nesConsole.clearTile(x, y);
        },

        // Background
        setBackgroundColor: function(colorIndex) {
          globalThis._nesConsole.setBackgroundColor(colorIndex);
        },

        // Input
        isPressed: function(button) {
          return globalThis._nesConsole.isPressed(button);
        },

        justPressed: function(button) {
          return globalThis._nesConsole.justPressed(button);
        },

        // Score
        getScore: function() {
          return globalThis._nesConsole.getScore();
        },

        setScore: function(score) {
          globalThis._nesConsole.setScore(score);
        },

        addScore: function(points) {
          globalThis._nesConsole.addScore(points);
        }
      };

      // Global game state
      let gameState = {};

      // Helper functions available to games
      function log(message) {
        console.log("[Game]", message);
      }

      function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
      }

      function random(min = 0, max = 1) {
        return Math.random() * (max - min) + min;
      }

      function randomInt(min, max) {
        return Math.floor(random(min, max + 1));
      }
    `;

    const result = this.vm.evalCode(sysInterfaceCode);
    if (result.error) {
      const errorMsg = this.vm.dump(result.error);
      console.error("Failed to setup sandbox:", errorMsg);
      throw new Error(`Sandbox setup failed: ${errorMsg}`);
    }
    result.dispose();
  }

  async loadGame(gameDefinition) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Validate and sanitize game definition
    const validation = validateGameSchema(gameDefinition);
    if (!validation.valid) {
      throw new Error(`Invalid game definition: ${validation.errors.join(', ')}`);
    }

    const sanitizedGame = sanitizeGameDefinition(gameDefinition);
    this.gameDefinition = sanitizedGame;

    // Load game into NES console first (for sprite/tile definitions)
    const nesGameDef = {
      ...sanitizedGame,
      gameLogic: (console) => {
        // This will be overridden by our QuickJS execution
        try {
          this.executeGameUpdate();
        } catch (error) {
          console.error("Game update error:", error);
        }
      }
    };

    this.nesConsole.loadGame(nesGameDef);

    // Initialize game state in QuickJS
    const gameStateCode = `
      gameState = ${JSON.stringify(sanitizedGame.initialState || {})};
    `;

    const stateResult = this.vm.evalCode(gameStateCode);
    if (stateResult.error) {
      const errorMsg = this.vm.dump(stateResult.error);
      throw new Error(`Failed to initialize game state: ${errorMsg}`);
    }
    stateResult.dispose();

    // Load game update function
    const updateFunctionCode = `
      const update = ${sanitizedGame.updateCode};
      globalThis._gameUpdate = update;
    `;

    const updateResult = this.vm.evalCode(updateFunctionCode);
    if (updateResult.error) {
      const errorMsg = this.vm.dump(updateResult.error);
      throw new Error(`Failed to load game update function: ${errorMsg}`);
    }
    updateResult.dispose();

    console.log("Game loaded successfully into QuickJS sandbox");
  }

  executeGameUpdate() {
    if (!this.vm || !this.gameDefinition) return;

    try {
      // Inject NES console reference into QuickJS global
      const globalThis = this.vm.global;
      const consoleProxy = {
        setSprite: (slotId, spriteId, x, y) => this.nesConsole.setSprite(slotId, spriteId, x, y),
        clearSprite: (slotId) => this.nesConsole.clearSprite(slotId),
        setTile: (x, y, tileId) => this.nesConsole.setTile(x, y, tileId),
        clearTile: (x, y) => this.nesConsole.clearTile(x, y),
        setBackgroundColor: (colorIndex) => this.nesConsole.setBackgroundColor(colorIndex),
        isPressed: (button) => this.nesConsole.isPressed(button),
        justPressed: (button) => this.nesConsole.justPressed(button),
        getScore: () => this.nesConsole.getScore(),
        setScore: (score) => this.nesConsole.setScore(score),
        addScore: (points) => this.nesConsole.addScore(points)
      };

      // Set console proxy in global scope
      globalThis._nesConsole = consoleProxy;

      // Execute game update function
      const updateCode = `
        if (typeof _gameUpdate === 'function') {
          _gameUpdate(sys);
        }
      `;

      const result = this.vm.evalCode(updateCode);
      if (result.error) {
        const errorMsg = this.vm.dump(result.error);
        console.error("Game update execution error:", errorMsg);
      }
      result.dispose();

    } catch (error) {
      console.error("Failed to execute game update:", error);
    }
  }

  startGame() {
    if (this.nesConsole) {
      this.nesConsole.startGame();
    }
  }

  stopGame() {
    if (this.nesConsole) {
      this.nesConsole.stopGame();
    }
  }

  resetGame() {
    if (this.nesConsole) {
      this.nesConsole.resetGame();
    }

    // Reset game state in QuickJS
    if (this.vm && this.gameDefinition) {
      const resetCode = `
        gameState = ${JSON.stringify(this.gameDefinition.initialState || {})};
      `;

      const result = this.vm.evalCode(resetCode);
      if (result.error) {
        console.error("Failed to reset game state:", this.vm.dump(result.error));
      }
      result.dispose();
    }
  }

  dispose() {
    if (this.vm) {
      this.vm.dispose();
      this.vm = null;
    }

    this.QuickJS = null;
    this.gameDefinition = null;
    this.gameState = {};
    this.isInitialized = false;
  }
}

// Global instance for easy access
let gameRunner = null;

export function getGameRunner(nesConsole) {
  if (!gameRunner) {
    gameRunner = new QuickJSGameRunner(nesConsole);
  }
  return gameRunner;
}

export function disposeGameRunner() {
  if (gameRunner) {
    gameRunner.dispose();
    gameRunner = null;
  }
}