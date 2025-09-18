import express from "express";
import {
  createServer,
  context,
  getServerPort,
  reddit,
  redis,
  settings,
} from "@devvit/web/server";
import { media } from "@devvit/media";
import { createPost } from "./core/post.js";
import { generateGameWithAI } from "./game-generator.js";
import { getTestGameCode, getAvailableTestGames } from "../shared/test-games/server-loader.js";

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get("/api/init", async (_req, res) => {
  const { postId } = context;

  if (!postId) {
    console.error("API Init Error: postId not found in devvit context");
    res.status(400).json({
      status: "error",
      message: "postId is required but missing from context",
    });
    return;
  }

  try {
    const [gameCode, username] = await Promise.all([
      redis.get(`game:${postId}:code`),
      reddit.getCurrentUsername(),
    ]);

    let gameDefinition;
    if (gameCode) {
      gameDefinition = { gameCode };
    }

    // Get top 10 high scores using sorted set
    const leaderboardKey = `leaderboard:${postId}`;
    const topPlayersWithScores = await redis.zRange(leaderboardKey, 0, 9, {
      REV: true,
      WITHSCORES: true
    });

    const highScores = [];
    for (let i = 0; i < topPlayersWithScores.length; i += 2) {
      const playerName = topPlayersWithScores[i];
      const playerScore = parseInt(topPlayersWithScores[i + 1]);

      // Get player metadata
      const playerData = await redis.hGetAll(`player:${postId}:${playerName}`);

      highScores.push({
        username: playerName,
        score: playerScore,
        timestamp: playerData.timestamp || new Date().toISOString(),
        rank: Math.floor(i / 2) + 1
      });
    }

    res.json({
      type: "init",
      postId: postId,
      username: username ?? "anonymous",
      gameDefinition,
      highScores,
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = "Unknown error during initialization";
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    res.status(400).json({ status: "error", message: errorMessage });
  }
});

router.post("/api/game/generate", async (req, res) => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({
      status: "error",
      message: "postId is required",
    });
    return;
  }

  try {
    const { description } = req.body;
    if (!description) {
      res.status(400).json({
        status: "error",
        message: "Game description is required",
      });
      return;
    }

    const gameDefinition = await generateGameWithAI(description, settings);

    console.log("Generated game definition:", JSON.stringify(gameDefinition, null, 2));

    res.json({
      type: "generate",
      gameDefinition,
    });
  } catch (error) {
    console.error(`Error generating game for post ${postId}:`, error);
    res.status(500).json({
      status: "error",
      message: `Failed to generate game: ${error.message}`,
    });
  }
});

router.post("/api/game/test", async (req, res) => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({
      status: "error",
      message: "postId is required",
    });
    return;
  }

  try {
    const { gameName = 'simple-movement' } = req.body;

    // Validate game name
    const availableGames = getAvailableTestGames();
    if (!availableGames.includes(gameName)) {
      res.status(400).json({
        status: "error",
        message: `Invalid game name. Available: ${availableGames.join(', ')}`,
      });
      return;
    }

    const gameCode = getTestGameCode(gameName);
    const testGameDefinition = { gameCode };

    console.log(`Loaded test game "${gameName}":`, JSON.stringify(testGameDefinition, null, 2));

    res.json({
      type: "generate",
      gameDefinition: testGameDefinition,
    });
  } catch (error) {
    console.error(`Error loading test game for post ${postId}:`, error);
    res.status(500).json({
      status: "error",
      message: `Failed to load test game: ${error.message}`,
    });
  }
});

router.post("/api/score/submit", async (req, res) => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({
      status: "error",
      message: "postId is required",
    });
    return;
  }

  try {
    const { score } = req.body;
    const username = await reddit.getCurrentUsername();

    if (!username || typeof score !== "number") {
      res.status(400).json({
        status: "error",
        message: "Valid score and username required",
      });
      return;
    }

    const leaderboardKey = `leaderboard:${postId}`;
    const playerDataKey = `player:${postId}:${username}`;

    // Execute Redis operations individually (Devvit Redis may not support multi)
    try {
      // Add/update score in sorted set (automatically handles duplicates)
      await redis.zAdd(leaderboardKey, { member: username, score });

      // Store player metadata
      await redis.hSet(playerDataKey, {
        username,
        score: score.toString(),
        timestamp: new Date().toISOString(),
        lastUpdated: Date.now().toString()
      });

      // Get player's new rank and leaderboard
      const ascendingRank = await redis.zRank(leaderboardKey, username);
      const totalPlayers = await redis.zCard(leaderboardKey);
      const topPlayers = await redis.zRange(leaderboardKey, 0, 9, {
        REV: true,
        WITHSCORES: true
      });

      // Calculate player's descending rank (1-based)
      const playerRank = totalPlayers - ascendingRank;

      // Format top players
      const highScores = [];
      for (let i = 0; i < topPlayers.length; i += 2) {
        const playerName = topPlayers[i];
        const playerScore = parseInt(topPlayers[i + 1]);

        // Get player metadata
        const playerData = await redis.hGetAll(`player:${postId}:${playerName}`);

        highScores.push({
          username: playerName,
          score: playerScore,
          timestamp: playerData.timestamp || new Date().toISOString(),
          rank: Math.floor(i / 2) + 1
        });
      }

      const isHighScore = playerRank <= 10;

      res.json({
        type: "score",
        newRank: playerRank,
        isHighScore,
        highScores,
      });
    } catch (redisError) {
      console.error(`Redis error for post ${postId}:`, redisError);
      throw redisError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error(`Error submitting score for post ${postId}:`, error);
    res.status(500).json({
      status: "error",
      message: "Failed to submit score",
    });
  }
});

router.get("/api/leaderboard", async (_req, res) => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({
      status: "error",
      message: "postId is required",
    });
    return;
  }

  try {
    const highScoresJson = await redis.get(`game:${postId}:highscores`);
    let highScores = [];

    if (highScoresJson) {
      try {
        highScores = JSON.parse(highScoresJson);
      } catch (error) {
        console.error("Error parsing high scores:", error);
      }
    }

    res.json({
      type: "leaderboard",
      highScores,
    });
  } catch (error) {
    console.error(`Error loading leaderboard for post ${postId}:`, error);
    res.status(500).json({
      status: "error",
      message: "Failed to load leaderboard",
    });
  }
});

router.post("/api/post/create", async (req, res) => {
  try {
    const { title, message, gameCode, gameDescription, screenshot } = req.body;

    if (!title || !gameCode) {
      return res.status(400).json({
        success: false,
        error: "Title and game code are required"
      });
    }

    // Prepare splash screen configuration
    const splashConfig = {
      appDisplayName: "over9000games",
      heading: title,
      description: message || `Play ${title} - AI generated retro game!`,
      buttonLabel: `Play ${title}`,
      height: 'tall'
    };

    // Upload screenshot to Reddit if provided
    if (screenshot) {
      try {
        console.log("Uploading screenshot to Reddit...");
        const uploadResult = await media.upload({
          url: screenshot, // Data URI from canvas
          type: 'png'
        });

        if (uploadResult?.mediaUrl) {
          splashConfig.backgroundUri = uploadResult.mediaUrl;
          console.log("Screenshot uploaded successfully:", uploadResult.mediaUrl);
        }
      } catch (uploadError) {
        console.error("Failed to upload screenshot:", uploadError);
        // Continue without screenshot rather than failing the entire post
      }
    }

    // Create the post with enhanced splash screen
    const post = await reddit.submitCustomPost({
      splash: splashConfig,
      subredditName: context.subredditName,
      title: `${title} - AI Generated Game`,
    });

    if (!post?.id) {
      throw new Error("Failed to create post - no post ID returned");
    }

    // Store game code and metadata separately in Redis
    await redis.set(`game:${post.id}:code`, gameCode);
    await redis.set(`game:${post.id}:metadata`, JSON.stringify({
      title,
      message,
      gameDescription,
      createdAt: new Date().toISOString(),
      creator: await reddit.getCurrentUsername()
    }));
    // Initialize leaderboard as sorted set (no need to create empty sorted set)
    // Redis sorted sets are created automatically when first member is added

    console.log(`Created new game post: ${post.id} with title: ${title}`);

    res.json({
      success: true,
      postId: post.id,
      postUrl: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`
    });

  } catch (error) {
    console.error("Error creating game post:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create post"
    });
  }
});

router.post("/internal/on-app-install", async (_req, res) => {
  try {
    const post = await createPost();

    res.json({
      status: "success",
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: "error",
      message: "Failed to create post",
    });
  }
});

router.post("/internal/menu/post-create", async (_req, res) => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: "error",
      message: "Failed to create post",
    });
  }
});

app.use(router);

const server = createServer(app);
server.on("error", (err) => console.error(`server error; ${err.stack}`));
server.listen(getServerPort());