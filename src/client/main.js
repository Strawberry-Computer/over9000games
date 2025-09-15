import { navigateTo } from "@devvit/web/client";
import { NESConsole } from "./console.js";
import { getGameRunner } from "./quickjs-game-runner.js";
import { getQuickJS } from "quickjs-emscripten";

const titleElement = document.getElementById("title");
const gameInfoElement = document.getElementById("game-info");
const currentGameNameElement = document.getElementById("current-game-name");
const gamePromptElement = document.getElementById("game-prompt");
const leaderboardElement = document.getElementById("leaderboard");
const scoresListElement = document.getElementById("scores-list");
const gameDescriptionElement = document.getElementById("game-description");

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
let gameConsole;
let gameRunner;
let currentHighScores = [];

async function initializeConsole() {
  try {
    gameConsole = new NESConsole("console-canvas", "sprite-canvas");
    gameRunner = getGameRunner(gameConsole);
    await gameRunner.initialize();
    console.log("Console and QuickJS game runner initialized");
  } catch (error) {
    console.error("Failed to initialize console:", error);
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

      if (data.gameDefinition) {
        loadGame(data.gameDefinition);
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

function loadGame(gameDefinition) {
  currentGameNameElement.textContent = gameDefinition.name;
  gameInfoElement.textContent = gameDefinition.description;

  if (gameConsole) {
    gameConsole.loadGame(gameDefinition);
    showGameReadyState();
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

async function loadQuickJSGame(gameDefinition) {
  try {
    if (!gameRunner) {
      throw new Error("Game runner not initialized");
    }

    console.log("Loading QuickJS game:", gameDefinition.metadata?.title || "Untitled");
    await gameRunner.loadGame(gameDefinition);

    // Update UI with game info
    if (gameDefinition.metadata) {
      titleElement.textContent = gameDefinition.metadata.title || "Generated Game";
      gameInfoElement.textContent = gameDefinition.metadata.description || "A dynamically generated game";
      gameInfoElement.style.color = "#4CAF50";
    }

    console.log("QuickJS game loaded successfully");
  } catch (error) {
    console.error("Failed to load QuickJS game:", error);
    gameInfoElement.textContent = `Failed to load game: ${error.message}`;
    gameInfoElement.style.color = "#f44336";
    throw error;
  }
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
    if (data.type === "generate") {
      await loadQuickJSGame(data.gameDefinition);
      hideGamePrompt();
    }
  } catch (error) {
    console.error("Error generating game:", error);
    alert("Failed to generate game. Please try again.");
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

// WASM test function
async function testWasm() {
  try {
    console.log("Testing WASM execution...");
    gameInfoElement.textContent = "Testing WASM execution...";

    // Try different paths for the WASM file
    let wasmResponse;
    const possiblePaths = ["/test.wasm", "./test.wasm", "test.wasm"];

    for (const path of possiblePaths) {
      try {
        console.log(`Trying to fetch WASM from: ${path}`);
        wasmResponse = await fetch(path);
        if (wasmResponse.ok) {
          console.log(`Successfully fetched WASM from: ${path}`);
          break;
        }
      } catch (e) {
        console.log(`Failed to fetch from ${path}:`, e.message);
      }
    }

    if (!wasmResponse || !wasmResponse.ok) {
      throw new Error(`Failed to fetch WASM from any path. Last status: ${wasmResponse?.status || 'unknown'}`);
    }

    const wasmBytes = await wasmResponse.arrayBuffer();
    console.log("WASM file loaded, size:", wasmBytes.byteLength, "bytes");
    gameInfoElement.textContent = `WASM file loaded (${wasmBytes.byteLength} bytes), compiling...`;

    // Compile and instantiate the WASM module
    const wasmModule = await WebAssembly.compile(wasmBytes);
    console.log("WASM module compiled successfully!");
    gameInfoElement.textContent = "WASM module compiled, instantiating...";

    const wasmInstance = await WebAssembly.instantiate(wasmModule);
    console.log("WASM module instantiated successfully!");
    gameInfoElement.textContent = "WASM module instantiated, testing functions...";

    // Test the exported functions
    const addResult = wasmInstance.exports.add(5, 3);
    const multiplyResult = wasmInstance.exports.multiply(4, 7);

    console.log("WASM add(5, 3) =", addResult);
    console.log("WASM multiply(4, 7) =", multiplyResult);

    if (addResult === 8 && multiplyResult === 28) {
      const successMessage = `✅ WASM Test PASSED! add(5, 3) = ${addResult}, multiply(4, 7) = ${multiplyResult}`;
      console.log(successMessage);
      gameInfoElement.textContent = "🎉 WASM execution test PASSED! Dynamic code execution works!";
      gameInfoElement.style.color = "#4CAF50";
    } else {
      const failMessage = `❌ WASM Test FAILED! Expected: add=8, multiply=28. Got: add=${addResult}, multiply=${multiplyResult}`;
      console.log(failMessage);
      gameInfoElement.textContent = "❌ WASM test failed - unexpected results";
      gameInfoElement.style.color = "#f44336";
    }

  } catch (error) {
    console.error("WASM test failed:", error);
    gameInfoElement.textContent = `❌ WASM test failed: ${error.message}`;
    gameInfoElement.style.color = "#f44336";
  }
}

// QuickJS test function
async function testQuickJS() {
  try {
    console.log("Testing QuickJS execution...");
    gameInfoElement.textContent = "Testing QuickJS execution...";

    // Initialize QuickJS
    const QuickJS = await getQuickJS();
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
document.getElementById("btn-leaderboard")?.addEventListener("click", loadLeaderboard);
document.getElementById("btn-test-wasm")?.addEventListener("click", testWasm);
document.getElementById("btn-test-quickjs")?.addEventListener("click", testQuickJS);
document.getElementById("btn-cancel")?.addEventListener("click", hideGamePrompt);
document.getElementById("btn-close-leaderboard")?.addEventListener("click", hideLeaderboard);

document.getElementById("btn-generate")?.addEventListener("click", () => {
  const description = gameDescriptionElement.value.trim();
  if (description) {
    generateGame(description);
  }
});

document.getElementById("btn-start")?.addEventListener("click", () => {
  if (gameRunner) {
    gameRunner.startGame();
  } else if (gameConsole) {
    gameConsole.startGame();
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