import { navigateTo } from "@devvit/web/client";
import { getGameRunner } from "./game-runner.js";
import { getQuickJS, RELEASE_SYNC } from "quickjs-emscripten";

const titleElement = document.getElementById("title");
const gameInfoElement = document.getElementById("game-info");
const currentGameNameElement = document.getElementById("current-game-name");
const leaderboardElement = document.getElementById("leaderboard");
const scoresListElement = document.getElementById("scores-list");

// Game creation elements
const gameCreationElement = document.getElementById("game-creation");
const gamePreviewElement = document.getElementById("game-preview");
const gameModificationElement = document.getElementById("game-modification");
const gamePublishingElement = document.getElementById("game-publishing");

const gameDescriptionElement = document.getElementById("game-description");
const modificationPromptElement = document.getElementById("modification-prompt");
const publishTitleElement = document.getElementById("publish-title");
const publishMessageElement = document.getElementById("publish-message");

const generationStatusElement = document.getElementById("generation-status");
const modificationStatusElement = document.getElementById("modification-status");
const publishingStatusElement = document.getElementById("publishing-status");

const previewCanvasElement = document.getElementById("preview-canvas");
const previewScoreElement = document.getElementById("preview-score");
const previewLivesElement = document.getElementById("preview-lives");
const publishCurrentButton = document.getElementById("btn-publish-current");

// Current game state
let currentGameData = null;
let previewGameRunner = null;
let isGeneratedGame = false;

const docsLink = document.getElementById("docs-link");
const playtestLink = document.getElementById("playtest-link");
const discordLink = document.getElementById("discord-link");

docsLink.addEventListener("click", () => {
  navigateTo("https://developers.reddit.com/docs");
});

playtestLink.addEventListener("click", () => {
  navigateTo("https://www.reddit.com/r/Devvit");
});

discordLink.addEventListener("click", () => {
  navigateTo("https://discord.com/invite/R7yu2wh9Qz");
});

let currentPostId = null;
let currentUsername = null;
let gameRunner;
let currentHighScores = [];

async function initializeConsole() {
  try {
    gameRunner = getGameRunner("console-canvas", "sprite-canvas");
    await gameRunner.initialize();
    console.log("Game runner initialized");
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
      titleElement.textContent = `Hey ${data.username} 👋`;

      if (data.gameDefinition && data.gameDefinition.gameCode) {
        // Load all games via QuickJS runner
        await gameRunner.loadCode(data.gameDefinition.gameCode);
        gameInfoElement.textContent = "🎮 Game loaded! Use arrow keys to play.";
        gameInfoElement.style.color = "#4caf50";
        showGameReadyState();
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
      // Both AI-generated and test games now return { gameCode }
      // Load the raw game code directly into QuickJS
      await gameRunner.loadCode(data.gameDefinition.gameCode);
      gameInfoElement.textContent = `🎮 Test game "${gameName}" loaded! Use arrow keys to play.`;
      gameInfoElement.style.color = "#4caf50";
    }
  } catch (error) {
    console.error(`Error loading test game "${gameName}":`, error);
    gameInfoElement.textContent = `Failed to load test game: ${error.message}`;
    gameInfoElement.style.color = "#f44336";
  }
}

async function submitScore(score) {
  if (!currentPostId || !currentUsername) return;

  try {
    const request = { score };
    const response = await fetch("/api/score/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    currentHighScores = data.highScores;

    if (data.isHighScore) {
      alert(`New high score! Rank #${data.newRank}`);
    }
  } catch (error) {
    console.error("Error submitting score:", error);
  }
}

async function loadLeaderboard() {
  try {
    const response = await fetch("/api/leaderboard");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    currentHighScores = data.highScores;
    displayLeaderboard();
  } catch (error) {
    console.error("Error loading leaderboard:", error);
  }
}

function displayLeaderboard() {
  scoresListElement.innerHTML = "";

  if (currentHighScores.length === 0) {
    scoresListElement.innerHTML = "<p>No scores yet!</p>";
  } else {
    const list = document.createElement("ol");
    currentHighScores.forEach(score => {
      const item = document.createElement("li");
      item.innerHTML = `
        <span class="username">${score.username}</span>
        <span class="score">${score.score}</span>
        <span class="date">${new Date(score.timestamp).toLocaleDateString()}</span>
      `;
      list.appendChild(item);
    });
    scoresListElement.appendChild(list);
  }

  leaderboardElement.style.display = "block";
}


function hideLeaderboard() {
  leaderboardElement.style.display = "none";
}

// Step 1: Game Creation
function showGameCreation() {
  gameCreationElement.style.display = "block";
  document.body.classList.add("game-creation-active");
  gameDescriptionElement.focus();
}

function hideAllModals() {
  gameCreationElement.style.display = "none";
  gamePreviewElement.style.display = "none";
  gameModificationElement.style.display = "none";
  gamePublishingElement.style.display = "none";

  document.body.classList.remove(
    "game-creation-active",
    "game-preview-active",
    "game-modification-active",
    "game-publishing-active"
  );

  // Clear forms
  gameDescriptionElement.value = "";
  modificationPromptElement.value = "";
  publishTitleElement.value = "";
  publishMessageElement.value = "";

  // Hide status messages
  generationStatusElement.style.display = "none";
  modificationStatusElement.style.display = "none";
  publishingStatusElement.style.display = "none";
}

function resetGameState() {
  isGeneratedGame = false;
  currentGameData = null;
  publishCurrentButton.style.display = "none";
  currentGameNameElement.textContent = "None";
}

function showGenerationStatus(message, type = "loading") {
  generationStatusElement.textContent = message;
  generationStatusElement.className = `post-status ${type}`;
  generationStatusElement.style.display = "block";
}

function showModificationStatus(message, type = "loading") {
  modificationStatusElement.textContent = message;
  modificationStatusElement.className = `post-status ${type}`;
  modificationStatusElement.style.display = "block";
}

function showPublishingStatus(message, type = "loading") {
  publishingStatusElement.textContent = message;
  publishingStatusElement.className = `post-status ${type}`;
  publishingStatusElement.style.display = "block";
}

async function generateGame() {
  const description = gameDescriptionElement.value.trim();

  if (!description) {
    showGenerationStatus("Please describe your game!", "error");
    return;
  }

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

    // Show the preview
    await showGamePreview();

  } catch (error) {
    console.error("Error generating game:", error);
    showGenerationStatus(`Error: ${error.message}`, "error");
  }
}

async function showGamePreview() {
  try {
    showGenerationStatus("Loading your game...", "loading");

    // Load the game into the main console
    await gameRunner.loadCode(currentGameData.gameCode);

    // Mark this as a generated game
    isGeneratedGame = true;

    // Update the main UI
    currentGameNameElement.textContent = "Generated Game";
    gameInfoElement.textContent = "Game generated! Use arrow keys to play. Press START to begin!";
    gameInfoElement.style.color = "#4caf50";

    // Show the publish button
    publishCurrentButton.style.display = "inline-block";

    // Hide the creation modal and return to main view
    hideAllModals();

    // Show success message briefly
    setTimeout(() => {
      gameInfoElement.textContent = "Game ready! Press START to play. Like it? Click 'Publish This Game'!";
    }, 2000);

  } catch (error) {
    console.error("Error loading generated game:", error);
    showGenerationStatus(`Error loading game: ${error.message}`, "error");
  }
}

// Game iteration functions
function showGameModification() {
  gamePreviewElement.style.display = "none";
  document.body.classList.remove("game-preview-active");

  gameModificationElement.style.display = "block";
  document.body.classList.add("game-modification-active");
  modificationPromptElement.focus();
}

async function updateGame() {
  const modification = modificationPromptElement.value.trim();

  if (!modification) {
    showModificationStatus("Please describe what you'd like to change!", "error");
    return;
  }

  try {
    showModificationStatus("Updating your game...", "loading");

    const description = `${currentGameData.originalDescription}. Modification: ${modification}`;

    const response = await fetch("/api/game/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      throw new Error(`Game update failed: ${response.status}`);
    }

    const gameData = await response.json();

    if (gameData.type !== "generate" || !gameData.gameDefinition?.gameCode) {
      throw new Error("Invalid game update response");
    }

    // Update current game data
    currentGameData = {
      ...gameData.gameDefinition,
      originalDescription: currentGameData.originalDescription
    };

    // Show updated preview
    await showGamePreview();

  } catch (error) {
    console.error("Error updating game:", error);
    showModificationStatus(`Error: ${error.message}`, "error");
  }
}

function showGamePublishing() {
  // Can be called from preview modal or main console
  if (gamePreviewElement.style.display !== "none") {
    gamePreviewElement.style.display = "none";
    document.body.classList.remove("game-preview-active");
  }

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

// Screenshot capture function
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

      // Capture the main console canvas
      const canvas = document.getElementById("console-canvas");
      return canvas.toDataURL('image/png');
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

  try {
    showPublishingStatus("Capturing screenshot...", "loading");

    // Capture screenshot of the game
    const screenshot = await captureGameScreenshot();

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
document.getElementById("btn-create-post")?.addEventListener("click", () => {
  resetGameState();
  showGameCreation();
});
document.getElementById("btn-publish-current")?.addEventListener("click", showGamePublishingFromMain);
document.getElementById("btn-leaderboard")?.addEventListener("click", loadLeaderboard);
document.getElementById("btn-close-leaderboard")?.addEventListener("click", hideLeaderboard);

// Game creation flow event listeners
document.getElementById("btn-generate-game")?.addEventListener("click", generateGame);
document.getElementById("btn-cancel-creation")?.addEventListener("click", hideAllModals);

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

// Game modification event listeners
document.getElementById("btn-update-game")?.addEventListener("click", updateGame);
document.getElementById("btn-back-to-preview")?.addEventListener("click", () => {
  gameModificationElement.style.display = "none";
  document.body.classList.remove("game-modification-active");
  gamePreviewElement.style.display = "block";
  document.body.classList.add("game-preview-active");
});

// Game publishing event listeners
document.getElementById("btn-post-to-reddit")?.addEventListener("click", publishGameToReddit);
document.getElementById("btn-back-to-game")?.addEventListener("click", () => {
  gamePublishingElement.style.display = "none";
  document.body.classList.remove("game-publishing-active");
  gamePreviewElement.style.display = "block";
  document.body.classList.add("game-preview-active");
});

// Tech test buttons
document.getElementById("btn-test-quickjs")?.addEventListener("click", testQuickJS);

// Test game buttons
document.getElementById("btn-test-movement")?.addEventListener("click", () => {
  loadTestGame("simple-movement");
});

document.getElementById("btn-test-pong")?.addEventListener("click", () => {
  loadTestGame("pong");
});

document.getElementById("btn-test-platformer")?.addEventListener("click", () => {
  loadTestGame("platformer");
});


document.getElementById("btn-start")?.addEventListener("click", () => {
  if (gameRunner) {
    gameRunner.startGame();
  }
});

// Custom game event for score submission
document.addEventListener("gameOver", (event) => {
  const finalScore = event.detail.score;
  submitScore(finalScore);
});

// Initialize everything
initializeConsole();
fetchInitialData();