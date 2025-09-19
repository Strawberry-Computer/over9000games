// Common prompt sections
function getFormatSection() {
  return `
<format>
You must create a single JavaScript file with three global functions: metadata(), resources(), and update().
</format>`;
}

function getExampleOutputs(pongSample, platformerSample) {
  return `
<example-output>
\`\`\`javascript
${pongSample}
\`\`\`
</example-output>

<example-output>
\`\`\`javascript
${platformerSample}
\`\`\`
</example-output>`;
}

function getRequirementsSection() {
  return `
<requirements>
- IMPORTANT: have to implement metadata(), resources(), update(deltaTime, input)
- IMPORTANT: implement fully functional game, make graphics/mechanics simple but fun
- **Sprites**: 8x8 pixels as array of 1-4 layers, each layer is 8 bytes
- **Sprite format**: \`[layer0, layer1, ...]\` where each layer is \`[byte0, byte1, ..., byte7]\`
- **Layer system**: Bits from layers combine to create palette index: \`palette_index = layer0_bit + (layer1_bit << 1) + (layer2_bit << 2) + (layer3_bit << 3)\`
- **Color options**: 1 layer = 2 colors, 2 layers = 4 colors, 3 layers = 8 colors, 4 layers = 16 colors
- **update() returns**: Command object: \`{sprites: [{spriteId: 0, x: 10, y: 20}], score: 100, gameOver: true}\`
- **Scoring**: Always include a score system - return current score as a number in update()
- **Game Over**: Include win/lose conditions - return gameOver: true when game ends
- **Module-level gameState**: Use \`let gameState;\` not globalThis
- **Input**: Use input.up, input.down, input.left, input.right, input.a, input.b
- **Complex games**: Can have complex gameState (like Tetris boards, enemy arrays, etc.)
</requirements>`;
}

// Common prompt creation function that accepts sample code as parameters
export function createGameGenerationPromptWithSamples(description, pongSample, platformerSample) {
  try {
    return `${getFormatSection()}${getExampleOutputs(pongSample, platformerSample)}${getRequirementsSection()}

<task>
Create a single JavaScript file following the exact same structure for: "${description}"
</task>
`;

  } catch (error) {
    console.error("Error creating game generation prompt:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

// Edit prompt creation function
export function createGameEditPromptWithSamples(editDescription, previousGame, pongSample, platformerSample) {
  try {
    return `${getFormatSection()}${getExampleOutputs(pongSample, platformerSample)}

<current-game>
GAME TO EDIT:
Title: ${previousGame.metadata?.title || 'Unknown Game'}
Description: ${previousGame.metadata?.description || 'No description'}
Original Request: ${previousGame.originalDescription || 'No original description'}

\`\`\`javascript
${previousGame.gameCode}
\`\`\`
</current-game>${getRequirementsSection()}

<task>
Edit the existing game based on this request: "${editDescription}"

Keep the same basic structure and game mechanics unless specifically asked to change them.
Return the complete modified game code, not just the changes.
</task>
`;

  } catch (error) {
    console.error("Error creating game edit prompt:", error);
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

  // Return the raw game code with isPublished: false for generated games
  return {
    gameCode,
    isPublished: false
  };
}