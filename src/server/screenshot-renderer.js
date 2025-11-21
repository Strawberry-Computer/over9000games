import { PNG } from "pngjs";
import { getSpritePosition } from "../shared/game-runner-common.js";

const SCREEN_WIDTH = 128;
const SCREEN_HEIGHT = 128;
const SPRITE_SIZE = 8;
const SPRITE_SHEET_WIDTH = 128;
const SPRITE_SHEET_HEIGHT = 256;

/**
 * Server-side screenshot renderer using pure pixel manipulation.
 * No canvas dependency - works entirely with pixel buffers.
 */
export class ScreenshotRenderer {
  constructor() {
    // Sprite sheet: 128x256 pixels, RGBA
    this.spriteSheet = new Uint8ClampedArray(SPRITE_SHEET_WIDTH * SPRITE_SHEET_HEIGHT * 4);
    // Screen buffer: 128x128 pixels, RGBA
    this.screenBuffer = new Uint8ClampedArray(SCREEN_WIDTH * SCREEN_HEIGHT * 4);
  }

  /**
   * Render game state to PNG data URI
   * @param {Object} gameState - Output from HeadlessGameRunner.runGame()
   * @returns {string} - PNG as data URI (data:image/png;base64,...)
   */
  render(gameState) {
    const { sprites, palette, tiles, background, spriteSlots, scroll } = gameState;

    // Compile sprite sheet
    this.compileSpriteSheet(sprites, palette);

    // Clear screen with background color
    this.clearScreen(palette[background] || 0x000000);

    // Render tiles
    this.renderTiles(tiles, scroll);

    // Render sprites
    this.renderSprites(spriteSlots, scroll);

    // Encode to PNG
    return this.encodePNG();
  }

  compileSpriteSheet(sprites, palette) {
    // Clear sprite sheet
    this.spriteSheet.fill(0);

    if (!Array.isArray(sprites)) return;

    sprites.forEach((sprite, index) => {
      if (!Array.isArray(sprite) || sprite.length !== 8) return;

      const pos = getSpritePosition(index);

      for (let y = 0; y < 8; y++) {
        const row = sprite[y] || "00000000";
        for (let x = 0; x < 8; x++) {
          const colorIndex = parseInt(row[x] || "0", 16);
          const color = palette[colorIndex] || 0x000000;
          const pixelIndex = ((pos.y + y) * SPRITE_SHEET_WIDTH + (pos.x + x)) * 4;

          this.spriteSheet[pixelIndex] = (color >> 16) & 0xFF;     // R
          this.spriteSheet[pixelIndex + 1] = (color >> 8) & 0xFF;  // G
          this.spriteSheet[pixelIndex + 2] = color & 0xFF;         // B
          this.spriteSheet[pixelIndex + 3] = colorIndex === 0 ? 0 : 255; // A
        }
      }
    });
  }

  clearScreen(color) {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;

    for (let i = 0; i < this.screenBuffer.length; i += 4) {
      this.screenBuffer[i] = r;
      this.screenBuffer[i + 1] = g;
      this.screenBuffer[i + 2] = b;
      this.screenBuffer[i + 3] = 255;
    }
  }

  renderTiles(tiles, scroll) {
    if (!Array.isArray(tiles)) return;

    const scrollX = scroll?.x || 0;
    const scrollY = scroll?.y || 0;

    tiles.forEach(tile => {
      if (!tile || tile.tileId < 0) return;

      const screenX = tile.x * 8 - scrollX;
      const screenY = tile.y * 8 - scrollY;

      // Cull tiles outside viewport
      if (screenX < -8 || screenX >= SCREEN_WIDTH || screenY < -8 || screenY >= SCREEN_HEIGHT) {
        return;
      }

      this.drawSprite(tile.tileId, screenX, screenY, false, false);
    });
  }

  renderSprites(spriteSlots, scroll) {
    if (!Array.isArray(spriteSlots)) return;

    const scrollX = scroll?.x || 0;
    const scrollY = scroll?.y || 0;

    spriteSlots.forEach(sprite => {
      if (!sprite || sprite.spriteId < 0) return;

      const screenX = Math.round(sprite.x - scrollX);
      const screenY = Math.round(sprite.y - scrollY);

      // Cull sprites outside viewport
      if (screenX < -8 || screenX >= SCREEN_WIDTH || screenY < -8 || screenY >= SCREEN_HEIGHT) {
        return;
      }

      this.drawSprite(
        sprite.spriteId,
        screenX,
        screenY,
        sprite.flipH || false,
        sprite.flipV || false
      );
    });
  }

  drawSprite(spriteId, screenX, screenY, flipH, flipV) {
    const srcPos = getSpritePosition(spriteId);

    for (let sy = 0; sy < 8; sy++) {
      for (let sx = 0; sx < 8; sx++) {
        // Apply flipping
        const srcX = flipH ? (7 - sx) : sx;
        const srcY = flipV ? (7 - sy) : sy;

        // Calculate pixel positions
        const destX = screenX + sx;
        const destY = screenY + sy;

        // Bounds check
        if (destX < 0 || destX >= SCREEN_WIDTH || destY < 0 || destY >= SCREEN_HEIGHT) {
          continue;
        }

        // Get source pixel from sprite sheet
        const srcIndex = ((srcPos.y + srcY) * SPRITE_SHEET_WIDTH + (srcPos.x + srcX)) * 4;
        const alpha = this.spriteSheet[srcIndex + 3];

        // Skip transparent pixels
        if (alpha === 0) continue;

        // Copy pixel to screen buffer
        const destIndex = (destY * SCREEN_WIDTH + destX) * 4;
        this.screenBuffer[destIndex] = this.spriteSheet[srcIndex];
        this.screenBuffer[destIndex + 1] = this.spriteSheet[srcIndex + 1];
        this.screenBuffer[destIndex + 2] = this.spriteSheet[srcIndex + 2];
        this.screenBuffer[destIndex + 3] = 255;
      }
    }
  }

  encodePNG() {
    const png = new PNG({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

    // Copy screen buffer to PNG data
    for (let i = 0; i < this.screenBuffer.length; i++) {
      png.data[i] = this.screenBuffer[i];
    }

    // Encode to buffer
    const buffer = PNG.sync.write(png);

    // Convert to data URI
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }
}

/**
 * Convenience function to generate screenshot from game code
 * @param {string} gameCode - The game JavaScript code
 * @param {number} frames - Number of frames to simulate
 * @returns {Promise<string>} - PNG as data URI
 */
export async function generateScreenshot(gameCode, frames = 60) {
  const { HeadlessGameRunner } = await import("./headless-game-runner.js");

  const runner = new HeadlessGameRunner();
  const renderer = new ScreenshotRenderer();

  try {
    const gameState = await runner.runGame(gameCode, frames);
    return renderer.render(gameState);
  } finally {
    runner.dispose();
  }
}
