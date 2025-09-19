import { createGameGenerationPrompt, parseMarkdownResponse } from '../shared/game-prompt.js';

export async function generateGameWithAI(description, settings, previousGame = null) {
  try {
    console.log("generateGameWithAI called with:", description);

    // Get OpenAI API key from Devvit settings
    console.log("Getting OpenAI API key from settings...");
    const apiKey = await settings.get('openAIKey');
    console.log("API key retrieved:", apiKey ? "***configured***" : "not found");

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add your OpenAI API key in app settings.');
    }

    // Try Gemini first, fall back to OpenAI
    const geminiKey = await settings.get('geminiKey');
    if (geminiKey) {
      console.log("Generating game with Gemini for:", description);
      return await generateGameWithGemini(description, geminiKey, previousGame);
    }

    console.log("Generating game with OpenAI for:", description);
    return await generateGameWithOpenAI(description, apiKey, previousGame);
  } catch (error) {
    console.error("Error in generateGameWithAI:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

async function generateGameWithGemini(description, apiKey, previousGame = null) {
  const prompt = createGameGenerationPrompt(description, previousGame);

  console.log("Calling Gemini API:", prompt, 'previousGame:', !!previousGame);

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        maxOutputTokens: 8000,
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const gameJson = data.candidates[0].content.parts[0].text;

  // Parse the markdown response to extract JSON and JavaScript
  let gameDefinition;
  try {
    gameDefinition = parseMarkdownResponse(gameJson);
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", parseError);
    console.error("Response length:", gameJson.length);
    console.error("Response start (first 500 chars):", gameJson.substring(0, 500));
    console.error("Response end (last 500 chars):", gameJson.substring(gameJson.length - 500));
    console.error("Contains closing backticks:", gameJson.includes('```'));
    throw new Error("Gemini returned invalid format");
  }

  return gameDefinition;
}

async function generateGameWithOpenAI(description, apiKey, previousGame = null) {
  const prompt = createGameGenerationPrompt(description, previousGame);
  console.log("Calling OpenAI API:", prompt);

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


