import { navigateTo } from "@devvit/web/client";
import { getGameRunner } from "./game-runner.js";
import { getQuickJS, RELEASE_SYNC } from "quickjs-emscripten";
import { DraftManager } from "./draft-manager.js";

const titleElement = document.getElementById("title");
const gameInfoElement = document.getElementById("game-info");
const currentGameNameElement = document.getElementById("current-game-name");
const scoresListElement = document.getElementById("scores-list"); // Legacy, may be removed

// Game creation elements
const gameCreationElement = document.getElementById("game-creation");
const gamePublishingElement = document.getElementById("game-publishing");
const devMenuElement = document.getElementById("dev-menu");

const gameDescriptionElement = document.getElementById("game-description");
const publishTitleElement = document.getElementById("publish-title");
const publishMessageElement = document.getElementById("publish-message");

const generationStatusElement = document.getElementById("generation-status");
const publishingStatusElement = document.getElementById("publishing-status");

const publishCurrentButton = document.getElementById("btn-publish-current");

// Current game state
let currentGameData = null;
let isGeneratedGame = false;
let draftManager = null;


let currentPostId = null;
let currentUsername = null;
let gameRunner;
let currentHighScores = [];

function initializeConsole() {
  try {
    gameRunner = getGameRunner("console-canvas", "sprite-canvas");
    console.log("Game runner created");

    // Initialize draft manager
    draftManager = new DraftManager();

    console.log("Draft manager initialized");
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

    if (data.type === "init") {
      currentPostId = data.postId;
      currentUsername = data.username;
      currentHighScores = data.highScores;

      if (data.gameDefinition && data.gameDefinition.gameCode) {
        // Store the game data for restart functionality
        currentGameData = data.gameDefinition;

        // Load all games via QuickJS runner
        await gameRunner.loadCode(data.gameDefinition.gameCode);
        gameInfoElement.textContent = "Game loaded! Playing...";
        gameInfoElement.style.color = "#00ff00";
        // Auto-start the game
        gameRunner.startGame();
      } else {
        showNoGameState();
      }
    } else {
      console.error("Invalid response type from /api/init", data);
      showErrorState("Failed to load game data");
    }
  } catch (error) {
    console.error("Error fetching initial data:", error);
    showErrorState("Connection error");
  }
}

function showNoGameState() {
  currentGameNameElement.textContent = "None";
  gameInfoElement.textContent = "No game available. Generate a new game to start playing!";
}

function showErrorState(message) {
  currentGameNameElement.textContent = "Error";
  gameInfoElement.textContent = message;
}

function showGameReadyState() {
  gameInfoElement.textContent += " - Press START to play!";
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
        originalDescription: `Test game: ${gameName}`
      };

      // Load the raw game code directly into QuickJS
      await gameRunner.loadCode(data.gameDefinition.gameCode);
      gameInfoElement.textContent = `Test game "${gameName}" loaded! Playing...`;
      gameInfoElement.style.color = "#00ff00";
      currentGameNameElement.textContent = gameName;

      // Auto-start the game
      gameRunner.startGame();
    }
  } catch (error) {
    console.error(`Error loading test game "${gameName}":`, error);
    gameInfoElement.textContent = `Failed to load test game: ${error.message}`;
    gameInfoElement.style.color = "#f44336";
  }
}

async function submitScore(score) {
  console.log("submitScore called with:", score, "postId:", currentPostId, "username:", currentUsername, "isGeneratedGame:", isGeneratedGame);

  // Skip score submission for generated games
  if (isGeneratedGame) {
    console.log("Score submission skipped - generated game (leaderboard disabled)");
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
        gameRunner.setHighScoreMessage(`NEW HIGH SCORE! RANK #${data.newRank}`);
      }
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

    // Display leaderboard on canvas
    if (gameRunner) {
      console.log("loadLeaderboard: calling gameRunner.showLeaderboard");
      gameRunner.showLeaderboard(currentHighScores);
      console.log("loadLeaderboard: gameRunner state", {
        showLeaderboard: gameRunner.state.showLeaderboard,
        gameOver: gameRunner.state.gameOver,
        leaderboardDataLength: gameRunner.leaderboardData?.length
      });
    }

  } catch (error) {
    console.error("Error loading leaderboard:", error);

    // Show empty leaderboard on error
    if (gameRunner) {
      gameRunner.showLeaderboard([]);
    }
  }
}

// Expose functions globally for game runner access
window.loadLeaderboard = loadLeaderboard;
window.submitScore = submitScore;

function restartCurrentGame() {
  if (gameRunner) {
    gameRunner.resetGame();
    gameRunner.startGame();

    // Reset game info display
    const gameInfoElement = document.getElementById('game-info');
    if (gameInfoElement) {
      gameInfoElement.textContent = "Game restarted!";
      gameInfoElement.style.color = "#00ff00";
    }
  }
}

function showGameCreation() {
  gameCreationElement.style.display = "block";
  document.body.classList.add("game-creation-active");
  gameDescriptionElement.focus();
}

function showDevMenu() {
  // If leaderboard is showing, close it instead of opening dev menu
  if (gameRunner && gameRunner.state && gameRunner.state.showLeaderboard) {
    gameRunner.hideLeaderboard();
    return;
  }

  devMenuElement.style.display = "block";
  document.body.classList.add("dev-menu-active");
}

function hideAllModals() {
  gameCreationElement.style.display = "none";
  gamePublishingElement.style.display = "none";
  devMenuElement.style.display = "none";

  document.body.classList.remove(
    "game-creation-active",
    "game-publishing-active",
    "dev-menu-active"
  );

  // Clear forms
  gameDescriptionElement.value = "";
  publishTitleElement.value = "";
  publishMessageElement.value = "";

  // Re-enable form elements
  gameDescriptionElement.disabled = false;
  publishTitleElement.disabled = false;
  publishMessageElement.disabled = false;

  const generateButton = document.getElementById("btn-generate-game");
  const publishButton = document.getElementById("btn-post-to-reddit");

  if (generateButton) {
    generateButton.disabled = false;
    generateButton.classList.remove("disabled");
  }

  if (publishButton) {
    publishButton.disabled = false;
    publishButton.classList.remove("disabled");
  }

  // Hide status messages
  generationStatusElement.style.display = "none";
  publishingStatusElement.style.display = "none";
}

function resetGameState() {
  isGeneratedGame = false;
  currentGameData = null;
  publishCurrentButton.style.display = "none";
  currentGameNameElement.textContent = "None";
  if (gameRunner) {
    gameRunner.setGeneratedGame(false);
  }
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
    showGenerationStatus("Generating your game...", "loading");

    const response = await fetch("/api/game/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      throw new Error(`Game generation failed: ${response.status}`);
    }

    const gameData = await response.json();

    if (gameData.type !== "generate" || !gameData.gameDefinition?.gameCode) {
      throw new Error("Invalid game generation response");
    }

    // Store the generated game
    currentGameData = {
      ...gameData.gameDefinition,
      originalDescription: description
    };

    // Load and show the game immediately
    await showGeneratedGame();

  } catch (error) {
    console.error("Error generating game:", error);
    showGenerationStatus(`Error: ${error.message}`, "error");

    // Re-enable form on error
    gameDescriptionElement.disabled = false;
    generateButton.disabled = false;
    generateButton.classList.remove("disabled");
  }
}

async function showGeneratedGame() {
  try {
    showGenerationStatus("Loading your game...", "loading");

    // Log the full generated game code for debugging
    console.log("=== GENERATED GAME CODE START ===");
    console.log(currentGameData.gameCode);
    console.log("=== GENERATED GAME CODE END ===");
    console.log("Game code length:", currentGameData.gameCode?.length || "undefined");
    console.log("Game code type:", typeof currentGameData.gameCode);

    // Load the game into the main console
    await gameRunner.loadCode(currentGameData.gameCode);

    // Mark this as a generated game
    isGeneratedGame = true;
    gameRunner.setGeneratedGame(true);

    // Update the main UI
    gameInfoElement.textContent = "Game generated! Playing...";
    gameInfoElement.style.color = "#00ff00";

    // Set up screenshot capture after first frame renders
    gameRunner.setFirstFrameCallback(async () => {
      try {
        const screenshot = await captureGameScreenshot();
        if (screenshot) {
          currentGameData.autoScreenshot = screenshot;
          console.log("Auto-screenshot generated after first frame");
        }
      } catch (error) {
        console.error("Error generating auto-screenshot:", error);
      }
    });

    // Start the game to trigger first frame callback
    gameRunner.startGame();

    // Show the publish button
    publishCurrentButton.style.display = "block";

    // Hide the creation modal and return to main view
    hideAllModals();

    // Show success message
    setTimeout(() => {
      gameInfoElement.textContent = "Ready to play! Share your creation!";
    }, 2000);

  } catch (error) {
    console.error("Error loading generated game:", error);
    showGenerationStatus(`Error loading game: ${error.message}`, "error");
  }
}


function showGamePublishing() {
  gamePublishingElement.style.display = "block";
  document.body.classList.add("game-publishing-active");
  publishTitleElement.focus();

  // Auto-suggest a title based on the original description
  if (!publishTitleElement.value && currentGameData?.originalDescription) {
    const words = currentGameData.originalDescription.split(' ').slice(0, 3);
    const suggestedTitle = words.map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    publishTitleElement.value = suggestedTitle;
  }
}

function showGamePublishingFromMain() {
  if (!isGeneratedGame || !currentGameData) {
    gameInfoElement.textContent = "No generated game to publish!";
    gameInfoElement.style.color = "#f44336";
    return;
  }

  showGamePublishing();
}

// Enhanced screenshot capture function with 4x resolution and landscape formatting
async function captureGameScreenshot() {
  try {
    // Run the game for a few frames to get an interesting state
    if (gameRunner && isGeneratedGame) {
      // Let the game run for a bit to get some action
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start the game if not already running
      gameRunner.startGame();

      // Wait a bit more for the game to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the main console canvas
      const sourceCanvas = document.getElementById("console-canvas");
      if (!sourceCanvas) return null;

      // Create high-resolution capture canvas (4x resolution)
      const captureCanvas = document.createElement('canvas');
      const captureCtx = captureCanvas.getContext('2d');

      // Set up 4x scaled canvas (256×256 → 1024×1024)
      captureCanvas.width = 1024;
      captureCanvas.height = 1024;
      captureCtx.imageSmoothingEnabled = false; // Maintain pixel art crispness

      // Scale the source canvas 4x
      captureCtx.drawImage(sourceCanvas, 0, 0, 256, 256, 0, 0, 1024, 1024);

      // Create landscape format canvas for Reddit posts (16:9 aspect ratio)
      const landscapeCanvas = document.createElement('canvas');
      const landscapeCtx = landscapeCanvas.getContext('2d');

      // Landscape dimensions: 1200×675 (16:9)
      landscapeCanvas.width = 1200;
      landscapeCanvas.height = 675;

      // Fill background with dark gradient
      const gradient = landscapeCtx.createLinearGradient(0, 0, 1200, 675);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      landscapeCtx.fillStyle = gradient;
      landscapeCtx.fillRect(0, 0, 1200, 675);

      // Center the game canvas (1024×1024 scaled to fit height: 675×675)
      const gameSize = 675; // Fit to landscape height
      const gameX = (1200 - gameSize) / 2; // Center horizontally
      const gameY = 0; // Top aligned

      landscapeCtx.imageSmoothingEnabled = false;
      landscapeCtx.drawImage(captureCanvas, 0, 0, 1024, 1024, gameX, gameY, gameSize, gameSize);

      // Add branding and game info to side panels
      landscapeCtx.fillStyle = '#ffffff';
      landscapeCtx.font = 'bold 24px monospace';
      landscapeCtx.textAlign = 'center';

      // Left panel text
      const leftPanelX = gameX / 2;
      landscapeCtx.fillText('OVER', leftPanelX, 300);
      landscapeCtx.fillText('9000', leftPanelX, 330);
      landscapeCtx.fillText('GAMES', leftPanelX, 360);

      // Right panel text
      const rightPanelX = gameX + gameSize + (gameX / 2);
      landscapeCtx.fillText('AI-GENERATED', rightPanelX, 300);
      landscapeCtx.fillText('RETRO', rightPanelX, 330);
      landscapeCtx.fillText('GAMES', rightPanelX, 360);

      // Add subtle scanlines effect
      landscapeCtx.fillStyle = 'rgba(0, 255, 0, 0.05)';
      for (let y = 0; y < 675; y += 4) {
        landscapeCtx.fillRect(0, y, 1200, 2);
      }

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
  const message = publishMessageElement.value.trim();

  if (!title) {
    showPublishingStatus("Please give your game a title!", "error");
    return;
  }

  // Disable form during publishing
  const publishButton = document.getElementById("btn-post-to-reddit");

  publishTitleElement.disabled = true;
  publishMessageElement.disabled = true;
  publishButton.disabled = true;
  publishButton.classList.add("disabled");

  try {
    // Use auto-generated screenshot if available, otherwise capture new one
    let screenshot = currentGameData.autoScreenshot;

    if (!screenshot) {
      showPublishingStatus("Capturing screenshot...", "loading");
      screenshot = await captureGameScreenshot();
    } else {
      showPublishingStatus("Using auto-generated screenshot...", "loading");
    }

    showPublishingStatus("Creating Reddit post...", "loading");

    const response = await fetch("/api/post/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        message: message || `Just created "${title}"! Try to beat my high score!`,
        gameDescription: currentGameData.originalDescription,
        gameCode: currentGameData.gameCode,
        screenshot: screenshot // Include screenshot data URI
      }),
    });

    if (!response.ok) {
      throw new Error(`Post creation failed: ${response.status}`);
    }

    const postData = await response.json();

    if (postData.success) {
      showPublishingStatus(`Game posted successfully! Redirecting to post...`, "success");

      // Clear the draft after successful publishing
      if (draftManager) {
        draftManager.updateDraft({
          published: true,
          publishedAt: Date.now(),
          postUrl: postData.postUrl
        }, 'published');
      }

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
    publishMessageElement.disabled = false;
    publishButton.disabled = false;
    publishButton.classList.remove("disabled");
  }
}

// QuickJS test function
async function testQuickJS() {
  try {
    console.log("Testing QuickJS execution...");
    gameInfoElement.textContent = "Testing QuickJS execution...";

    // Initialize QuickJS with synchronous variant
    const QuickJS = await getQuickJS({ variant: RELEASE_SYNC });
    console.log("QuickJS loaded successfully!");
    gameInfoElement.textContent = "QuickJS loaded, creating context...";

    // Create a VM context
    const vm = QuickJS.newContext();
    console.log("QuickJS context created!");
    gameInfoElement.textContent = "QuickJS context created, testing code execution...";

    // Test simple JavaScript execution
    const simpleResult = vm.evalCode("2 + 3");
    console.log("Simple math result:", vm.dump(simpleResult));

    // Test more complex JavaScript
    const complexCode = `
      function factorial(n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      }

      function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
      }

      const result = {
        factorial5: factorial(5),
        fibonacci7: fibonacci(7),
        message: "Hello from QuickJS!"
      };

      JSON.stringify(result);
    `;

    gameInfoElement.textContent = "Executing complex JavaScript code...";
    const complexResult = vm.evalCode(complexCode);

    if (simpleResult.error) {
      throw new Error(`Simple test failed: ${vm.dump(simpleResult.error)}`);
    }

    if (complexResult.error) {
      throw new Error(`Complex test failed: ${vm.dump(complexResult.error)}`);
    }

    const simpleValue = vm.dump(simpleResult.value);
    const complexValue = vm.dump(complexResult.value);

    console.log("Simple result:", simpleValue);
    console.log("Complex result:", complexValue);

    // Parse the JSON result
    const parsedResult = JSON.parse(complexValue);

    // Check results
    if (simpleValue === 5 && parsedResult.factorial5 === 120 && parsedResult.fibonacci7 === 13) {
      const successMessage = `🎉 QuickJS Test PASSED! Simple: ${simpleValue}, Factorial(5): ${parsedResult.factorial5}, Fibonacci(7): ${parsedResult.fibonacci7}`;
      console.log(successMessage);
      gameInfoElement.textContent = "🚀 QuickJS execution test PASSED! Dynamic JavaScript execution works!";
      gameInfoElement.style.color = "#4CAF50";
    } else {
      const failMessage = `❌ QuickJS Test FAILED! Got: simple=${simpleValue}, factorial=${parsedResult.factorial5}, fibonacci=${parsedResult.fibonacci7}`;
      console.log(failMessage);
      gameInfoElement.textContent = "❌ QuickJS test failed - unexpected results";
      gameInfoElement.style.color = "#f44336";
    }

    // Clean up
    simpleResult.dispose();
    complexResult.dispose();
    vm.dispose();

  } catch (error) {
    console.error("QuickJS test failed:", error);
    gameInfoElement.textContent = `❌ QuickJS test failed: ${error.message}`;
    gameInfoElement.style.color = "#f44336";
  }
}



// Event Listeners
document.getElementById("btn-new-game")?.addEventListener("click", () => {
  resetGameState();
  showGameCreation();
});
document.getElementById("btn-restart-game")?.addEventListener("click", async () => {
  if (gameRunner && currentGameData?.gameCode) {
    gameRunner.hideLeaderboard();
    // Reload the game code to completely reset the VM state
    await gameRunner.loadCode(currentGameData.gameCode);
    gameRunner.startGame();
  }
});
document.getElementById("btn-publish-current")?.addEventListener("click", showGamePublishingFromMain);
document.getElementById("btn-leaderboard")?.addEventListener("click", () => {
  if (gameRunner) {
    gameRunner.togglePause();
  }
});
document.getElementById("btn-menu")?.addEventListener("click", showDevMenu);
document.getElementById("btn-close-dev-menu")?.addEventListener("click", hideAllModals);

// Game creation flow event listeners
document.getElementById("btn-generate-game")?.addEventListener("click", generateGame);
document.getElementById("btn-cancel-creation")?.addEventListener("click", hideAllModals);

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

// Game publishing event listeners
document.getElementById("btn-post-to-reddit")?.addEventListener("click", publishGameToReddit);
document.getElementById("btn-back-to-game")?.addEventListener("click", () => {
  gamePublishingElement.style.display = "none";
  document.body.classList.remove("game-publishing-active");
});


// Custom game event for score submission
document.addEventListener("gameOver", (event) => {
  const finalScore = event.detail.score;
  submitScore(finalScore);
});

// Draft UI management
function updateDraftUI() {
  const draftStatusEl = document.getElementById('draft-status');
  const restoreButtonEl = document.getElementById('btn-restore-draft');

  if (!draftManager || !draftStatusEl) return;

  if (draftManager.currentDraftId) {
    const draft = draftManager.loadDraft(draftManager.currentDraftId);
    if (draft) {
      const timeSince = Math.floor((Date.now() - draft.updated) / 1000 / 60); // minutes
      draftStatusEl.textContent = `Draft saved ${timeSince}m ago`;
      draftStatusEl.style.color = '#4caf50';
    }
  } else if (draftManager.hasDrafts()) {
    draftStatusEl.textContent = 'Previous drafts available';
    draftStatusEl.style.color = '#ffc107';
    if (restoreButtonEl) {
      restoreButtonEl.style.display = 'inline-block';
    }
  }
}

// Draft event listeners
document.getElementById("btn-restore-draft")?.addEventListener("click", () => {
  if (draftManager) {
    const restored = draftManager.restoreDraftToUI();
    if (restored) {
      updateDraftUI();
    }
  }
});

document.getElementById("btn-undo-description")?.addEventListener("click", () => {
  if (draftManager) {
    const undoSuccess = draftManager.undo();
    if (undoSuccess) {
      updateDraftUI();
    }
  }
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

// Initialize everything
initializeConsole();
fetchInitialData();
setupMobileKeyboardHandling();