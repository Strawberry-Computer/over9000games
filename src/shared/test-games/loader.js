import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function loadTestGame(gameName) {
  try {
    // Load JSON config
    const configPath = join(__dirname, `${gameName}.json`);
    const configContent = readFileSync(configPath, 'utf8');
    const gameConfig = JSON.parse(configContent);

    // Load JavaScript update code
    const codePath = join(__dirname, `${gameName}.js`);
    const updateCode = readFileSync(codePath, 'utf8');

    // Convert hex strings to numbers in palette
    if (gameConfig.palette) {
      gameConfig.palette = gameConfig.palette.map(hexString =>
        typeof hexString === 'string' ? parseInt(hexString, 16) : hexString
      );
    }

    // Combine config with update code
    return {
      ...gameConfig,
      updateCode: updateCode
    };
  } catch (error) {
    throw new Error(`Failed to load test game "${gameName}": ${error.message}`);
  }
}

export function getAvailableTestGames() {
  return ['simple-movement', 'pong'];
}