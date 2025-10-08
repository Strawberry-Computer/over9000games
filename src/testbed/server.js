#!/usr/bin/env node

/**
 * Standalone testbed server for local development
 * Uses real Redis and mock Devvit modules via Node.js loader hooks
 *
 * Run with: node --import ./src/testbed/loader.js src/testbed/server.js
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env before importing anything else
config({ path: path.join(__dirname, '../../.env') });

console.log('🎮 Starting testbed server...');
console.log('📝 Environment:');
console.log('   - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ configured' : '✗ not set');
console.log('   - REDIS_URL:', process.env.REDIS_URL || 'redis://localhost:6379 (default)');
console.log('   - PORT:', process.env.PORT || '3000 (default)');

// Import the server - mocks are injected via loader.js
await import('../server/index.js');

console.log('\n✓ Testbed server running on http://localhost:' + (process.env.PORT || 3000));
console.log('  Game URLs: http://localhost:' + (process.env.PORT || 3000) + '?gameId=YOUR_GAME_ID');
console.log('  Make sure Redis is running: redis-server');
