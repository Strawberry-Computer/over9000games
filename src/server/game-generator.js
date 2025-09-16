import { getTestGame } from '../shared/test-games.js';

export async function generateGameWithAI(description, settings) {
  try {
    console.log("generateGameWithAI called with:", description);

    // Get OpenAI API key from Devvit settings
    console.log("Getting OpenAI API key from settings...");
    const apiKey = await settings.get('openAIKey');
    console.log("API key retrieved:", apiKey ? "***configured***" : "not found");

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add your OpenAI API key in app settings.');
    }

    console.log("Generating game with OpenAI for:", description);
    return await generateGameWithOpenAI(description, apiKey);
  } catch (error) {
    console.error("Error in generateGameWithAI:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

async function generateGameWithOpenAI(description, apiKey) {
  const prompt = createGameGenerationPrompt(description);

  console.log("Calling OpenAI API...");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-nano', // Using faster model
      messages: [
        {
          role: 'system',
          content: 'You are a retro game designer that creates NES-style games. You must respond with a JSON block in markdown format (```json) followed by a JavaScript block (```javascript) containing the updateCode function.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 9000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const gameJson = data.choices[0].message.content;

  // Parse the markdown response to extract JSON and JavaScript
  let gameDefinition;
  try {
    gameDefinition = parseMarkdownResponse(gameJson);
  } catch (parseError) {
    console.error("Failed to parse OpenAI response:", parseError);
    console.error("Raw response:", gameJson);
    throw new Error("OpenAI returned invalid format");
  }

  return gameDefinition;
}

function parseMarkdownResponse(response) {
  // Extract JSON block
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    throw new Error("No JSON block found in response");
  }

  // Extract JavaScript block
  const jsMatch = response.match(/```javascript\s*([\s\S]*?)\s*```/);
  if (!jsMatch) {
    throw new Error("No JavaScript block found in response");
  }

  const jsonString = jsonMatch[1].trim();
  console.log("Extracted JSON string:", jsonString);

  const gameConfig = JSON.parse(jsonString);
  const updateCode = jsMatch[1].trim();

  // Convert hex strings to numbers in palette
  if (gameConfig.palette) {
    gameConfig.palette = gameConfig.palette.map(hexString =>
      typeof hexString === 'string' ? parseInt(hexString, 16) : hexString
    );
  }

  // Combine the config with the updateCode
  return {
    ...gameConfig,
    updateCode: updateCode
  };
}

function createGameGenerationPrompt(description) {
  try {
    console.log("Creating game generation prompt for:", description);

    // Use imported test games as examples
    const simpleMovement = getTestGame('simple-movement');
    const pong = getTestGame('pong');

    console.log("Test games loaded successfully:", simpleMovement?.metadata?.title, pong?.metadata?.title);

  return `Create a NES-style game based on: "${description}"

## Examples from our test games:

### Simple Movement Game:
\`\`\`json
${JSON.stringify({...simpleMovement, updateCode: undefined}, null, 2)}
\`\`\`

\`\`\`javascript
${simpleMovement.updateCode}
\`\`\`

### Pong Game (multi-sprite objects):
\`\`\`json
${JSON.stringify({...pong, updateCode: undefined}, null, 2)}
\`\`\`

\`\`\`javascript
${pong.updateCode}
\`\`\`

## Key Features You Must Follow:
- **gameUpdate(deltaTime, input)** function that returns command arrays
- **Sprites**: 8x8 pixels with 4 layers of hex bytes (e.g., [0xFF, 0x81, ...])
- **Commands**: Return arrays like [{type: 'sprite', slotId: 0, spriteId: 0, x: 10, y: 20}]
- **Multi-sprite objects**: Use multiple sprites for larger objects (see pong paddles)
- **initialState**: Can include complex game state like Tetris boards:
  \`"initialState": {"board": Array(20).fill().map(() => Array(10).fill(0))}\`

## Your Task
Follow the same structure to create a game for: "${description}"`;

  } catch (error) {
    console.error("Error creating game generation prompt:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

