import express from "express";
import {
  createServer,
  context,
  getServerPort,
  reddit,
  redis,
  settings,
} from "@devvit/web/server";
import { createPost } from "./core/post.js";
import { generateGameWithAI } from "./game-generator.js";
import { getTestGame, getAvailableTestGames } from "../shared/test-games.js";

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
    const [gameDefinitionJson, highScoresJson, username] = await Promise.all([
      redis.get(`game:${postId}:definition`),
      redis.get(`game:${postId}:highscores`),
      reddit.getCurrentUsername(),
    ]);

    let gameDefinition;
    if (gameDefinitionJson) {
      try {
        gameDefinition = JSON.parse(gameDefinitionJson);
      } catch (error) {
        console.error("Error parsing game definition:", error);
      }
    }

    let highScores = [];
    if (highScoresJson) {
      try {
        highScores = JSON.parse(highScoresJson);
      } catch (error) {
        console.error("Error parsing high scores:", error);
      }
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

    await redis.set(`game:${postId}:definition`, JSON.stringify(gameDefinition));

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

    const testGameDefinition = getTestGame(gameName);

    console.log(`Loaded test game "${gameName}":`, JSON.stringify(testGameDefinition, null, 2));

    await redis.set(`game:${postId}:definition`, JSON.stringify(testGameDefinition));

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

    const highScoresKey = `game:${postId}:highscores`;
    const existingScoresJson = await redis.get(highScoresKey);
    let highScores = [];

    if (existingScoresJson) {
      try {
        highScores = JSON.parse(existingScoresJson);
      } catch (error) {
        console.error("Error parsing existing high scores:", error);
      }
    }

    const newScore = {
      username,
      score,
      timestamp: new Date().toISOString(),
      rank: 0,
    };

    highScores.push(newScore);
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10);

    highScores.forEach((score, index) => {
      score.rank = index + 1;
    });

    await redis.set(highScoresKey, JSON.stringify(highScores));

    const userRank = highScores.findIndex(s => s.username === username && s.score === score) + 1;
    const isHighScore = userRank > 0;

    res.json({
      type: "score",
      newRank: isHighScore ? userRank : undefined,
      isHighScore,
      highScores,
    });
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