import { navigateTo } from "@devvit/web/client";
import { getGameRunner } from "./game-runner.js";
import { getQuickJS, RELEASE_SYNC } from "quickjs-emscripten";

const titleElement = document.getElementById("title");
const gameInfoElement = document.getElementById("game-info");
const currentGameNameElement = document.getElementById("current-game-name");
const gamePromptElement = document.getElementById("game-prompt");
const leaderboardElement = document.getElementById("leaderboard");
const scoresListElement = document.getElementById("scores-list");
const gameDescriptionElement = document.getElementById("game-description");

// Post creation elements
const postCreationElement = document.getElementById("post-creation");
const postGameDescriptionElement = document.getElementById("post-game-description");
const postGameTitleElement = document.getElementById("post-game-title");
const postMessageElement = document.getElementById("post-message");
const postStatusElement = document.getElementById("post-status");

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


async function generateGame(description) {
  try {
    const request = { description };
    const response = await fetch("/api/game/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received game definition from server:", data.gameDefinition);

    if (data.type === "generate") {
      // AI-generated games return { gameCode }
      // Load the raw game code directly into QuickJS
      await gameRunner.loadCode(data.gameDefinition.gameCode);
      gameInfoElement.textContent = "🎮 AI-generated game loaded! Use arrow keys to play.";
      gameInfoElement.style.color = "#4caf50";
      hideGamePrompt();
    }
  } catch (error) {
    console.error("Error generating game:", error);

    let errorMessage = "Failed to generate game. Please try again.";
    if (error.message && error.message.includes('OpenAI API key')) {
      errorMessage = "OpenAI API key not configured. Please contact an admin to set up the API key in app settings.";
    }

    gameInfoElement.textContent = errorMessage;
    gameInfoElement.style.color = "#f44336";
  }
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

function showGamePrompt() {
  gamePromptElement.style.display = "block";
  gameDescriptionElement.focus();
}

function hideGamePrompt() {
  gamePromptElement.style.display = "none";
  gameDescriptionElement.value = "";
}

function hideLeaderboard() {
  leaderboardElement.style.display = "none";
}

function showPostCreation() {
  postCreationElement.style.display = "block";
  document.body.classList.add("post-creation-active");
  postGameDescriptionElement.focus();
}

function hidePostCreation() {
  postCreationElement.style.display = "none";
  document.body.classList.remove("post-creation-active");
  postGameDescriptionElement.value = "";
  postGameTitleElement.value = "";
  postMessageElement.value = "";
  postStatusElement.style.display = "none";
  postStatusElement.className = "post-status";
}

function showPostStatus(message, type = "loading") {
  postStatusElement.textContent = message;
  postStatusElement.className = `post-status ${type}`;
  postStatusElement.style.display = "block";
}

async function createAndPostGame() {
  const gameDescription = postGameDescriptionElement.value.trim();
  const gameTitle = postGameTitleElement.value.trim();
  const postMessage = postMessageElement.value.trim();

  if (!gameDescription) {
    showPostStatus("Please describe your game!", "error");
    return;
  }

  if (!gameTitle) {
    showPostStatus("Please give your game a title!", "error");
    return;
  }

  try {
    // Step 1: Generate the game
    showPostStatus("🤖 Generating your game...", "loading");

    const generateResponse = await fetch("/api/game/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: gameDescription }),
    });

    if (!generateResponse.ok) {
      throw new Error(`Game generation failed: ${generateResponse.status}`);
    }

    const gameData = await generateResponse.json();

    if (gameData.type !== "generate" || !gameData.gameDefinition?.gameCode) {
      throw new Error("Invalid game generation response");
    }

    // Step 2: Test the game locally (optional preview)
    showPostStatus("✓ Game generated! Testing...", "loading");
    await gameRunner.loadCode(gameData.gameDefinition.gameCode);

    // Step 3: Create the post
    showPostStatus("📝 Creating Reddit post...", "loading");

    const postResponse = await fetch("/api/post/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: gameTitle,
        message: postMessage || `Just created "${gameTitle}"! Try to beat my high score! 🎮`,
        gameDefinition: gameData.gameDefinition,
        gameDescription: gameDescription
      }),
    });

    if (!postResponse.ok) {
      throw new Error(`Post creation failed: ${postResponse.status}`);
    }

    const postData = await postResponse.json();

    if (postData.success) {
      showPostStatus(`🎉 Game posted successfully! Post ID: ${postData.postId}`, "success");

      // Auto-close after 3 seconds
      setTimeout(() => {
        hidePostCreation();
      }, 3000);
    } else {
      throw new Error(postData.error || "Failed to create post");
    }

  } catch (error) {
    console.error("Error creating and posting game:", error);
    showPostStatus(`❌ Error: ${error.message}`, "error");
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
document.getElementById("btn-new-game")?.addEventListener("click", showGamePrompt);
document.getElementById("btn-create-post")?.addEventListener("click", showPostCreation);
document.getElementById("btn-leaderboard")?.addEventListener("click", loadLeaderboard);
document.getElementById("btn-cancel")?.addEventListener("click", hideGamePrompt);
document.getElementById("btn-cancel-post")?.addEventListener("click", hidePostCreation);
document.getElementById("btn-close-leaderboard")?.addEventListener("click", hideLeaderboard);
document.getElementById("btn-create-and-post")?.addEventListener("click", createAndPostGame);

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

document.getElementById("btn-generate")?.addEventListener("click", () => {
  const description = gameDescriptionElement.value.trim();
  if (description) {
    generateGame(description);
  }
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