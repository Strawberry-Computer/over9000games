// Mock @devvit/web/server for testbed mode

import { createClient } from 'redis';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { context } from './express-wrapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPath = path.resolve(__dirname, '../../../dist/client');

// Real Redis client for local development
let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[TESTBED] Redis connection failed after 10 retries');
            return new Error('Redis connection failed');
          }
          return retries * 100;
        }
      }
    });

    redisClient.on('error', (err) => console.error('[TESTBED] Redis error:', err));
    redisClient.on('connect', () => console.log('[TESTBED] Redis connected'));

    await redisClient.connect();
  }
  return redisClient;
}

// Export context from express-wrapper (already populated by middleware there)
export { context };

/**
 * Create server - in testbed mode add static file serving
 */
export function createServer(app) {
  // Serve static files from dist/client
  app.use(express.static(clientPath));

  return app;
}

/**
 * Get server port from environment
 */
export function getServerPort() {
  return process.env.PORT || 3000;
}

/**
 * Redis client wrapper to match Devvit Redis API
 */
export const redis = {
  async get(key) {
    const client = await getRedisClient();
    return await client.get(key);
  },

  async set(key, value) {
    const client = await getRedisClient();
    return await client.set(key, value);
  },

  async hSet(key, obj) {
    const client = await getRedisClient();
    return await client.hSet(key, obj);
  },

  async hGetAll(key) {
    const client = await getRedisClient();
    return await client.hGetAll(key);
  },

  async zAdd(key, { member, score }) {
    const client = await getRedisClient();
    return await client.zAdd(key, { score, value: member });
  },

  async zScore(key, member) {
    const client = await getRedisClient();
    return await client.zScore(key, member);
  },

  async zRange(key, start, stop, opts = {}) {
    const client = await getRedisClient();
    const options = {};
    if (opts.REV) options.REV = true;
    if (opts.WITHSCORES) options.WITHSCORES = true;

    const result = await client.zRange(key, start, stop, options);

    // Convert to Devvit format
    if (opts.WITHSCORES) {
      return result.flatMap(item => [item.value, item.score]);
    }
    return result.map(item => typeof item === 'object' ? item.value : item);
  },

  async zRank(key, member) {
    const client = await getRedisClient();
    return await client.zRank(key, member);
  },

  async zCard(key) {
    const client = await getRedisClient();
    return await client.zCard(key);
  },

  async zRem(key, members) {
    const client = await getRedisClient();
    return await client.zRem(key, members);
  }
};

/**
 * Mock Reddit API
 */
export const reddit = {
  async getCurrentUsername() {
    return context.userId || 'testuser';
  },

  async submitCustomPost({ title, subredditName, splash }) {
    const postId = `post_${Date.now()}`;
    console.log('[TESTBED] Created post:', {
      postId,
      title,
      subredditName,
      splash: splash ? 'with splash' : 'no splash'
    });
    return { id: postId };
  }
};

/**
 * Mock settings/secrets storage
 * In testbed mode, reads from environment variables
 */
export const settings = {
  async get(key) {
    // Map Devvit setting keys to env vars
    const keyMappings = {
      'openAIKey': 'OPENAI_API_KEY'
    };

    const envKey = keyMappings[key];
    if (envKey && process.env[envKey]) {
      return process.env[envKey];
    }

    return null;
  },

  async set(key, value) {
    console.warn('[TESTBED] settings.set() called but not persisted:', key);
  }
};
