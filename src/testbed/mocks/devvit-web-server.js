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

    // Inject fetch interception and query params into the page
    const injectedScript = `<script>
      // Intercept fetch to automatically add postId parameter to API calls in testbed mode
      const originalFetch = window.fetch;
      window.fetch = function(resource, init) {
        // Extract postId from current URL (e.g., /r/testbed/comments/post_123)
        const pathMatch = window.location.pathname.match(/\\/comments\\/([^/]+)/);
        const postId = pathMatch ? pathMatch[1] : null;

        // Only intercept API calls that don't already have postId parameter
        if (postId && typeof resource === 'string' && resource.startsWith('/api/')) {
          const separator = resource.includes('?') ? '&' : '?';
          resource = resource + separator + 'postId=' + encodeURIComponent(postId);
          console.log('[TESTBED] Enhanced fetch URL with postId:', resource);
        }

        return originalFetch.apply(this, [resource, init]);
      };
      console.log('[TESTBED] Fetch interception installed');

      // Inject query params for client-side routing if needed
      ${queryParams ? `if (!window.location.search) {
        window.history.replaceState({}, '', window.location.pathname + '${queryParams}');
      }` : ''}
    </script>`;

    html = html.replace('</head>', injectedScript + '</head>');
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
    serveClient(res);
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

  // Game post page - serve client
  app.get('/r/:subreddit/comments/:postId', (req, res) => {
    const { postId } = req.params;
    console.log(`[TESTBED] Loading game: ${postId}`);
    // Set context for this specific request
    context.postId = postId;
    serveClient(res);
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
 * Redis client wrapper to match Devvit Redis API 100%
 */
export const redis = {
  // String commands
  async get(key) {
    const client = await getRedisClient();
    return await client.get(key);
  },

  async getBuffer(key) {
    const client = await getRedisClient();
    const value = await client.getBuffer(key);
    return value ? Buffer.from(value) : undefined;
  },

  async set(key, value, options) {
    const client = await getRedisClient();
    const opts = {};
    if (options?.nx) opts.NX = true;
    if (options?.xx) opts.XX = true;
    if (options?.expiration) {
      const expirationSeconds = Math.floor((options.expiration.getTime() - Date.now()) / 1000);
      opts.EX = Math.max(1, expirationSeconds);
    }
    const result = await client.set(key, value, opts);
    return result;
  },

  async exists(...keys) {
    const client = await getRedisClient();
    return await client.exists(...keys);
  },

  async del(...keys) {
    const client = await getRedisClient();
    return await client.del(...keys);
  },

  async incrBy(key, value) {
    const client = await getRedisClient();
    return await client.incrBy(key, value);
  },

  async getRange(key, start, end) {
    const client = await getRedisClient();
    return await client.getRange(key, start, end);
  },

  async setRange(key, offset, value) {
    const client = await getRedisClient();
    return await client.setRange(key, offset, value);
  },

  async strLen(key) {
    const client = await getRedisClient();
    return await client.strLen(key);
  },

  async expire(key, seconds) {
    const client = await getRedisClient();
    return await client.expire(key, seconds);
  },

  async expireTime(key) {
    const client = await getRedisClient();
    return await client.expireTime(key);
  },

  async mGet(keys) {
    const client = await getRedisClient();
    return await client.mGet(keys);
  },

  async mSet(keyValues) {
    const client = await getRedisClient();
    const flattenedArgs = [];
    for (const [key, value] of Object.entries(keyValues)) {
      flattenedArgs.push(key, value);
    }
    return await client.mSet(flattenedArgs);
  },

  async type(key) {
    const client = await getRedisClient();
    return await client.type(key);
  },

  async rename(key, newKey) {
    const client = await getRedisClient();
    return await client.rename(key, newKey);
  },

  // Sorted Set commands
  async zAdd(key, ...members) {
    const client = await getRedisClient();
    const zadd = members.map(m => ({
      score: m.score,
      value: m.member
    }));
    return await client.zAdd(key, zadd);
  },

  async zScore(key, member) {
    const client = await getRedisClient();
    return await client.zScore(key, member);
  },

  async zRank(key, member) {
    const client = await getRedisClient();
    return await client.zRank(key, member);
  },

  async zIncrBy(key, member, value) {
    const client = await getRedisClient();
    return await client.zIncrBy(key, member, value);
  },

  async zCard(key) {
    const client = await getRedisClient();
    return await client.zCard(key);
  },

  async zRange(key, start, stop, options) {
    const client = await getRedisClient();
    // Build redis client options
    const redisOpts = {};
    if (options?.reverse) redisOpts.REV = true;
    if (options?.by === 'lex') redisOpts.BYLEX = true;
    if (options?.by === 'score') redisOpts.BYSCORE = true;
    if (options?.limit) {
      redisOpts.LIMIT = { offset: options.limit.offset, count: options.limit.count };
    }

    // Use zRangeWithScores to get both members and scores
    const result = await client.zRangeWithScores(key, start, stop, redisOpts);

    // redis npm client returns: [{ value: 'member1', score: 100 }, ...]
    // Devvit API expects: [{ member: 'member1', score: 100 }, ...]
    if (Array.isArray(result)) {
      return result.map(item => ({
        member: item.value,
        score: item.score
      }));
    }

    return [];
  },

  async zRem(key, members) {
    const client = await getRedisClient();
    return await client.zRem(key, members);
  },

  async zRemRangeByLex(key, min, max) {
    const client = await getRedisClient();
    return await client.zRemRangeByLex(key, min, max);
  },

  async zRemRangeByRank(key, start, stop) {
    const client = await getRedisClient();
    return await client.zRemRangeByRank(key, start, stop);
  },

  async zRemRangeByScore(key, min, max) {
    const client = await getRedisClient();
    return await client.zRemRangeByScore(key, min, max);
  },

  async zScan(key, cursor, pattern, count) {
    const client = await getRedisClient();
    return await client.zScan(key, cursor, { MATCH: pattern, COUNT: count });
  },

  // Hash commands
  async hGet(key, field) {
    const client = await getRedisClient();
    return await client.hGet(key, field);
  },

  async hMGet(key, fields) {
    const client = await getRedisClient();
    return await client.hMGet(key, fields);
  },

  async hSet(key, fieldValues) {
    const client = await getRedisClient();
    return await client.hSet(key, fieldValues);
  },

  async hSetNX(key, field, value) {
    const client = await getRedisClient();
    return await client.hSetNX(key, field, value);
  },

  async hGetAll(key) {
    const client = await getRedisClient();
    return await client.hGetAll(key);
  },

  async hDel(key, fields) {
    const client = await getRedisClient();
    return await client.hDel(key, fields);
  },

  async hScan(key, cursor, pattern, count) {
    const client = await getRedisClient();
    return await client.hScan(key, cursor, { MATCH: pattern, COUNT: count });
  },

  async hKeys(key) {
    const client = await getRedisClient();
    return await client.hKeys(key);
  },

  async hIncrBy(key, field, value) {
    const client = await getRedisClient();
    return await client.hIncrBy(key, field, value);
  },

  async hLen(key) {
    const client = await getRedisClient();
    return await client.hLen(key);
  },

  // Bitfield command (complex parsing)
  async bitfield(key, ...cmds) {
    const client = await getRedisClient();
    const commands = [];
    for (let argIndex = 0; argIndex < cmds.length;) {
      const currentArg = cmds[argIndex];
      switch (currentArg) {
        case 'get': {
          if (argIndex + 2 >= cmds.length) throw Error('bitfield: not enough arguments for get');
          commands.push({ get: { encoding: cmds[argIndex + 1], offset: cmds[argIndex + 2].toString() } });
          argIndex += 3;
          break;
        }
        case 'set': {
          if (argIndex + 3 >= cmds.length) throw Error('bitfield: not enough arguments for set');
          commands.push({ set: { encoding: cmds[argIndex + 1], offset: cmds[argIndex + 2].toString(), value: cmds[argIndex + 3].toString() } });
          argIndex += 4;
          break;
        }
        case 'incrBy': {
          if (argIndex + 3 >= cmds.length) throw Error('bitfield: not enough arguments for incrBy');
          commands.push({ incrBy: { encoding: cmds[argIndex + 1], offset: cmds[argIndex + 2].toString(), increment: cmds[argIndex + 3].toString() } });
          argIndex += 4;
          break;
        }
        case 'overflow': {
          if (argIndex + 1 >= cmds.length) throw Error('bitfield: not enough arguments for overflow');
          commands.push({ overflow: cmds[argIndex + 1].toString() });
          argIndex += 2;
          break;
        }
        default:
          throw Error(`bitfield: unrecognized command ${currentArg}`);
      }
    }
    return await client.bitfield(key, commands);
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
        redis.zAdd(`testbed:posts`, { score: Date.now(), member: postId })
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
