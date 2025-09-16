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
    this.frameCount = 0;
    this.lastFrameTime = 0;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing QuickJS game runner...");
      this.QuickJS = await getQuickJS();
      this.vm = this.QuickJS.newContext();
      this.isInitialized = true;
      console.log("QuickJS game runner initialized successfully");
    } catch (error) {
      console.error("Failed to initialize QuickJS game runner:", error);
      throw error;
    }
  }

  async loadGame(gameDefinition) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Dispose old VM context if it exists
    if (this.vm) {
      this.vm.dispose();
      this.vm = null;
    }

    // Create fresh VM context for new game
    this.vm = this.QuickJS.newContext();

    // Validate and sanitize game definition
    const validation = validateGameSchema(gameDefinition);
    if (!validation.valid) {
      throw new Error(`Invalid game definition: ${validation.errors.join(', ')}`);
    }

    const sanitizedGame = sanitizeGameDefinition(gameDefinition);
    this.gameDefinition = sanitizedGame;

    // Load assets into NES console
    const nesGameDef = {
      ...sanitizedGame,
      gameLogic: null // Game logic handled by QuickJS
    };

    this.nesConsole.loadGame(nesGameDef);

    // Override NES console game loop
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


    // Load game code directly
    console.log("Loading game code:", sanitizedGame.updateCode?.substring(0, 100) + "...");
    const updateResult = this.vm.evalCode(sanitizedGame.updateCode);
    if (updateResult.error) {
      const errorMsg = this.vm.dump(updateResult.error);
      throw new Error(`Failed to load game code: ${errorMsg}`);
    }
    updateResult.dispose();

    console.log("Game loaded successfully into QuickJS sandbox");
  }

  executeGameUpdate() {
    if (!this.vm || !this.gameDefinition) return [];

    try {
      // Calculate delta time
      const currentTime = performance.now();
      const deltaTime = this.lastFrameTime ? (currentTime - this.lastFrameTime) / 1000 : 0;
      this.lastFrameTime = currentTime;

      // Get current input state
      const inputState = this.getInputState();

      // Execute game update function and get returned commands
      const result = this.vm.evalCode(`gameUpdate(${deltaTime}, ${JSON.stringify(inputState)})`);
      if (result.error) {
        const errorMsg = this.vm.dump(result.error);
        console.error("Game update execution error:", errorMsg);
        return [];
      }

      const commands = this.vm.dump(result.value);
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