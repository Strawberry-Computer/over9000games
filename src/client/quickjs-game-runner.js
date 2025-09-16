import { getQuickJS, RELEASE_SYNC } from "quickjs-emscripten";
import { validateGameSchema, sanitizeGameDefinition } from "../shared/game-schema.js";

export class QuickJSGameRunner {
  constructor(nesConsole) {
    this.nesConsole = nesConsole;
    this.vm = null;
    this.QuickJS = null;
    this.gameDefinition = null;
    this.gameState = {};
    this.isInitialized = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing QuickJS game runner...");
      this.QuickJS = await getQuickJS();

      // Set up module loader for ES6 modules
      this.runtime = this.QuickJS.newRuntime({ variant: RELEASE_SYNC });
      this.runtime.setModuleLoader((moduleName) => {
        console.log("Module loader called for:", moduleName);
        // Return empty string or handle module loading if needed
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

  async loadCode(gameCode) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Dispose old VM context if it exists
    if (this.vm) {
      this.vm.dispose();
      this.vm = null;
    }

    // Create fresh VM context for new game (reuse existing runtime)
    this.vm = this.runtime.newContext();

    // Load the game code as regular JavaScript (not ES6 module)
    console.log("Loading game code into QuickJS VM...");

    // Evaluate the game code directly
    const result = this.vm.evalCode(gameCode, "game.js");
    if (result.error) {
      const errorMsg = this.vm.dump(result.error);
      result.dispose();
      throw new Error(`Failed to load game code: ${errorMsg}`);
    }
    result.dispose();

    // Get the exported functions from the global scope
    const metadataHandle = this.vm.getProp(this.vm.global, "metadata");
    const resourcesHandle = this.vm.getProp(this.vm.global, "resources");
    const updateHandle = this.vm.getProp(this.vm.global, "update");

    if (!metadataHandle || !resourcesHandle || !updateHandle) {
      throw new Error("Game code must define metadata, resources, and update functions");
    }

    // Call the functions to get data
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

    // Store the update function handle for runtime execution
    this.updateFunction = updateHandle;

    // Clean up temporary results
    metadataResult.dispose();
    resourcesResult.dispose();
    metadataHandle.dispose();
    resourcesHandle.dispose();

    // Load sprites and palette into NES console
    const nesGameDef = {
      metadata,
      ...resources,
      gameLogic: null // Game logic handled by QuickJS
    };

    this.nesConsole.loadGame(nesGameDef);

    // Override NES console game loop to use update() function
    const originalGameLoop = this.nesConsole.gameLoop;
    this.nesConsole.gameLoop = () => {
      if (!this.nesConsole.state.gameRunning) return;

      this.nesConsole.updateInput();

      // Execute QuickJS game logic and get commands
      try {
        const commands = this.executeGameUpdate();
        this.processCommands(commands);
      } catch (error) {
        console.error("Game update error:", error);
      }

      this.nesConsole.render();
      this.nesConsole.animationId = requestAnimationFrame(this.nesConsole.gameLoop);
    };

    console.log("Game loaded successfully:", metadata.title);
  }

  executeGameUpdate() {
    if (!this.vm || !this.updateFunction) return [];

    try {
      // Calculate delta time
      const currentTime = performance.now();
      const deltaTime = this.lastFrameTime ? (currentTime - this.lastFrameTime) / 1000 : 0;
      this.lastFrameTime = currentTime;

      // Get current input state
      const inputState = this.getInputState();

      // Create JS values for the parameters
      const deltaTimeHandle = this.vm.newNumber(deltaTime);
      const inputStateHandle = this.vm.newObject();

      // Set input state properties
      Object.entries(inputState).forEach(([key, value]) => {
        const keyHandle = this.vm.newString(key);
        const valueHandle = this.vm.newNumber(value ? 1 : 0);
        this.vm.setProp(inputStateHandle, keyHandle, valueHandle);
        keyHandle.dispose();
        valueHandle.dispose();
      });

      // Call the update function with QuickJS
      const result = this.vm.callFunction(this.updateFunction, this.vm.undefined, deltaTimeHandle, inputStateHandle);

      // Clean up parameters
      deltaTimeHandle.dispose();
      inputStateHandle.dispose();

      if (result.error) {
        const errorMsg = this.vm.dump(result.error);
        result.dispose();
        throw new Error(`Update function error: ${errorMsg}`);
      }

      // Get the commands array
      const commands = this.vm.dump(this.vm.unwrapResult(result));
      result.dispose();

      return Array.isArray(commands) ? commands : [];

    } catch (error) {
      console.error("Failed to execute game update:", error);
      return [];
    }
  }

  getInputState() {
    return {
      up: this.nesConsole.isPressed('up'),
      down: this.nesConsole.isPressed('down'),
      left: this.nesConsole.isPressed('left'),
      right: this.nesConsole.isPressed('right'),
      a: this.nesConsole.isPressed('a'),
      b: this.nesConsole.isPressed('b'),
      start: this.nesConsole.isPressed('start'),
      select: this.nesConsole.isPressed('select'),
      upPressed: this.nesConsole.justPressed('up'),
      downPressed: this.nesConsole.justPressed('down'),
      leftPressed: this.nesConsole.justPressed('left'),
      rightPressed: this.nesConsole.justPressed('right'),
      aPressed: this.nesConsole.justPressed('a'),
      bPressed: this.nesConsole.justPressed('b'),
      startPressed: this.nesConsole.justPressed('start'),
      selectPressed: this.nesConsole.justPressed('select')
    };
  }


  processCommands(commands) {
    if (!Array.isArray(commands)) return;

    for (const cmd of commands) {
      try {
        switch (cmd.type) {
          case 'sprite':
            this.nesConsole.setSprite(cmd.slotId, cmd.spriteId, cmd.x, cmd.y);
            break;

          case 'clearSprite':
            this.nesConsole.clearSprite(cmd.slotId);
            break;

          case 'tile':
            this.nesConsole.setTile(cmd.x, cmd.y, cmd.tileId);
            break;

          case 'clearTile':
            this.nesConsole.clearTile(cmd.x, cmd.y);
            break;

          case 'background':
            this.nesConsole.setBackgroundColor(cmd.colorIndex);
            break;

          case 'score':
            this.nesConsole.setScore(cmd.value);
            break;

          case 'sound':
            // TODO: Implement sound system
            console.log('Sound:', cmd.soundId);
            break;

          default:
            console.warn('Unknown command type:', cmd.type);
        }
      } catch (error) {
        console.error('Error processing command:', cmd, error);
      }
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

    // Reset timing
    this.lastFrameTime = 0;
    this.frameCount = 0;
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