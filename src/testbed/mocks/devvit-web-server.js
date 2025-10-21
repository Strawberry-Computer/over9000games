// Mock @devvit/web/server for testbed mode

import { createClient } from 'redis';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { context } from './express-wrapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPath = path.resolve(__dirname, '../../../dist/client');
const indexPath = path.resolve(clientPath, 'index.html');

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
 * Serve client HTML with query parameters
 */
async function serveClient(res, queryParams = '') {
  try {
    let html = await fs.readFile(indexPath, 'utf-8');
    // Inject query params into the URL for client-side routing
    if (queryParams) {
      html = html.replace(
        '</head>',
        `<script>
          // Inject query params for client-side routing
          if (!window.location.search) {
            window.history.replaceState({}, '', window.location.pathname + '${queryParams}');
          }
        </script>
        </head>`
      );
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('[TESTBED] Error serving client:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
}

/**
 * Create server - in testbed mode add subreddit routes and static file serving
 */
export function createServer(app) {
  // Redirect home to subreddit
  app.get('/', (req, res) => {
    res.redirect('/r/testbed');
  });

  // New game submission page - serve client for game creation
  app.get('/r/testbed/submit', (req, res) => {
    serveClient(res, '?create=true');
  });

  // Subreddit feed
  app.get('/r/testbed', async (req, res) => {
    try {
      const client = await getRedisClient();

      // Get all posts sorted by creation time (newest first)
      const postIds = await client.zRange('testbed:posts', 0, -1, { REV: true });

      const games = [];
      for (const postIdObj of postIds) {
        const postId = typeof postIdObj === 'object' ? postIdObj.value : postIdObj;

        const [title, created, creator] = await Promise.all([
          client.get(`post:${postId}:title`),
          client.get(`post:${postId}:created`),
          client.get(`post:${postId}:creator`)
        ]);

        if (title) {
          games.push({
            postId,
            title,
            created,
            creator,
            url: `/r/testbed/comments/${postId}`
          });
        }
      }

      const html = generateSubredditHTML(games);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);

    } catch (error) {
      console.error('[TESTBED] Error loading subreddit:', error);
      res.status(500).send(`Error: ${error.message}`);
    }
  });

  // Game post page - serve client with gameId parameter
  app.get('/r/:subreddit/comments/:postId', (req, res) => {
    const { postId } = req.params;
    console.log(`[TESTBED] Loading game: ${postId}`);
    serveClient(res, `?gameId=${postId}`);
  });

  // Serve static files from dist/client (must be last)
  app.use(express.static(clientPath));

  return app;
}

/**
 * Generate subreddit feed HTML
 */
function generateSubredditHTML(games) {
  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };

  const formatTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return dateStr;
    }
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <title>r/testbed - Testbed Games</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #030303;
      color: #d7dadc;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      background: #1a1a1b;
      border-bottom: 1px solid #343536;
      padding: 16px 20px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .subreddit-title {
      font-size: 18px;
      font-weight: 700;
      color: #e7e7e7;
    }
    .new-btn {
      background: #818384;
      color: #000;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .new-btn:hover {
      background: #a6a6a6;
    }
    .post {
      background: #1a1a1b;
      border: 1px solid #343536;
      border-radius: 4px;
      margin: 12px 0;
      overflow: hidden;
      transition: all 0.2s;
    }
    .post:hover {
      border-color: #818384;
      background: #262626;
    }
    .post-content {
      padding: 12px 16px;
      display: flex;
      gap: 12px;
    }
    .post-title {
      font-size: 18px;
      font-weight: 600;
      color: #d7dadc;
      margin-bottom: 8px;
      text-decoration: none;
      display: block;
      transition: color 0.2s;
    }
    .post a:hover .post-title {
      color: #818384;
    }
    .post-meta {
      font-size: 12px;
      color: #818384;
      margin-bottom: 10px;
    }
    .post-meta strong {
      color: #d7dadc;
    }
    .post-link {
      display: inline-block;
      color: #818384;
      text-decoration: none;
      font-size: 14px;
      padding: 8px 12px;
      background: #262626;
      border-radius: 20px;
      transition: all 0.2s;
    }
    .post-link:hover {
      background: #343536;
      color: #d7dadc;
    }
    .empty {
      text-align: center;
      padding: 60px 20px;
      color: #818384;
    }
    .empty-title {
      font-size: 20px;
      font-weight: 600;
      color: #d7dadc;
      margin-bottom: 8px;
    }
    .content {
      padding: 12px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-top">
        <div class="subreddit-title">r/testbed</div>
        <a href="/r/testbed/submit" class="new-btn">+ New Game</a>
      </div>
    </div>

    <div class="content">
      ${games.length === 0 ? `
        <div class="empty" style="margin-top: 100px;">
          <div class="empty-title">No games yet</div>
          <p>Create and publish your first game!</p>
        </div>
      ` : games.map(game => `
        <div class="post">
          <a href="${game.url}" style="text-decoration: none; color: inherit;">
            <div class="post-content">
              <div style="flex: 1;">
                <div class="post-title">${escapeHtml(game.title)}</div>
                <div class="post-meta">
                  Posted by <strong>u/${escapeHtml(game.creator)}</strong> • ${formatTime(game.created)}
                </div>
                <a href="${game.url}" class="post-link">Play Game →</a>
              </div>
            </div>
          </a>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `;
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

    // In testbed mode, store post metadata for the feed page
    try {
      const client = await getRedisClient();
      const now = new Date().toISOString();
      const creator = context.userId || 'testuser';

      // Store post metadata
      await Promise.all([
        client.set(`post:${postId}:title`, title),
        client.set(`post:${postId}:created`, now),
        client.set(`post:${postId}:creator`, creator),
        // Add to sorted set for feed listing (score = timestamp for reverse chronological order)
        client.zAdd(`testbed:posts`, { score: Date.now(), value: postId })
      ]);
      console.log('[TESTBED] Stored post metadata for:', postId);
    } catch (err) {
      console.error('[TESTBED] Error storing post metadata:', err);
    }

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
