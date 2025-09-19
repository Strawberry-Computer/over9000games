// Import test game code as raw text for bundling
import pongCode from './test-games/pong.js?raw';
import platformerCode from './test-games/platformer.js?raw';
import { createGameGenerationPromptWithSamples, createGameEditPromptWithSamples } from './game-prompt-common.js';

// Vite-compatible version using raw imports
export function createGameGenerationPrompt(description, previousGame = null) {
  console.log("Test games loaded successfully");
  if (previousGame) {
    return createGameEditPromptWithSamples(description, previousGame, pongCode, platformerCode);
  }
  return createGameGenerationPromptWithSamples(description, pongCode, platformerCode);
}

// Re-export parseMarkdownResponse from common module
export { parseMarkdownResponse } from './game-prompt-common.js';