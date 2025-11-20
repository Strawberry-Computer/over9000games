import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import releaseVariant from "@jitl/quickjs-singlefile-cjs-release-sync";

/**
 * Headless game runner for server-side screenshot generation.
 * Runs game code in QuickJS and captures render state.
 * Uses sync variant to avoid WASM file loading issues in Devvit.
 */
export class HeadlessGameRunner {
  constructor() {
    this.vm = null;
    this.QuickJS = null;
    this.runtime = null;
  }

  async initialize() {
    if (this.QuickJS) return;

    // Use sync variant which embeds WASM - works in Devvit's server environment
    this.QuickJS = await newQuickJSWASMModuleFromVariant(releaseVariant);
    this.runtime = this.QuickJS.newRuntime();
    this.runtime.setModuleLoader(() => "");
    this.vm = this.runtime.newContext();
  }

  /**
   * Run game code and capture render state after N frames
   * @param {string} gameCode - The game JavaScript code
   * @param {number} frames - Number of frames to simulate (default 60)
   * @returns {Object} - { sprites, palette, tiles, background, spriteSlots, scroll }
   */
  async runGame(gameCode, frames = 60) {
    await this.initialize();

    // Reset VM for clean state
    if (this.vm) {
      this.vm.dispose();
    }
    this.vm = this.runtime.newContext();

    try {
      // Load and evaluate game code
      const result = this.vm.evalCode(gameCode);
      if (result.error) {
        const errorMessage = this.vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Game code error: ${errorMessage}`);
      }
      result.value.dispose();

      // Get resources (sprites, palette)
      const resources = this.callGameFunction("resources");
      if (!resources) {
        throw new Error("Game has no resources() function");
      }

      // Run update() for specified frames to let game initialize
      const deltaTime = 1000 / 60; // ~16.67ms per frame
      let lastState = null;

      for (let i = 0; i < frames; i++) {
        // Create input state (no input for screenshots)
        const input = {
          up: false,
          down: false,
          left: false,
          right: false,
          a: false,
          b: false,
          justPressed: () => false
        };

        const state = this.callGameFunction("update", deltaTime, input);
        if (state) {
          lastState = state;
        }
      }

      return {
        sprites: resources.sprites || [],
        palette: resources.palette || this.getDefaultPalette(),
        tiles: lastState?.tiles || [],
        background: lastState?.background ?? 0,
        spriteSlots: lastState?.sprites || [],
        scroll: lastState?.scroll || { x: 0, y: 0 }
      };
    } catch (error) {
      console.error("HeadlessGameRunner error:", error);
      throw error;
    }
  }

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
      result.error.dispose();
      throw new Error(`${funcName}() error: ${errorMessage}`);
    }

    const value = this.vm.dump(result.value);
    result.value.dispose();
    return value;
  }

  jsToQjs(obj) {
    const jsonStr = JSON.stringify(obj);
    const result = this.vm.evalCode(`(${jsonStr})`);
    if (result.error) {
      result.error.dispose();
      return this.vm.undefined;
    }
    return result.value;
  }

  getDefaultPalette() {
    return [
      0x000000, 0x666666, 0x888888, 0xAAAAAA, 0xCCCCCC, 0xFFFFFF,
      0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF,
      0x800000, 0x008000, 0x000080, 0x808080
    ];
  }

  dispose() {
    if (this.vm) {
      this.vm.dispose();
      this.vm = null;
    }
    if (this.runtime) {
      this.runtime.dispose();
      this.runtime = null;
    }
  }
}
