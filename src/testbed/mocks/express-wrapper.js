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
  context.postId = req.query.gameId || req.params.gameId || 'default-game';
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
