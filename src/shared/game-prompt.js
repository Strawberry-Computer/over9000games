// Import test game code as raw text for bundling
import simpleMovementCode from './test-games/simple-movement.js?raw';
import pongCode from './test-games/pong.js?raw';

export function createGameGenerationPrompt(description) {
  try {
    console.log("Creating game generation prompt for:", description);

    console.log("Test games loaded successfully");

    return `Create a NES-style game based on: "${description}"

## JavaScript File Format - Single JavaScript File

You must create a single JavaScript file with three global functions: metadata(), resources(), and update().

### Simple Movement Example:
\`\`\`javascript
${simpleMovementCode}
\`\`\`

### Pong Example (multi-sprite game):
\`\`\`javascript
${pongCode}
\`\`\`

## Key Requirements:
- **Three functions**: metadata(), resources(), update(deltaTime, input)
- **Sprites**: 8x8 pixels as array of layers, each layer is 8 bytes
- **Sprite format**: \`[layer0, layer1, ...]\` where each layer is \`[byte0, byte1, ..., byte7]\`
- **update() returns**: Command arrays like [{type: 'sprite', slotId: 0, spriteId: 0, x: 10, y: 20}]
- **Module-level gameState**: Use \`let gameState;\` not globalThis
- **Input**: Use input.up, input.down, input.left, input.right, input.a, input.b
- **Complex games**: Can have complex gameState (like Tetris boards)

## Your Task
Create a single JavaScript file following the exact same structure for: "${description}"`;

  } catch (error) {
    console.error("Error creating game generation prompt:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

export function parseMarkdownResponse(response) {
  // Extract single JavaScript block (global functions format)
  const jsMatch = response.match(/```javascript\s*([\s\S]*?)\s*```/);
  if (!jsMatch) {
    throw new Error("No JavaScript block found in response");
  }

  const gameCode = jsMatch[1].trim();
  console.log("Extracted JavaScript code:", gameCode.substring(0, 200) + "...");

  // Return the raw game code - it will be executed via QuickJS like test games
  return { gameCode };
}