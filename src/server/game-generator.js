import { ResponsesAPI } from './responses-api.js';

export async function generateGameWithAI(description, settings, previousGame = null) {
  try {
    console.log("generateGameWithAI called with:", description);

    // Get OpenAI API key from Devvit settings
    const apiKey = await settings.get('openAIKey');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add your OpenAI API key in app settings.');
    }

    console.log("Generating game with OpenAI Responses API for:", description);
    const responsesAPI = new ResponsesAPI(apiKey);

    // Use gpt-5 for all generations
    const result = await responsesAPI.createResponse(description, 'gpt-5', previousGame);

    if (result.isBackground) {
      throw new Error('Background mode not supported in direct generation');
    }

    return result.gameDefinition;
  } catch (error) {
    console.error("Error in generateGameWithAI:", error);
    throw error;
  }
}


