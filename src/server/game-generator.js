export async function generateGameWithAI(description, settings) {
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
      model: 'gpt-4o-mini', // Using cheaper/faster model
      messages: [
        {
          role: 'system',
          content: 'You are a retro game designer that creates NES-style games. You must respond with valid JSON only, no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
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
  return `Create a NES-style game based on: "${description}"

Return your response in this exact format with JSON config and JavaScript code in separate markdown blocks:

\`\`\`json
{
  "metadata": {
    "title": "Game Title",
    "description": "Brief description",
    "controls": [
      {"key": "arrow keys", "action": "move"},
      {"key": "a", "action": "action"}
    ]
  },
  "sprites": {
    "player": {
      "id": "player",
      "width": 8,
      "height": 8,
      "layers": [
        [255,129,129,129,129,129,129,255],
        [0,126,66,66,66,66,126,0],
        [0,0,60,36,36,60,0,0],
        [0,0,0,24,24,0,0,0]
      ]
    }
  },
  "tiles": {
    "wall": {
      "id": "wall",
      "width": 8,
      "height": 8,
      "layers": [
        [255,255,255,255,255,255,255,255],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0]
      ]
    }
  },
  "palette": ["0x000000", "0x666666", "0x888888", "0xAAAAAA", "0xCCCCCC", "0xFFFFFF", "0xFF0000", "0x00FF00", "0x0000FF", "0xFFFF00", "0xFF00FF", "0x00FFFF", "0x800000", "0x008000", "0x000080", "0x808080"],
  "initialState": {}
}
\`\`\`

\`\`\`javascript
function(sys) {
  if (!globalThis.gameState) {
    globalThis.gameState = {
      player: { x: 120, y: 120 }
    };
  }

  if (sys.isPressed('up')) globalThis.gameState.player.y -= 2;
  if (sys.isPressed('down')) globalThis.gameState.player.y += 2;
  if (sys.isPressed('left')) globalThis.gameState.player.x -= 2;
  if (sys.isPressed('right')) globalThis.gameState.player.x += 2;

  sys.setSprite(0, 'player', globalThis.gameState.player.x, globalThis.gameState.player.y);
}
\`\`\`

Requirements:
- 8x8 sprites with 4 layers (arrays of 8 numbers each, 0-255)
- Use hex strings in palette like "0xFF0000"
- sys.setSprite(slot, id, x, y), sys.isPressed('up'/'down'/'left'/'right'/'a'/'b')
- Keep it simple but fun!`;
}

