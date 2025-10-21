// Wrapped express that auto-injects context middleware for testbed

import express from 'express';

// Mock context (populated by middleware)
export let context = {
  postId: null,
  userId: null,
  subredditName: 'testbed'
};

/**
 * Middleware to inject mock context from request
 * In production this comes from Devvit platform
 */
function contextMiddleware(req, res, next) {
  // Get postId from multiple sources:
  // 1. Route params (after route matching)
  // 2. Query params (API calls with ?postId=)
  // 3. URL path (page load before route matching, e.g., /r/testbed/comments/post_123)
  let postId = req.params.postId || req.query.postId;

  if (!postId) {
    // Try to extract from path for page loads like /r/testbed/comments/post_123
    const pathMatch = req.path.match(/\/comments\/([^/?]+)/);
    if (pathMatch) {
      postId = pathMatch[1];
    }
  }

  // Only require postId for API calls
  if (req.path.startsWith('/api/') && !postId) {
    console.error('[TESTBED] ERROR: No postId found in API request', {
      path: req.path,
      query: req.query
    });
    return res.status(400).json({
      status: 'error',
      message: 'postId is required but missing from request'
    });
  }

  context.postId = postId || 'default-game';
  context.userId = req.headers['x-user-id'] || req.cookies?.userId || 'testuser';
  context.subredditName = 'testbed';
  next();
}

// Wrap express() to automatically add context middleware
const originalExpress = express;

function expressWithMiddleware() {
  const app = originalExpress();

  // Inject context middleware FIRST (before any routes)
  app.use(contextMiddleware);

  return app;
}

// Copy all properties from original express
Object.setPrototypeOf(expressWithMiddleware, originalExpress);
Object.assign(expressWithMiddleware, originalExpress);

// Export wrapped version as default
export default expressWithMiddleware;
