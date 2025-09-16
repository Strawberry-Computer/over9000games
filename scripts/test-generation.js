#!/usr/bin/env node

/**
 * Standalone script to test game generation using different AI models via OpenRouter
 *
 * Usage:
 *   node scripts/test-generation.js [options]
 *
 * Options:
 *   --model <model>     Single AI model to test (required if --models not specified)
 *   --models <models>   Comma-separated list of models to test (required if --model not specified)
 *   --prompt <prompt>   Game description prompt (default: "a simple pong game")
 *   --output <dir>      Output directory for generated games (default: ./generated-games)
 *   --verbose           Enable verbose logging
 *
 * Environment Variables:
 *   OPENROUTER_API_KEY  OpenRouter API key (required)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGameGenerationPrompt, parseMarkdownResponse } from '../src/shared/game-prompt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    models: [],
    prompt: 'a simple pong game',
    output: './generated-games',
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--model':
        options.models = [args[++i]];
        break;
      case '--models':
        options.models = args[++i].split(',').map(m => m.trim());
        break;
      case '--prompt':
        options.prompt = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
Usage: node scripts/test-generation.js [options]

Options:
  --model <model>     Single AI model to test (required if --models not specified)
  --models <models>   Comma-separated list of models to test (required if --model not specified)
  --prompt <prompt>   Game description prompt (default: "a simple pong game")
  --output <dir>      Output directory for generated games (default: ./generated-games)
  --verbose           Enable verbose logging
  --help              Show this help message

Environment Variables:
  OPENROUTER_API_KEY  OpenRouter API key (required)

Examples:
  node scripts/test-generation.js --model openai/gpt-4o-mini --prompt "a snake game"
  node scripts/test-generation.js --models "openai/gpt-4o-mini,anthropic/claude-3.5-sonnet"
  node scripts/test-generation.js --model google/gemini-2.0-flash-exp --prompt "a space invaders clone"
        `);
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  // Validate that either --model or --models was specified
  if (options.models.length === 0) {
    console.error('Error: Either --model or --models must be specified');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  return options;
}

// Logging utility
function log(message, level = 'info', verbose = false) {
  if (level === 'verbose' && !verbose) return;

  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : level === 'verbose' ? '🔍' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// Create output directory
function ensureOutputDir(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    log(`Created output directory: ${outputDir}`);
  }
}


// Generate game using OpenRouter
async function generateWithOpenRouter(model, prompt, apiKey, verbose, outputDir) {
  log(`Generating game with ${model}...`, 'info', verbose);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/your-username/over9000games',
      'X-Title': 'Over9000Games Test Script'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a retro game designer that creates NES-style games. You must respond with a JSON block in markdown format (```json) followed by a JavaScript block (```javascript) containing the updateCode function.'
        },
        {
          role: 'user',
          content: await createGameGenerationPrompt(prompt)
        }
      ],
      max_tokens: 8000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  // 1) Get raw response and save it
  const data = await response.json();
  const responseFile = saveRawResponse(JSON.stringify(data, null, 2), model, outputDir, prompt, verbose);

  const rawResponse = data.choices[0].message.content;

  // 2) Try to parse game definition
  try {
    log(`Parsing ${model} response...`, 'verbose', verbose);
    const gameDefinition = parseMarkdownResponse(rawResponse);
    return { gameDefinition, rawResponse, responseFile };
  } catch (parseError) {
    // If error happens, dump response to console
    console.log('\n--- RAW RESPONSE BODY ---');
    console.log(rawResponse);
    console.log('--- END RAW RESPONSE ---\n');
    throw parseError;
  }
}

// ES6 game validation using dynamic import
async function validateGameDefinition(gameDefinition) {
  const errors = [];

  try {
    // Use dynamic import with data URI for ES6 modules
    const dataUri = `data:text/javascript,${encodeURIComponent(gameDefinition.gameCode)}`;
    const gameModule = await import(dataUri);

    // Test metadata
    const meta = gameModule.metadata();
    if (!meta.title) errors.push('metadata() missing title');
    if (!meta.description) errors.push('metadata() missing description');

    // Test resources
    const res = gameModule.resources();
    if (!Array.isArray(res.sprites)) errors.push('resources() sprites must be an array');
    if (!Array.isArray(res.palette)) errors.push('resources() palette must be an array');

    // Test update function
    const commands = gameModule.update(0, {});
    if (!Array.isArray(commands)) errors.push('update() must return an array');

  } catch (execError) {
    errors.push('Failed to execute gameCode: ' + execError.message);
  }

  return errors;
}

// Save generated game to file
function saveGame(gameDefinition, model, outputDir, prompt, fullPrompt, verbose) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
  const sanitizedModel = model.replace(/[^a-zA-Z0-9\-]/g, '-');

  const gameFilename = `${sanitizedModel}-${sanitizedPrompt}-${timestamp}.js`;
  const promptFilename = `${sanitizedModel}-${sanitizedPrompt}-${timestamp}-prompt.txt`;

  const gameFilepath = path.join(outputDir, gameFilename);
  const promptFilepath = path.join(outputDir, promptFilename);

  // Save ES6 game code directly
  fs.writeFileSync(gameFilepath, gameDefinition.gameCode);

  // Save full prompt sent to LLM
  fs.writeFileSync(promptFilepath, fullPrompt);

  log(`Saved game to: ${gameFilepath}`, 'success', verbose);
  log(`Saved prompt to: ${promptFilepath}`, 'success', verbose);

  return { gameFile: gameFilepath, promptFile: promptFilepath };
}

// Save raw response for debugging
function saveRawResponse(content, model, outputDir, prompt, verbose, fileType = 'response') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
  const sanitizedModel = model.replace(/[^a-zA-Z0-9\-]/g, '-');

  const filename = `${sanitizedModel}-${sanitizedPrompt}-${timestamp}-${fileType}.txt`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, content);
  log(`Saved ${fileType} to: ${filepath}`, 'verbose', verbose);

  return filepath;
}

// Main execution function
async function main() {
  const options = parseArgs();

  // Check for OpenRouter API key
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    log('OPENROUTER_API_KEY environment variable not set', 'error');
    process.exit(1);
  }

  log(`Starting game generation test with options:`, 'info');
  log(`  Models: ${options.models.join(', ')}`, 'info');
  log(`  Prompt: "${options.prompt}"`, 'info');
  log(`  Output: ${options.output}`, 'info');
  log(`  Verbose: ${options.verbose}`, 'info');

  ensureOutputDir(options.output);

  const fullPrompt = await createGameGenerationPrompt(options.prompt);

  // Test all models in parallel
  const testPromises = options.models.map(async (model) => {
    const startTime = Date.now();
    let rawResponse = null;
    let responseFile = null;

    // Always save the prompt first
    const promptFile = saveRawResponse(fullPrompt, model, options.output, options.prompt, options.verbose, 'prompt');

    try {
      const result = await generateWithOpenRouter(model, options.prompt, openrouterKey, options.verbose, options.output);
      const duration = Date.now() - startTime;

      rawResponse = result.rawResponse;
      const gameDefinition = result.gameDefinition;
      responseFile = result.responseFile;

      const validationErrors = await validateGameDefinition(gameDefinition);
      if (validationErrors.length > 0) {
        log(`${model} validation errors: ${validationErrors.join(', ')}`, 'error');
      } else {
        log(`${model} game definition is valid`, 'success');
      }

      const filepaths = saveGame(gameDefinition, model, options.output, options.prompt, fullPrompt, options.verbose);

      log(`${model} generation completed in ${duration}ms`, 'success');

      return {
        model,
        success: true,
        duration,
        validationErrors,
        filepaths: { ...filepaths, responseFile, promptFile },
        gameDefinition
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      log(`${model} generation failed: ${error.message}`, 'error');

      return {
        model,
        success: false,
        error: error.message,
        duration,
        responseFile,
        promptFile
      };
    }
  });

  // Wait for all models to complete
  const testResults = await Promise.all(testPromises);

  // Convert to results object
  const results = {};
  testResults.forEach(result => {
    const { model, ...rest } = result;
    results[model] = rest;
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('GENERATION TEST SUMMARY');
  console.log('='.repeat(60));

  for (const [model, result] of Object.entries(results)) {
    console.log(`\n${model}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (result.success) {
      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Validation errors: ${result.validationErrors.length}`);
      console.log(`  Game file: ${result.filepaths.gameFile}`);
      console.log(`  Prompt file: ${result.filepaths.promptFile}`);
      console.log(`  Game: ${result.gameDefinition.name}`);
    } else {
      console.log(`  Error: ${result.error}`);
    }
  }

  // Exit with error code if any generation failed
  const anyFailed = Object.values(results).some(result => !result.success);
  process.exit(anyFailed ? 1 : 0);
}

// Run the script
main().catch(error => {
  log(`Script failed: ${error.message}`, 'error');
  process.exit(1);
});