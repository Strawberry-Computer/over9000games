import { navigateTo } from "@devvit/web/client";
import { getGameRunner } from "./game-runner.js";
import { getQuickJS } from "quickjs-emscripten";

const titleElement = document.getElementById("title");
const scoresListElement = document.getElementById("scores-list"); // Legacy, may be removed

// Game creation elements
const gameCreationElement = document.getElementById("game-creation");
const gamePublishingElement = document.getElementById("game-publishing");
const devMenuElement = document.getElementById("dev-menu");

const gameDescriptionElement = document.getElementById("game-description");
const publishTitleElement = document.getElementById("publish-title");
const highScoreCommentElement = document.getElementById("high-score-comment");
const commentMessageElement = document.getElementById("comment-message");

const generationStatusElement = document.getElementById("generation-status");
const publishingStatusElement = document.getElementById("publishing-status");
const commentStatusElement = document.getElementById("comment-status");

const publishCurrentButton = document.getElementById("btn-publish-current");
const editActionsElement = document.getElementById("edit-actions");
const gameCreationTitleElement = document.getElementById("game-creation-title");
const gameCreationSubtitleElement = document.getElementById("game-creation-subtitle");
const undoEditButton = document.getElementById("btn-undo-edit");
const redoEditButton = document.getElementById("btn-redo-edit");

// Current game state
let currentGameData = null;
let isTestGame = false;

// Edit state management
let editHistory = {
  versions: [],
  currentIndex: -1
};
let isEditMode = false;


let currentPostId = null;
let currentUsername = null;
let gameRunner;
let currentHighScores = [];

function initializeConsole() {
  try {
    gameRunner = getGameRunner("console-canvas", "sprite-canvas");
    console.log("Game runner created");
  } catch (error) {
    console.error("Failed to initialize game runner:", error);
  }
}

async function fetchInitialData() {
  try {
    const response = await fetch("/api/init");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (data.type === "homepage") {
      // Testbed mode - render test game gallery
      console.log("Testbed mode - rendering game gallery");
      renderHomepage(data.testGames);
    } else if (data.type === "init") {
      currentPostId = data.postId;
      currentUsername = data.username;
      currentHighScores = data.highScores;

      if (data.gameDefinition && data.gameDefinition.gameCode) {
        // Store the game data for restart functionality
        currentGameData = data.gameDefinition;

        // Load all games via QuickJS runner
        console.log("Loading initial game from Redis...");
        await gameRunner.loadCode(data.gameDefinition.gameCode, {
          isPublished: data.gameDefinition.isPublished
        });
        console.log("Game loaded and started successfully");
      } else {
        console.log("No game definition in init response");
        gameRunner.showMessage("Create a game\nto start!", "NO GAME");
      }
    } else {
      console.error("Invalid response type from /api/init", data);
      gameRunner.showMessage("Failed to load\ngame data", "ERROR");
    }
  } catch (error) {
    console.error("Error fetching initial data:", error);
    gameRunner.showMessage("Connection error", "ERROR");
  }
}

function renderHomepage(testGames) {
  // Hide action buttons (not needed in homepage mode)
  document.querySelector(".action-bar").style.display = "none";

  // Create homepage UI
  const consoleScreen = document.getElementById("console-screen");
  consoleScreen.innerHTML = `
    <div class="testbed-homepage">
      <div class="homepage-header">
        <h1>RES-9000 TEST GAMES</h1>
        <p>Select a game to test font tile rendering</p>
      </div>
      <div class="test-game-gallery">
        ${testGames.map(game => `
          <div class="test-game-card" data-game="${game.name}">
            <h3>${game.title}</h3>
            <p>${game.description}</p>
            <button class="play-btn">PLAY</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add click handlers for play buttons
  document.querySelectorAll('.test-game-card').forEach(card => {
    card.querySelector('.play-btn').addEventListener('click', () => {
      const gameName = card.dataset.game;
      loadTestGameFromHomepage(gameName);
    });
  });
}

async function loadTestGameFromHomepage(gameName) {
  // Restore normal UI
  const consoleScreen = document.getElementById("console-screen");
  consoleScreen.innerHTML = `
    <canvas id="console-canvas" width="128" height="128"></canvas>
    <canvas id="sprite-canvas" width="128" height="256" style="display: none;"></canvas>
  `;
  document.querySelector(".action-bar").style.display = "flex";

  // Reinitialize game runner with new canvases
  gameRunner = getGameRunner("console-canvas", "sprite-canvas");

  // Load the test game
  await loadTestGame(gameName);
}




async function loadTestGame(gameName) {
  try {
    const request = { gameName };
    const response = await fetch("/api/game/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Received test game "${gameName}" from server:`, data.gameDefinition);

    if (data.type === "generate") {
      // Store the test game data just like generated games
      currentGameData = {
        ...data.gameDefinition,
        description: `Test game: ${gameName}`
      };

      // Load the raw game code directly into QuickJS
      await gameRunner.loadCode(data.gameDefinition.gameCode, {
        autoStart: true,
        isPublished: currentGameData.isPublished,
        isGenerated: false
      });
    }
  } catch (error) {
    console.error(`Error loading test game "${gameName}":`, error);
    gameRunner.showMessage(`Failed to load\ntest game`, "ERROR");
  }
}

async function submitScore(score) {
  console.log("submitScore called with:", score, "postId:", currentPostId, "username:", currentUsername, "isPublished:", currentGameData?.isPublished);

  // Skip score submission for unpublished games (generated games and test games)
  if (currentGameData?.isPublished === false) {
    console.log("Score submission skipped - unpublished game (leaderboard disabled)");
    return;
  }

  if (!currentPostId || !currentUsername) {
    console.log("Score submission skipped - missing postId or username");
    return;
  }

  try {
    const request = { score };
    console.log("submitScore: sending request", request);
    const response = await fetch("/api/score/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    console.log("submitScore: response status", response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("submitScore: response data", data);
    currentHighScores = data.highScores;

    if (data.isHighScore) {
      // Show high score message on leaderboard
      if (gameRunner) {
        gameRunner.setHighScoreMessage(`HIGH SCORE! #${data.newRank}`);
      }

      // Show comment prompt for high scores
      showHighScoreCommentPrompt(score, data.newRank);
    }

  } catch (error) {
    console.error("Error submitting score:", error);
  }
}

async function loadLeaderboard() {
  try {
    console.log("loadLeaderboard: fetching from /api/leaderboard");
    const response = await fetch("/api/leaderboard");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("loadLeaderboard: received data", data);
    currentHighScores = data.highScores;
    console.log("loadLeaderboard: currentHighScores", currentHighScores);

    // Show leaderboard on game runner canvas
    if (gameRunner) {
      gameRunner.showLeaderboard(currentHighScores);
    }

  } catch (error) {
    console.error("Error loading leaderboard:", error);
    // Show error on game runner
    if (gameRunner) {
      gameRunner.showLeaderboard([]);
    }
  }
}

// Shared restart logic - reloads game code to reset QuickJS VM
// Used by: RESTART button, Enter key, START button (when game over), canvas tap (when game over)
async function restartGame() {
  if (gameRunner && currentGameData?.gameCode) {
    // Reload the game code to completely reset the VM state
    await gameRunner.loadCode(currentGameData.gameCode, {
      autoStart: true,
      isPublished: currentGameData.isPublished,
      isGenerated: gameRunner.isGeneratedGame
    });
  }
}

// Expose functions globally for game runner access
window.loadLeaderboard = loadLeaderboard;
window.submitScore = submitScore;
window.restartCurrentGame = restartGame;  // Expose shared restart function

function showGameCreation() {
  // Set modal title based on mode
  if (isEditMode) {
    gameCreationTitleElement.textContent = "EDIT GAME";
    gameCreationSubtitleElement.textContent = "Describe your changes and AI will apply them!";
    gameDescriptionElement.placeholder = "make the snake move faster\nadd power-ups\nchange colors\nbigger sprites";
    editActionsElement.style.display = "block";
  } else {
    gameCreationTitleElement.textContent = "CREATE NEW GAME";
    gameCreationSubtitleElement.textContent = "Describe your game and AI will build it!";
    gameDescriptionElement.placeholder = "snake game with power-ups\npong with lasers\nplatformer with coins\nspace shooter with aliens";
    editActionsElement.style.display = "none";
  }

  gameCreationElement.style.display = "block";
  document.body.classList.add("game-creation-active");
  gameDescriptionElement.focus();
}

function showDevMenu() {
  // If leaderboard is showing (paused or game over), close it instead of opening dev menu
  if (gameRunner && gameRunner.state &&
      (gameRunner.state.gameState === 'paused' || gameRunner.state.gameState === 'game_over')) {
    gameRunner.resumeGame();
    return;
  }

  devMenuElement.style.display = "block";
  document.body.classList.add("dev-menu-active");
}


function hideAllModals() {
  gameCreationElement.style.display = "none";
  gamePublishingElement.style.display = "none";
  devMenuElement.style.display = "none";
  highScoreCommentElement.style.display = "none";
  const newGameConfirmElement = document.getElementById("new-game-confirm");
  if (newGameConfirmElement) {
    newGameConfirmElement.style.display = "none";
  }
  if (gameRunner) {
    gameRunner.hideLeaderboard();
  }

  document.body.classList.remove(
    "game-creation-active",
    "game-publishing-active",
    "dev-menu-active",
    "high-score-comment-active"
  );
  isEditMode = false;

  // Clear forms
  gameDescriptionElement.value = "";
  publishTitleElement.value = "";
  commentMessageElement.value = "";

  // Re-enable form elements
  gameDescriptionElement.disabled = false;
  publishTitleElement.disabled = false;
  commentMessageElement.disabled = false;

  const generateButton = document.getElementById("btn-generate-game");
  const publishButton = document.getElementById("btn-post-to-reddit");
  const commentButton = document.getElementById("btn-post-comment");

  if (generateButton) {
    generateButton.disabled = false;
    generateButton.classList.remove("disabled");
  }

  if (publishButton) {
    publishButton.disabled = false;
    publishButton.classList.remove("disabled");
  }

  if (commentButton) {
    commentButton.disabled = false;
    commentButton.classList.remove("disabled");
  }

  // Hide status messages
  generationStatusElement.style.display = "none";
  publishingStatusElement.style.display = "none";
  commentStatusElement.style.display = "none";
}

function showNewGameConfirmation() {
  const newGameConfirmElement = document.getElementById("new-game-confirm");
  if (newGameConfirmElement) {
    newGameConfirmElement.style.display = "block";
  }
}

function hideNewGameConfirmation() {
  const newGameConfirmElement = document.getElementById("new-game-confirm");
  if (newGameConfirmElement) {
    newGameConfirmElement.style.display = "none";
  }
}

function confirmNewGame() {
  // Hide confirmation dialog
  hideNewGameConfirmation();

  // Close the edit modal
  hideAllModals();

  // Reset game state and history
  resetGameState();

  // Clear localStorage edit history
  localStorage.removeItem('editHistory');

  // Stop the current game and show "NO GAME" message
  if (gameRunner) {
    gameRunner.stopGame({
      message: "Create a game\nto start!",
      title: "NO GAME"
    });
  }

  // Show game creation modal
  showGameCreation();
}

function resetGameState() {
  currentGameData = null;
  if (editActionsElement) editActionsElement.style.display = "none";
  editHistory = { versions: [], currentIndex: -1 };
  isEditMode = false;
  updateEditButtons();
  updateShareButtonState();
}

function showGenerationStatus(message, type = "loading") {
  generationStatusElement.textContent = message;
  generationStatusElement.className = `status-message ${type}`;
  generationStatusElement.style.display = "block";
}

function showPublishingStatus(message, type = "loading") {
  publishingStatusElement.textContent = message;
  publishingStatusElement.className = `status-message ${type}`;
  publishingStatusElement.style.display = "block";
}

let currentJobId = null;
let pollInterval = null;

async function generateGame() {
  const description = gameDescriptionElement.value.trim();

  if (!description) {
    showGenerationStatus("Please describe your game!", "error");
    return;
  }

  // Disable form during generation
  const generateButton = document.getElementById("btn-generate-game");
  const cancelButton = document.getElementById("btn-cancel-creation");

  gameDescriptionElement.disabled = true;
  generateButton.disabled = true;
  generateButton.classList.add("disabled");

  try {
    const endpoint = isEditMode ? "/api/game/edit" : "/api/game/generate";
    const requestBody = isEditMode
      ? { description, previousGame: currentGameData }
      : { description }; // Server will select model based on subreddit

    showGenerationStatus("Starting generation...", "loading");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.type === "generate_async") {
      // Handle async job
      currentJobId = data.jobId;

      showGenerationStatus(
        `Queued for generation (${data.model}) • Est. ${data.estimatedTime}s`,
        "loading"
      );

      // Start polling for job completion
      startJobPolling(data.jobId);

    } else {
      // Handle any legacy sync responses (fallback)
      throw new Error("Expected async response but got sync");
    }

  } catch (error) {
    console.error("Error starting game generation:", error);
    showGenerationStatus(`Error: ${error.message}`, "error");

    // Re-enable form on error
    resetGenerationForm();
  }
}

function startJobPolling(jobId) {
  if (pollInterval) {
    clearInterval(pollInterval);
  }

  pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const jobData = await response.json();

      switch (jobData.status) {
        case 'queued':
          showGenerationStatus("Queued for processing...", "loading");
          break;

        case 'in_progress':
        case 'polling':
          const progress = jobData.progress || 0;
          const remaining = jobData.estimatedRemaining || '?';
          showGenerationStatus(
            `Generating with ${jobData.model}... ${progress}% • ${remaining}s remaining`,
            "loading"
          );
          break;

        case 'completed':
          clearInterval(pollInterval);
          pollInterval = null;
          currentJobId = null;

          console.log('Job completed with data:', jobData);
          console.log('Game definition exists?', !!jobData.gameDefinition);
          console.log('Game code exists?', !!jobData.gameDefinition?.gameCode);
          console.log('Game code type:', typeof jobData.gameDefinition?.gameCode);
          console.log('Game code length:', jobData.gameDefinition?.gameCode?.length);

          if (jobData.gameDefinition?.gameCode) {
            await handleGenerationComplete(jobData.gameDefinition);
          } else {
            console.error('No game code in response. Full response:', jobData);
            throw new Error("No game code in completed job");
          }
          break;

        case 'failed':
          clearInterval(pollInterval);
          pollInterval = null;
          currentJobId = null;

          showGenerationStatus(`Generation failed: ${jobData.error}`, "error");
          resetGenerationForm();
          break;

        default:
          console.log(`Unknown job status: ${jobData.status}`);
      }

    } catch (error) {
      console.error("Error polling job status:", error);

      // Don't clear interval immediately - might be temporary network issue
      // Only stop after several failures
    }
  }, 3000); // Poll every 3 seconds
}

async function handleGenerationComplete(gameDefinition) {
  try {
    if (isEditMode) {
      // Store the edited game with the edit description
      currentGameData = {
        ...gameDefinition,
        description: gameDescriptionElement.value.trim()
        // autoScreenshot will be regenerated via firstFrameCallback (game may look different)
      };

      // Save new version to history
      saveToEditHistory(currentGameData);
      updateEditButtons();

    } else {
      // Store the generated game and initialize edit history
      currentGameData = {
        ...gameDefinition,
        description: gameDescriptionElement.value.trim()
        // autoScreenshot will be generated via firstFrameCallback
      };

      editHistory = { versions: [], currentIndex: -1 };
      saveToEditHistory(currentGameData);
      updateEditButtons();
    }

    // Load and show the game
    await showGeneratedGame();
    updateShareButtonState();

  } catch (error) {
    console.error("Error handling completed generation:", error);
    showGenerationStatus(`Error loading game: ${error.message}`, "error");
    resetGenerationForm();
  }
}

function resetGenerationForm() {
  gameDescriptionElement.disabled = false;

  const generateButton = document.getElementById("btn-generate-game");
  generateButton.disabled = false;
  generateButton.classList.remove("disabled");

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  currentJobId = null;
}

function cancelGeneration() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  if (currentJobId) {
    console.log(`Cancelling job ${currentJobId}`);
    currentJobId = null;
  }

  showGenerationStatus("Generation cancelled", "error");
  resetGenerationForm();
}

async function reloadGameInPlace() {
  try {
    // Load the game code without showing modals or status
    // Keep existing published/generated state
    await gameRunner.loadCode(currentGameData.gameCode, {
      autoStart: true,
      isPublished: currentGameData.isPublished,
      isGenerated: gameRunner.isGeneratedGame
    });
  } catch (error) {
    console.error("Error reloading game:", error);
  }
}

async function showGeneratedGame() {
  try {
    showGenerationStatus("Loading your game", "loading");

    // Log the full generated game code for debugging
    console.log("=== GENERATED GAME CODE START ===");
    console.log(currentGameData.gameCode);
    console.log("=== GENERATED GAME CODE END ===");
    console.log("Game code length:", currentGameData.gameCode?.length || "undefined");
    console.log("Game code type:", typeof currentGameData.gameCode);
    console.log("First 200 chars of code:", currentGameData.gameCode?.substring(0, 200));

    // Load the game into the main console with options
    await gameRunner.loadCode(currentGameData.gameCode, {
      autoStart: true,
      isPublished: currentGameData.isPublished,
      isGenerated: true,
      firstFrameCallback: async () => {
        try {
          const screenshot = await captureGameScreenshot();
          if (screenshot) {
            currentGameData.autoScreenshot = screenshot;
            console.log("Auto-screenshot generated after first frame");
          }
        } catch (error) {
          console.error("Error generating auto-screenshot:", error);
        }
      }
    });

    // Hide the creation modal and return to main view
    hideAllModals();

  } catch (error) {
    console.error("Error loading generated game:", error);
    showGenerationStatus(`Error loading game: ${error.message}`, "error");
  }
}


function showGamePublishing() {
  gamePublishingElement.style.display = "block";
  document.body.classList.add("game-publishing-active");
  publishTitleElement.focus();

  // Auto-suggest a title based on the game description
  if (!publishTitleElement.value && currentGameData?.description) {
    const words = currentGameData.description.split(' ').slice(0, 3);
    const suggestedTitle = words.map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    publishTitleElement.value = suggestedTitle;
  }
}

function showGamePublishingFromMain() {
  if (!gameRunner || !gameRunner.isGeneratedGame || !currentGameData) {
    return;
  }

  showGamePublishing();
}

// Enhanced screenshot capture function with 4x resolution and landscape formatting
async function captureGameScreenshot() {
  try {
    // Capture the current frame immediately (no waiting)
    if (gameRunner && gameRunner.isGeneratedGame) {
      // Get the main console canvas
      const sourceCanvas = document.getElementById("console-canvas");
      if (!sourceCanvas) return null;

      // Create high-resolution capture canvas (4x resolution)
      const captureCanvas = document.createElement('canvas');
      const captureCtx = captureCanvas.getContext('2d');

      // Set up 4x scaled canvas (128×128 → 512×512)
      captureCanvas.width = 512;
      captureCanvas.height = 512;
      captureCtx.imageSmoothingEnabled = false; // Maintain pixel art crispness

      // Scale the source canvas 4x
      captureCtx.drawImage(sourceCanvas, 0, 0, 128, 128, 0, 0, 512, 512);

      // Create landscape format canvas for Reddit posts (16:9 aspect ratio)
      const landscapeCanvas = document.createElement('canvas');
      const landscapeCtx = landscapeCanvas.getContext('2d');

      // Landscape dimensions: 1820×1024 (16:9) with 1024 height as agreed
      landscapeCanvas.width = 1820;
      landscapeCanvas.height = 1024;

      // Fill background with solid dark color for better PNG compression
      landscapeCtx.fillStyle = '#1a1a2e';
      landscapeCtx.fillRect(0, 0, 1820, 1024);

      // Center the game canvas (1024×1024 fits perfectly to height)
      const gameSize = 1024; // Perfect fit to landscape height
      const gameX = (1820 - gameSize) / 2; // Center horizontally (398px padding each side)
      const gameY = 0; // Top aligned

      landscapeCtx.imageSmoothingEnabled = false;
      landscapeCtx.drawImage(captureCanvas, 0, 0, 512, 512, gameX, gameY, gameSize, gameSize);


      // Skip scanlines effect to reduce PNG file size

      return landscapeCanvas.toDataURL('image/png');
    }
    return null;
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    return null;
  }
}

async function publishGameToReddit() {
  const title = publishTitleElement.value.trim();

  if (!title) {
    showPublishingStatus("Please give your game a title!", "error");
    return;
  }

  // Disable form during publishing
  const publishButton = document.getElementById("btn-post-to-reddit");

  publishTitleElement.disabled = true;
  publishButton.disabled = true;
  publishButton.classList.add("disabled");

  try {
    // Use auto-generated screenshot (captured after first frame)
    const screenshot = currentGameData.autoScreenshot;

    if (!screenshot) {
      throw new Error("Screenshot not available. Please restart the game and try again.");
    }

    showPublishingStatus("Creating Reddit post", "loading");

    const response = await fetch("/api/post/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        gameDescription: currentGameData.description,
        gameCode: currentGameData.gameCode,
        screenshot: screenshot // Include screenshot data URI
      }),
    });

    if (!response.ok) {
      throw new Error(`Post creation failed: ${response.status}`);
    }

    const postData = await response.json();

    if (postData.success) {
      showPublishingStatus(`Game posted successfully! Redirecting to post`, "success");

      // Redirect to the new post after 2 seconds
      setTimeout(() => {
        navigateTo(postData.postUrl);
      }, 2000);
    } else {
      throw new Error(postData.error || "Failed to create post");
    }

  } catch (error) {
    console.error("Error publishing game:", error);
    showPublishingStatus(`Error: ${error.message}`, "error");

    // Re-enable form on error
    publishTitleElement.disabled = false;
    publishButton.disabled = false;
    publishButton.classList.remove("disabled");
  }
}

// High Score Comment Functions
function showHighScoreCommentPrompt(score, rank) {
  // Update modal title and subtitle
  const titleElement = document.getElementById("high-score-title");
  const subtitleElement = document.getElementById("high-score-subtitle");

  if (titleElement) {
    titleElement.textContent = `HIGH SCORE! #${rank}`;
  }
  if (subtitleElement) {
    subtitleElement.textContent = "Share your achievement with a comment?";
  }

  // Pre-fill comment with score
  commentMessageElement.value = `Just scored ${score}! 🎮`;

  // Show the modal
  highScoreCommentElement.style.display = "block";
  document.body.classList.add("high-score-comment-active");
  commentMessageElement.focus();
}

function showCommentStatus(message, type = "loading") {
  commentStatusElement.textContent = message;
  commentStatusElement.className = `status-message ${type}`;
  commentStatusElement.style.display = "block";
}

async function postHighScoreComment() {
  const message = commentMessageElement.value.trim();

  if (!message) {
    showCommentStatus("Please enter a message!", "error");
    return;
  }

  // Disable form during submission
  const commentButton = document.getElementById("btn-post-comment");
  const skipButton = document.getElementById("btn-skip-comment");

  commentMessageElement.disabled = true;
  commentButton.disabled = true;
  commentButton.classList.add("disabled");
  skipButton.disabled = true;

  try {
    showCommentStatus("Posting comment...", "loading");

    const response = await fetch("/api/comment/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Failed to post comment: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      showCommentStatus("Comment posted successfully!", "success");

      // Close modal after 1.5 seconds and reload leaderboard
      setTimeout(async () => {
        hideAllModals();
        // Reload leaderboard to show updated scores
        await loadLeaderboard();
      }, 1500);
    } else {
      throw new Error(data.message || "Failed to post comment");
    }

  } catch (error) {
    console.error("Error posting comment:", error);
    showCommentStatus(`Error: ${error.message}`, "error");

    // Re-enable form on error
    commentMessageElement.disabled = false;
    commentButton.disabled = false;
    commentButton.classList.remove("disabled");
    skipButton.disabled = false;
  }
}


// Event Listeners
document.getElementById("btn-new-game")?.addEventListener("click", () => {
  resetGameState();
  showGameCreation();
});

// RESTART button uses shared restart logic
document.getElementById("btn-restart-game")?.addEventListener("click", async (e) => {
  const button = e.currentTarget;
  if (button.disabled) return;

  button.disabled = true;
  try {
    await restartGame();
  } finally {
    button.disabled = false;
  }
});

// START button handler - uses shared pause/resume logic
document.getElementById("btn-pause")?.addEventListener("click", async (e) => {
  const button = e.currentTarget;
  if (button.disabled) return;

  button.disabled = true;
  try {
    await handlePauseResume();
  } finally {
    button.disabled = false;
  }
});

// Update share button disabled state
function updateShareButtonState() {
  // Only generated games can be shared
  const canShare = gameRunner && gameRunner.isGeneratedGame && currentGameData;

  const btn = document.getElementById("btn-publish-current");
  if (btn) {
    btn.disabled = !canShare;
    btn.classList.toggle("disabled", !canShare);
  }
}

// Handle post button
const handleShare = () => {
  // Guard: only allow sharing generated games (button should be disabled anyway)
  if (!gameRunner || !gameRunner.isGeneratedGame || !currentGameData) {
    return;
  }

  // pauseGame now auto-shows leaderboard by default
  if (gameRunner) {
    gameRunner.pauseGame();
  }
  showGamePublishing();
};
document.getElementById("btn-publish-current")?.addEventListener("click", handleShare);

// Helper function to check if click is on action buttons
function isClickOnControlButton(target) {
  return target.closest(
    "#btn-edit-game, #btn-publish-current, #btn-restart-game, #btn-menu"
  );
}

// Shared pause/resume/restart logic for START button and canvas tap
async function handlePauseResume() {
  if (!gameRunner) return;

  console.log('[handlePauseResume] State:', {
    gameState: gameRunner.state.gameState
  });

  // Restart game if it's over (uses shared restart logic)
  if (gameRunner.state.gameState === 'game_over') {
    console.log('[handlePauseResume] Restarting game (game over)');
    await restartGame();
    return;
  }

  // Resume if paused
  if (gameRunner.state.gameState === 'paused') {
    console.log('[handlePauseResume] Resuming game (paused)');
    gameRunner.resumeGame();
  } else {
    // Pause and show leaderboard
    console.log('[handlePauseResume] Pausing game');
    gameRunner.pauseGame();

    // Use existing loadLeaderboard function to fetch and display
    await loadLeaderboard();
  }
}

// Console screen tap to pause/resume and show leaderboard
const consoleScreen = document.getElementById("console-screen");
consoleScreen?.addEventListener("click", async (e) => {
  // Check if click is on control buttons - don't handle if clicking those
  if (isClickOnControlButton(e.target)) {
    return; // Let button handlers take over
  }

  // Use shared pause/resume logic
  await handlePauseResume();
});

// Document-wide tap outside console also resumes (except control buttons)
document.addEventListener("click", (e) => {
  if (!gameRunner || gameRunner.state.gameState === 'game_over') return;

  // Don't handle if already handled by console-screen
  if (consoleScreen?.contains(e.target)) {
    return;
  }

  // Don't resume on control buttons
  if (isClickOnControlButton(e.target)) {
    return;
  }

  // Don't resume if clicking inside modals/menus
  const inModal = e.target.closest(
    ".game-creation, .game-publishing, .dev-menu, .prompt-modal"
  );
  if (inModal) {
    return;
  }

  // Only resume if paused (tapping outside to dismiss leaderboard)
  if (gameRunner.state.gameState === 'paused') {
    gameRunner.resumeGame();
  }
}, true); // Use capture phase to catch clicks early

document.getElementById("btn-menu")?.addEventListener("click", showDevMenu);
document.getElementById("btn-close-dev-menu")?.addEventListener("click", hideAllModals);

// Game creation flow event listeners
document.getElementById("btn-generate-game")?.addEventListener("click", generateGame);
document.getElementById("btn-cancel-creation")?.addEventListener("click", () => {
  // Cancel generation if in progress
  if (currentJobId && pollInterval) {
    cancelGeneration();
  } else {
    hideAllModals();
  }
});

// Game publishing event listeners
document.getElementById("btn-post-to-reddit")?.addEventListener("click", publishGameToReddit);
document.getElementById("btn-back-to-game")?.addEventListener("click", hideAllModals);


// Test game buttons
// Simple movement test removed - not scorable

document.getElementById("btn-test-pong")?.addEventListener("click", () => {
  hideAllModals();
  loadTestGame("pong");
});

document.getElementById("btn-test-platformer")?.addEventListener("click", () => {
  hideAllModals();
  loadTestGame("platformer");
});


// Game preview event listeners
document.getElementById("btn-play-preview")?.addEventListener("click", () => {
  if (previewGameRunner) {
    previewGameRunner.startGame();
  }
});
document.getElementById("btn-regenerate")?.addEventListener("click", () => {
  // Regenerate with same description
  generateGame();
});
document.getElementById("btn-modify")?.addEventListener("click", showGameModification);
document.getElementById("btn-start-over")?.addEventListener("click", () => {
  hideAllModals();
  showGameCreation();
});
document.getElementById("btn-love-it")?.addEventListener("click", showGamePublishing);

// Game modification event listeners (removed - buttons don't exist in current UI)

// High score comment event listeners
document.getElementById("btn-post-comment")?.addEventListener("click", postHighScoreComment);
document.getElementById("btn-skip-comment")?.addEventListener("click", async () => {
  hideAllModals();
  // Show leaderboard when skipping comment
  await loadLeaderboard();
});

// Edit control event listeners
const handleEdit = () => {
  if (gameRunner) {
    // pauseGame now auto-shows leaderboard by default
    gameRunner.pauseGame();
  }
  startEditMode();
};
document.getElementById("btn-edit-game")?.addEventListener("click", handleEdit);
document.getElementById("btn-undo-edit")?.addEventListener("click", undoEdit);
document.getElementById("btn-redo-edit")?.addEventListener("click", redoEdit);
document.getElementById("btn-new-game-edit")?.addEventListener("click", showNewGameConfirmation);

// New game confirmation listeners
document.getElementById("btn-confirm-new-game")?.addEventListener("click", confirmNewGame);
document.getElementById("btn-cancel-new-game")?.addEventListener("click", hideNewGameConfirmation);


// Custom game event for score submission
document.addEventListener("gameOver", (event) => {
  const finalScore = event.detail.score;
  submitScore(finalScore);
});


// Game over events are now handled via canvas overlay instead of modal

// Mobile keyboard handling
function setupMobileKeyboardHandling() {
  // Re-query on each call since elements might be added dynamically
  const textInputs = document.querySelectorAll('textarea, input[type="text"]');

  textInputs.forEach(input => {
    input.addEventListener('focus', () => {
      // Add class to detect keyboard visibility
      setTimeout(() => {
        const modal = input.closest('.game-creation, .game-modification, .game-publishing');
        if (modal) {
          modal.classList.add('keyboard-visible');
        }
      }, 300); // Wait for keyboard animation
    });

    input.addEventListener('blur', () => {
      // Remove keyboard visibility class
      const modal = input.closest('.game-creation, .game-modification, .game-publishing');
      if (modal) {
        modal.classList.remove('keyboard-visible');
      }
    });

    // Add Cmd+Enter / Ctrl+Enter handler to submit the parent form
    input.addEventListener('keydown', (e) => {
      const isAcceptShortcut = e.key === 'Enter' && (e.metaKey || e.ctrlKey);
      if (!isAcceptShortcut) return;

      e.preventDefault();

      // Find which modal this input belongs to and trigger appropriate action
      if (input === gameDescriptionElement) {
        const generateButton = document.getElementById('btn-generate-game');
        if (generateButton && !generateButton.disabled) {
          generateButton.click();
        }
      } else if (input === publishTitleElement) {
        const publishButton = document.getElementById('btn-post-to-reddit');
        if (publishButton && !publishButton.disabled) {
          publishButton.click();
        }
      } else if (input === commentMessageElement) {
        const commentButton = document.getElementById('btn-post-comment');
        if (commentButton && !commentButton.disabled) {
          commentButton.click();
        }
      }
    });
  });

  // Handle visual viewport changes (modern approach)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const focusedElement = document.activeElement;
      if (focusedElement && (focusedElement.tagName === 'TEXTAREA' || focusedElement.tagName === 'INPUT')) {
        const modal = focusedElement.closest('.game-creation, .game-modification, .game-publishing');
        if (modal) {
          if (window.visualViewport.height < window.innerHeight * 0.8) {
            modal.classList.add('keyboard-visible');
          } else {
            modal.classList.remove('keyboard-visible');
          }
        }
      }
    });
  }
}

// Edit history management
function saveToEditHistory(gameData) {
  // Remove any versions after current index (when doing undo then new edit)
  editHistory.versions = editHistory.versions.slice(0, editHistory.currentIndex + 1);

  // Add new version
  editHistory.versions.push(JSON.parse(JSON.stringify(gameData)));
  editHistory.currentIndex = editHistory.versions.length - 1;

  // Keep only last 10 versions to save memory
  if (editHistory.versions.length > 10) {
    editHistory.versions.shift();
    editHistory.currentIndex--;
  }

  // Save to localStorage
  localStorage.setItem('editHistory', JSON.stringify(editHistory));
}

function updateEditButtons() {
  const canUndo = editHistory.currentIndex > 0;
  const canRedo = editHistory.currentIndex < editHistory.versions.length - 1;

  if (undoEditButton) {
    undoEditButton.disabled = !canUndo;
    undoEditButton.classList.toggle("disabled", !canUndo);
  }
  if (redoEditButton) {
    redoEditButton.disabled = !canRedo;
    redoEditButton.classList.toggle("disabled", !canRedo);
  }
}

function undoEdit() {
  if (editHistory.currentIndex > 0) {
    editHistory.currentIndex--;
    currentGameData = JSON.parse(JSON.stringify(editHistory.versions[editHistory.currentIndex]));
    updateEditButtons();
    localStorage.setItem('editHistory', JSON.stringify(editHistory));

    // Show the prompt that will take you to the NEXT version (not the prompt that created current version)
    const nextVersion = editHistory.versions[editHistory.currentIndex + 1];
    gameDescriptionElement.value = nextVersion?.description || currentGameData.description || "";

    // Reload the game with previous version (keep modal open)
    reloadGameInPlace();
  }
}

function redoEdit() {
  if (editHistory.currentIndex < editHistory.versions.length - 1) {
    editHistory.currentIndex++;
    currentGameData = JSON.parse(JSON.stringify(editHistory.versions[editHistory.currentIndex]));
    updateEditButtons();
    localStorage.setItem('editHistory', JSON.stringify(editHistory));

    // Show the prompt that created this version (the one we just redid to)
    gameDescriptionElement.value = currentGameData.description || "";

    // Reload the game with next version (keep modal open)
    reloadGameInPlace();
  }
}

function startEditMode() {
  if (!currentGameData) {
    return;
  }

  isEditMode = true;

  // Initialize edit history if starting fresh (editing existing game)
  if (editHistory.versions.length === 0) {
    saveToEditHistory(currentGameData);
  }

  updateEditButtons();
  showGameCreation();
}

// Check for force_mobile URL parameter to show touch controls on desktop
function checkForceMobileFlag() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('force_mobile') === 'true' || urlParams.get('force_mobile') === '1') {
    document.body.classList.add('force-mobile');
    console.log('🎮 Force mobile mode enabled - touch controls visible on desktop');
  }
}

// Global ESC key handler to close/cancel modals
function setupEscapeKeyHandler() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    // Check which modal is open first (priority order)
    // For high score comment modal, always close immediately (even if textarea is focused)
    if (highScoreCommentElement && highScoreCommentElement.style.display !== 'none') {
      // Skip comment
      const skipButton = document.getElementById('btn-skip-comment');
      if (skipButton && !skipButton.disabled) {
        skipButton.click();
        e.preventDefault();
      }
      return;
    }

    // For other modals, check if typing in an input/textarea first
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA'
    )) {
      // Just blur the input, don't close modal
      activeElement.blur();
      e.preventDefault();
      return;
    }

    // Check which modal is open and close it (in priority order)
    if (gameCreationElement && gameCreationElement.style.display !== 'none') {
      // Cancel game creation/editing
      const cancelButton = document.getElementById('btn-cancel-creation');
      if (cancelButton && !cancelButton.disabled) {
        cancelButton.click();
        e.preventDefault();
      }
    } else if (gamePublishingElement && gamePublishingElement.style.display !== 'none') {
      // Back from publishing
      const backButton = document.getElementById('btn-back-to-game');
      if (backButton && !backButton.disabled) {
        backButton.click();
        e.preventDefault();
      }
    } else if (devMenuElement && devMenuElement.style.display !== 'none') {
      // Close dev menu
      hideAllModals();
      e.preventDefault();
    } else {
      const newGameConfirmElement = document.getElementById('new-game-confirm');
      if (newGameConfirmElement && newGameConfirmElement.style.display !== 'none') {
        // Cancel new game confirmation
        hideNewGameConfirmation();
        e.preventDefault();
      }
    }
  });
}

// Initialize everything
checkForceMobileFlag();
initializeConsole();
fetchInitialData();
setupMobileKeyboardHandling();
setupEscapeKeyHandler();
updateShareButtonState();