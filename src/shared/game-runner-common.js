/**
 * Shared game runner utilities for both client and headless execution.
 * Contains common QuickJS management, error handling, and helper functions.
 */

/**
 * Get sprite position in sprite sheet from sprite ID
 * @param {number} spriteId - The sprite ID (0-511)
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export function getSpritePosition(spriteId) {
  const x = ((spriteId | 0) % 16) * 8;  // 16 sprites per row (128px ÷ 8px)
  const y = Math.floor((spriteId | 0) / 16) * 8;
  return { x, y, width: 8, height: 8 };
}

/**
 * Get default NES-style color palette
 * @returns {number[]} Array of 16 color values
 */
export function getDefaultPalette() {
  return [
    0x000000, 0x666666, 0x888888, 0xAAAAAA, 0xCCCCCC, 0xFFFFFF,
    0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF,
    0x800000, 0x008000, 0x000080, 0x808080
  ];
}

/**
 * Wrap game code with error handling to prevent crashes
 * @param {string} gameCode - The original game code
 * @returns {string} - Wrapped game code with doUpdate() function
 */
export function wrapGameCode(gameCode) {
  return `
${gameCode}

function doUpdate(deltaTime, input) {
  try {
    return update(deltaTime, input);
  } catch (error) {
    return {
      sprites: [],
      score: 0,
      gameOver: true,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    };
  }
}
`;
}

/**
 * QuickJS game executor - manages VM lifecycle and game function calls.
 * This class abstracts QuickJS operations for both client and server.
 */
export class QuickJSGameExecutor {
  constructor(vm, QuickJS) {
    this.vm = vm;
    this.QuickJS = QuickJS;
  }

  /**
   * Load and evaluate game code in the VM
   * @param {string} gameCode - The game JavaScript code
   * @returns {{metadata: Object, resources: Object, updateHandle: any}}
   */
  loadGameCode(gameCode) {
    // Wrap with error handling
    const wrappedCode = wrapGameCode(gameCode);

    // Evaluate code
    const result = this.vm.evalCode(wrappedCode, "game.js");
    if (result.error) {
      const errorMsg = this.vm.dump(this.vm.unwrapResult ? this.vm.unwrapResult(result.error) : result.error);
      result.dispose();
      throw new Error(`Failed to load game code: ${errorMsg}`);
    }
    result.dispose();

    // Get function handles
    const metadataHandle = this.vm.getProp(this.vm.global, "metadata");
    const resourcesHandle = this.vm.getProp(this.vm.global, "resources");
    const updateHandle = this.vm.getProp(this.vm.global, "doUpdate");

    if (!metadataHandle || !resourcesHandle || !updateHandle) {
      throw new Error("Game code must define metadata, resources, and update functions");
    }

    // Call metadata and resources
    const metadataResult = this.vm.callFunction(metadataHandle, this.vm.undefined);
    const resourcesResult = this.vm.callFunction(resourcesHandle, this.vm.undefined);

    if (metadataResult.error || resourcesResult.error) {
      const errorMsg = metadataResult.error
        ? this.vm.dump(this.vm.unwrapResult ? this.vm.unwrapResult(metadataResult) : metadataResult.error)
        : this.vm.dump(this.vm.unwrapResult ? this.vm.unwrapResult(resourcesResult) : resourcesResult.error);
      metadataResult.dispose();
      resourcesResult.dispose();
      throw new Error(`Failed to call game functions: ${errorMsg}`);
    }

    const metadata = this.vm.dump(this.vm.unwrapResult ? this.vm.unwrapResult(metadataResult) : metadataResult.value);
    const resources = this.vm.dump(this.vm.unwrapResult ? this.vm.unwrapResult(resourcesResult) : resourcesResult.value);

    // Cleanup
    metadataResult.dispose();
    resourcesResult.dispose();
    metadataHandle.dispose();
    resourcesHandle.dispose();

    return { metadata, resources, updateHandle };
  }

  /**
   * Call the update function with deltaTime and input
   * @param {any} updateHandle - QuickJS function handle
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {Object} input - Input state object
   * @returns {Object} - Game state commands
   */
  callUpdate(updateHandle, deltaTime, input) {
    const deltaTimeHandle = this.vm.newNumber(deltaTime);
    const inputStateHandle = this.jsToQjs(input);

    const result = this.vm.callFunction(updateHandle, this.vm.undefined, deltaTimeHandle, inputStateHandle);

    deltaTimeHandle.dispose();
    inputStateHandle.dispose();

    if (result.error) {
      const errorMsg = this.vm.dump(this.vm.unwrapResult ? this.vm.unwrapResult(result) : result.error);
      result.dispose();
      throw new Error(`Update function error: ${errorMsg}`);
    }

    const commands = this.vm.dump(this.vm.unwrapResult ? this.vm.unwrapResult(result) : result.value);
    result.dispose();

    // Check if JS-side try-catch caught an error
    if (commands && commands.error) {
      throw new Error(`Game runtime error: ${commands.error.message}\nStack: ${commands.error.stack}`);
    }

    return commands;
  }

  /**
   * Call a game function by name
   * @param {string} funcName - Function name (e.g., "metadata", "resources")
   * @param {...any} args - Arguments to pass
   * @returns {any} - Function return value
   */
  callGameFunction(funcName, ...args) {
    const funcHandle = this.vm.getProp(this.vm.global, funcName);
    if (this.vm.typeof(funcHandle) !== "function") {
      funcHandle.dispose();
      return null;
    }

    // Convert args to QuickJS values
    const qjsArgs = args.map(arg => {
      if (typeof arg === "object") {
        return this.jsToQjs(arg);
      }
      return this.vm.newNumber(arg);
    });

    const result = this.vm.callFunction(funcHandle, this.vm.global, ...qjsArgs);

    // Cleanup args
    qjsArgs.forEach(arg => arg.dispose());
    funcHandle.dispose();

    if (result.error) {
      const errorMessage = this.vm.dump(result.error);
      const errorString = typeof errorMessage === 'object'
        ? JSON.stringify(errorMessage, null, 2)
        : String(errorMessage);
      result.error.dispose();
      throw new Error(`${funcName}() error: ${errorString}`);
    }

    const value = this.vm.dump(result.value);
    result.value.dispose();
    return value;
  }

  /**
   * Convert JavaScript object to QuickJS value
   * @param {Object} obj - JavaScript object
   * @returns {any} - QuickJS handle
   */
  jsToQjs(obj) {
    if (typeof obj === "object" && obj !== null) {
      const jsonStr = JSON.stringify(obj);
      const result = this.vm.evalCode(`(${jsonStr})`);
      if (result.error) {
        result.error.dispose();
        return this.vm.undefined;
      }
      return result.value;
    }
    return this.vm.undefined;
  }

  /**
   * Create input state object for game
   * @param {Object} buttonStates - Current button states
   * @param {Object} prevButtonStates - Previous button states
   * @returns {Object} - Input state for game
   */
  static createInputState(buttonStates = {}, prevButtonStates = {}) {
    const justPressed = (button) => {
      return (buttonStates[button] || false) && !(prevButtonStates[button] || false);
    };

    return {
      up: buttonStates.up || false,
      down: buttonStates.down || false,
      left: buttonStates.left || false,
      right: buttonStates.right || false,
      a: buttonStates.a || false,
      b: buttonStates.b || false,
      upPressed: justPressed('up'),
      downPressed: justPressed('down'),
      leftPressed: justPressed('left'),
      rightPressed: justPressed('right'),
      aPressed: justPressed('a'),
      bPressed: justPressed('b')
    };
  }
}

/**
 * Constants
 */
export const SCREEN_WIDTH = 128;
export const SCREEN_HEIGHT = 128;
export const SPRITE_SIZE = 8;
export const MAX_SPRITES = 64;
export const MAX_TILES_X = 128;
export const MAX_TILES_Y = 16;
