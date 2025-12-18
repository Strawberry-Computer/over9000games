import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import releaseVariant from "@jitl/quickjs-singlefile-cjs-release-sync";
import {
  QuickJSGameExecutor,
  getSpritePosition,
  getDefaultPalette
} from "../shared/game-runner-common.js";

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
    this.executor = null;
  }

  async initialize() {
    if (this.QuickJS) return;

    // Use sync variant which embeds WASM - works in Devvit's server environment
    this.QuickJS = await newQuickJSWASMModuleFromVariant(releaseVariant);
    this.runtime = this.QuickJS.newRuntime();
    this.runtime.setModuleLoader(() => "");
    this.vm = this.runtime.newContext();
    this.executor = new QuickJSGameExecutor(this.vm, this.QuickJS);
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
    this.executor = new QuickJSGameExecutor(this.vm, this.QuickJS);

    try {
      // Load and evaluate game code using shared executor
      const { metadata, resources, updateHandle } = this.executor.loadGameCode(gameCode);

      // Run update() for specified frames to let game initialize
      const deltaTime = 1000 / 60; // ~16.67ms per frame
      let lastState = null;

      const input = QuickJSGameExecutor.createInputState({}, {});

      for (let i = 0; i < frames; i++) {
        const state = this.executor.callUpdate(updateHandle, deltaTime, input);
        if (state) {
          lastState = state;
        }
      }

      // Cleanup
      updateHandle.dispose();

      return {
        metadata: metadata || {},
        sprites: resources.sprites || [],
        palette: resources.palette || getDefaultPalette(),
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

  /**
   * Extract metadata from game code without running frames
   * @param {string} gameCode - The game JavaScript code
   * @returns {Object} - { title, description, controls }
   */
  async extractMetadata(gameCode) {
    await this.initialize();

    // Reset VM for clean state
    if (this.vm) {
      this.vm.dispose();
    }
    this.vm = this.runtime.newContext();
    this.executor = new QuickJSGameExecutor(this.vm, this.QuickJS);

    try {
      const { metadata, updateHandle } = this.executor.loadGameCode(gameCode);
      updateHandle.dispose();
      return metadata || {};
    } catch (error) {
      console.error("HeadlessGameRunner extractMetadata error:", error);
      throw error;
    }
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
