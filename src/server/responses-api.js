import { createGameGenerationPrompt, parseMarkdownResponse } from '../shared/game-prompt.js';
import { HeadlessGameRunner } from './headless-game-runner.js';

export class ResponsesAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1/responses';
    this.gameRunner = new HeadlessGameRunner();
  }

  async createResponse(description, model = 'gpt-5', previousGame = null) {
    const prompt = createGameGenerationPrompt(description, previousGame);

    console.log(`Creating OpenAI response with model ${model}:`, description.substring(0, 100) + '...');

    const requestBody = {
      model,
      input: prompt,
      instructions: 'You are a retro game designer that creates NES-style games. You must respond with a single JavaScript block in markdown format (```javascript) containing three functions: metadata(), resources(), and update().',
      max_output_tokens: 24000,
      background: true
    };

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Responses API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    console.log(`OpenAI response created with ID: ${data.id}, status: ${data.status}`);

    return {
      id: data.id,
      status: data.status,
      model
    };
  }

  async getResponse(responseId) {
    console.log(`Checking OpenAI response status: ${responseId}`);

    const response = await fetch(`${this.baseURL}/${responseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI status check failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    console.log(`OpenAI response ${responseId} status: ${data.status}`,
      data.status === 'completed' ? '(has output)' : '',
      'Full response keys:', Object.keys(data));

    // Handle completed response
    if (data.status === 'completed' || data.status === 'complete') {
      // OpenAI Responses API format: find the message item in output array
      const messageItem = data.output?.find(item => item.type === 'message');
      const outputText = messageItem?.content?.[0]?.text;

      if (outputText && typeof outputText === 'string') {
        const gameDefinition = parseMarkdownResponse(outputText);
        console.log(`Successfully parsed game definition for response ${responseId}`);

        // Extract metadata by running game code in QuickJS
        const metadata = await this.gameRunner.extractMetadata(gameDefinition.gameCode);
        gameDefinition.metadata = metadata;
        console.log(`Extracted metadata for response ${responseId}:`, metadata?.title);

        return {
          status: 'completed',
          gameDefinition
        };
      } else {
        console.error(`Response ${responseId} marked complete but no text at output[0].content[0].text`);
        console.error('Response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
        return {
          status: 'failed',
          error: 'No text found in completed response at expected path output[0].content[0].text'
        };
      }
    }

    // Handle failed response
    if (data.status === 'failed') {
      const errorMessage = data.error || 'Unknown error from OpenAI';
      console.error(`OpenAI response ${responseId} failed:`, errorMessage);

      return {
        status: 'failed',
        error: errorMessage
      };
    }

    // Handle cancelled response
    if (data.status === 'cancelled') {
      console.error(`OpenAI response ${responseId} was cancelled`);

      return {
        status: 'failed',
        error: 'Response was cancelled'
      };
    }

    // Handle incomplete response (error state)
    if (data.status === 'incomplete') {
      const reason = data.incomplete_details?.reason || 'Unknown reason';
      console.error(`OpenAI response ${responseId} incomplete:`, reason, data.incomplete_details);

      return {
        status: 'failed',
        error: `Response incomplete: ${reason}`
      };
    }

    // Handle in-progress statuses (queued, in_progress)
    let outputInfo = 'none';
    if (data.output) {
      if (typeof data.output === 'object') {
        // Log the actual content of the object when it's small
        const jsonStr = JSON.stringify(data.output);
        if (jsonStr.length < 100) {
          outputInfo = `object: ${jsonStr}`;
        } else {
          outputInfo = `object(${jsonStr.length} chars)`;
        }
      } else {
        outputInfo = `${typeof data.output}(${data.output.length} chars)`;
      }
    }
    console.log(`Response ${responseId} not yet complete. Status: ${data.status}, Output: ${outputInfo}`);

    return {
      status: data.status, // queued, in_progress, etc.
      progress: this.calculateOpenAIProgress(data.status)
    };
  }

  calculateOpenAIProgress(status) {
    switch (status) {
      case 'queued':
        return 10;
      case 'in_progress':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 25;
    }
  }

  async cancelResponse(responseId) {
    console.log(`Cancelling OpenAI response: ${responseId}`);

    const response = await fetch(`${this.baseURL}/${responseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to cancel response ${responseId}:`, errorText);
      return false;
    }

    console.log(`Successfully cancelled OpenAI response: ${responseId}`);
    return true;
  }
}

