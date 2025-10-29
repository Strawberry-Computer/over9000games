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
import { JobManager } from "./job-manager.js";
import { getTestGameCode, getAvailableTestGames } from "../shared/test-games/server-loader.js";

const app = express();

// Initialize job manager
const jobManager = new JobManager(redis);


// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get("/api/init", async (_req, res) => {
  const { postId } = context;

  // Handle test game postIds (e.g., test_pong)
  if (postId && postId.startsWith('test_')) {
    const gameName = postId.replace('test_', '');
    console.log(`Loading test game: ${gameName}`);

    try {
      const gameCode = getTestGameCode(gameName);
      const username = await reddit.getCurrentUsername();

      res.json({
        type: "init",
        postId: postId,
        username: username ?? "anonymous",
        gameDefinition: {
          gameCode,
          isPublished: false // Test games are not published
        }
      });
      return;
    } catch (error) {
      console.error(`Error loading test game ${gameName}:`, error);
      res.status(400).json({
        status: "error",
        message: `Test game not found: ${gameName}`
      });
      return;
    }
  }

  // Testbed/homepage mode - return test game gallery (legacy, not used anymore)
  if (!postId || postId === "testbed" || postId === "homepage") {
    console.log("Testbed mode detected - returning test game gallery");

    // Get available test games dynamically
    const availableGames = getAvailableTestGames();
    const testGames = availableGames.map(name => {
      // Get game code to extract metadata
      const gameCode = getTestGameCode(name);

      // Parse metadata from game code (look for metadata() function)
      const metadataMatch = gameCode.match(/return\s*{[\s\S]*?title:\s*["']([^"']+)["'][\s\S]*?description:\s*["']([^"']+)["']/);

      const title = metadataMatch ? metadataMatch[1] : name.charAt(0).toUpperCase() + name.slice(1);
      const description = metadataMatch ? metadataMatch[2] : `Test game: ${name}`;

      return { name, title, description };
    });

    res.json({
      type: "homepage",
      testGames
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
      gameDefinition = { gameCode, isPublished: true };
    }

    res.json({
      type: "init",
      postId: postId,
      username: username ?? "anonymous",
      gameDefinition,
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
    const { description, model } = req.body;
    if (!description) {
      res.status(400).json({
        status: "error",
        message: "Game description is required",
      });
      return;
    }

    // Create async job for background processing
    const result = await jobManager.createJob(
      postId,
      description,
      context.userId || 'anonymous',
      { model }
    );

    console.log(`Created job ${result.jobId} for: ${description.substring(0, 50)}...`);

    res.json({
      type: "generate_async",
      jobId: result.jobId,
      status: result.status,
      model: result.model,
      estimatedTime: result.estimatedTime
    });
  } catch (error) {
    console.error(`Error creating generation job for post ${postId}:`, error);
    res.status(500).json({
      status: "error",
      message: `Failed to create generation job: ${error.message}`,
    });
  }
});

router.post("/api/game/edit", async (req, res) => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({
      status: "error",
      message: "postId is required",
    });
    return;
  }

  try {
    const { description, previousGame } = req.body;
    if (!description) {
      res.status(400).json({
        status: "error",
        message: "Edit description is required",
      });
      return;
    }

    if (!previousGame) {
      res.status(400).json({
        status: "error",
        message: "Previous game data is required for editing",
      });
      return;
    }

    // Create async job for editing (also background now)
    const result = await jobManager.createJob(
      postId,
      description,
      context.userId || 'anonymous',
      { previousGame: JSON.stringify(previousGame) }
    );

    console.log(`Created edit job ${result.jobId} for: ${description.substring(0, 50)}...`);

    res.json({
      type: "generate_async",
      jobId: result.jobId,
      status: result.status,
      model: result.model,
      estimatedTime: result.estimatedTime
    });
  } catch (error) {
    console.error(`Error editing game for post ${postId}:`, error);
    res.status(500).json({
      status: "error",
      message: `Failed to edit game: ${error.message}`,
    });
  }
});

// New endpoint for checking job status
router.get("/api/jobs/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const { postId } = context;

  if (!postId) {
    res.status(400).json({
      status: "error",
      message: "postId is required",
    });
    return;
  }

  try {
    const job = await jobManager.getJob(jobId);

    if (!job) {
      res.status(404).json({
        status: "error",
        message: "Job not found",
      });
      return;
    }

    // Verify job belongs to this post (security check)
    if (job.postId !== postId) {
      res.status(403).json({
        status: "error",
        message: "Access denied",
      });
      return;
    }

    // If job is queued, start the OpenAI background request
    if (job.status === 'queued') {
      try {
        const apiKey = await settings.get('openAIKey');
        if (!apiKey) {
          await jobManager.markJobFailed(jobId, new Error('OpenAI API key not configured'));
          job.status = 'failed';
          job.error = 'OpenAI API key not configured';
        } else {
          const { ResponsesAPI } = await import('./responses-api.js');
          const responsesAPI = new ResponsesAPI(apiKey);

          // Start the background request
          const response = await responsesAPI.createResponse(
            job.description,
            job.model,
            job.previousGame ? JSON.parse(job.previousGame) : null
          );

          // Update job with OpenAI response ID
          await jobManager.markJobPolling(jobId, response.id);
          job.status = 'polling';
          job.openaiResponseId = response.id;
          console.log(`Job ${jobId} started with OpenAI response ${response.id}`);
        }
      } catch (startError) {
        console.error(`Error starting job ${jobId}:`, startError);
        await jobManager.markJobFailed(jobId, startError);
        job.status = 'failed';
        job.error = startError.message;
      }
    }

    // IMPORTANT: If job is polling, also check OpenAI status right now
    // This way we don't rely on a background worker that might be killed
    if (job.status === 'polling' && job.openaiResponseId) {
      try {
        const apiKey = await settings.get('openAIKey');
        if (apiKey) {
          const { ResponsesAPI } = await import('./responses-api.js');
          const responsesAPI = new ResponsesAPI(apiKey);

          const openaiStatus = await responsesAPI.getResponse(job.openaiResponseId);

          if (openaiStatus.status === 'completed') {
            // Update job with completed game
            await jobManager.markJobCompleted(jobId, openaiStatus.gameDefinition);
            job.status = 'completed';
            job.gameDefinition = openaiStatus.gameDefinition;
            console.log(`Job ${jobId} completed via client-driven polling`);
          } else if (openaiStatus.status === 'failed') {
            // Update job as failed
            await jobManager.markJobFailed(jobId, new Error(openaiStatus.error));
            job.status = 'failed';
            job.error = openaiStatus.error;
            console.log(`Job ${jobId} failed via client-driven polling`);
          }
          // If still in progress, just continue
        }
      } catch (pollError) {
        console.error(`Error checking OpenAI status for job ${jobId}:`, pollError);
        // Don't fail the request, just log the error
      }
    }

    const response = {
      jobId,
      status: job.status,
      model: job.model,
      createdAt: parseInt(job.createdAt),
    };

    // Add progress for in-progress jobs
    if (job.status === 'in_progress' || job.status === 'polling') {
      response.progress = job.progress;
      response.estimatedRemaining = Math.max(0,
        jobManager.getEstimatedTime(job.model) - Math.floor((Date.now() - parseInt(job.startedAt || job.createdAt)) / 1000)
      );
    }

    // Add result for completed jobs
    if (job.status === 'completed' && job.gameDefinition) {
      response.gameDefinition = job.gameDefinition;
    }

    // Add error for failed jobs
    if (job.status === 'failed' && job.error) {
      response.error = job.error;
    }

    res.json(response);
  } catch (error) {
    console.error(`Error getting job status ${jobId}:`, error);
    res.status(500).json({
      status: "error",
      message: `Failed to get job status: ${error.message}`,
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
    const testGameDefinition = { gameCode, isPublished: false };

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

    console.log(`Score submission: postId=${postId}, username=${username}, score=${score}`);
    console.log(`Using keys: leaderboardKey=${leaderboardKey}, playerDataKey=${playerDataKey}`);

    // Execute Redis operations individually (Devvit Redis may not support multi)
    try {
      // Get current player score if exists
      const currentScore = await redis.zScore(leaderboardKey, username);
      console.log(`Current score check: currentScore=${currentScore}`);

      // Only update if new score is higher than current score (or player doesn't exist)
      let scoreWasUpdated = false;
      if (!currentScore || score > currentScore) {
        console.log(`Adding/updating score: ${username} -> ${score} in ${leaderboardKey}`);
        // Add/update score in sorted set
        await redis.zAdd(leaderboardKey, { member: username, score });
        console.log(`zAdd completed`);

        // Store player metadata
        await redis.hSet(playerDataKey, {
          username,
          score: score.toString(),
          timestamp: new Date().toISOString(),
          lastUpdated: Date.now().toString()
        });
        console.log(`Player metadata stored`);
        scoreWasUpdated = true;
      } else {
        console.log(`Score not updated: new=${score} <= current=${currentScore}`);
      }

      // Get player's rank (descending - highest scores first)
      const descendingRank = await redis.zRank(leaderboardKey, username);
      const totalPlayers = await redis.zCard(leaderboardKey);
      console.log(`Post-update: descendingRank=${descendingRank}, totalPlayers=${totalPlayers}`);

      // Convert to 1-based rank (0-9 → 1-10 for top 10)
      const playerRank = descendingRank !== undefined ? descendingRank + 1 : null;

      // Only show "NEW HIGH SCORE" if score was actually updated AND player is in top 10
      const isHighScore = scoreWasUpdated && playerRank !== null && playerRank <= 10;

      res.json({
        type: "score",
        newRank: playerRank,
        isHighScore,
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
    const leaderboardKey = `leaderboard:${postId}`;
    console.log(`Leaderboard fetch: postId=${postId}, key=${leaderboardKey}`);

    // Get top 10 players from sorted set
    const topPlayers = await redis.zRange(leaderboardKey, 0, 9, {
      by: 'rank',
      reverse: true
    });

    console.log("leaderboard: topPlayers raw data:", topPlayers);

    // Format leaderboard data - just username and score
    const highScores = topPlayers.map(playerEntry => ({
      username: playerEntry.member,
      score: playerEntry.score
    }));

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

router.post("/api/comment/post", async (req, res) => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({
      status: "error",
      message: "postId is required",
    });
    return;
  }

  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      res.status(400).json({
        status: "error",
        message: "Comment message is required",
      });
      return;
    }

    // Post comment to Reddit
    await reddit.submitComment({
      id: postId,
      text: message.trim()
    });

    console.log(`Comment posted to post ${postId}`);

    res.json({
      success: true,
      message: "Comment posted successfully"
    });

  } catch (error) {
    console.error(`Error posting comment for post ${postId}:`, error);
    res.status(500).json({
      status: "error",
      message: "Failed to post comment",
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