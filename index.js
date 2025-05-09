// index.js
/*
 * Matiks Automation Script
 * For educational and security testing purposes only, demonstrating advanced interactions
 * with WebSocket and GraphQL APIs. Explores client-side encryption practices to promote
 * better security design. Use solely in compliance with Matiks' Terms of Service and
 * applicable laws. The author has adhered to responsible disclosure principles and is
 * not liable for any misuse or unauthorized actions.
 */
require("dotenv").config();
const { program } = require("commander");
const { addLog, saveLogs, extractTokenFromUri, extractGameId } = require("./utils");
const { fetchGameId, fetchEncryptedQuestions, parseAndSolveQuestions, listener, sender } = require("./gameLogic");

// Validate URL format
function validateGameUrl(url) {
  const pattern = /^https:\/\/www\.matiks\.com\/game\/[0-9a-f]{24}\/play$/;
  if (!pattern.test(url)) {
    throw new Error("Invalid game URL. Must be in the format: https://www.matiks.com/game/<24-character-id>/play");
  }
  return url;
}

// Main automation function
async function main(uri, userId, gameUrl = null) {
  // Validate environment variables
  if (!uri || !userId) {
    await addLog("ERROR", "URI or USER_ID not provided in .env file");
    throw new Error("Missing URI or USER_ID");
  }

  // Extract JWT token from URI
  let token;
  try {
    token = extractTokenFromUri(uri);
  } catch (e) {
    await addLog("ERROR", "Invalid URI or token", { error: e.message });
    throw e;
  }

  // HTTP headers with dynamic token
  const headers = {
    accept: "*/*",
    "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
    authorization: `Bearer ${token}`,
    "cache-control": "no-cache",
    "content-type": "application/json",
    origin: "https://www.matiks.com",
    pragma: "no-cache",
    priority: "u=1, i",
    referer: "https://www.matiks.com/",
    "sec-ch-ua": '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "x-timezone": "Asia/Calcutta",
  };

  // AES key for decrypting questions
  const aesKey = "S1E9C5R@E@T*K)E(YS1E9C5R^E@T*K)E";

  let gameId;
  let extractedGameId;
  try {
    // Step 1: Find game or use provided game URL
    if (gameUrl) {
      // Validate and use provided game URL
      await addLog("INFO", `Using provided game URL: ${gameUrl}`);
      validateGameUrl(gameUrl); // Ensure URL is valid
      extractedGameId = extractGameId(gameUrl);
      gameId = extractedGameId;
      await addLog("INFO", `Extracted gameId: ${extractedGameId}`, { game_id: extractedGameId });
    } else {
      // Search for a new game
      await addLog("INFO", "Starting game search");
      const userChannel = `USER_EVENT_${userId}`;
      gameId = await fetchGameId(userChannel, uri, headers);
      if (!gameId) {
        await addLog("ERROR", "Failed to retrieve gameId");
        throw new Error("Failed to retrieve gameId");
      }
      const formedGameUrl = `https://www.matiks.com/game/${gameId}/play`;
      await addLog("INFO", `Game URL formed: ${formedGameUrl}`, { game_url: formedGameUrl });
      extractedGameId = extractGameId(formedGameUrl);
      await addLog("INFO", `Extracted gameId: ${extractedGameId}`, { game_id: extractedGameId });
    }

    // Step 2: Play the game
    await addLog("INFO", "Starting gameplay");
    const channel = `GAME_EVENT_${extractedGameId}_V2`;
    const encryptedQuestions = await fetchEncryptedQuestions(extractedGameId, headers);
    const answers = parseAndSolveQuestions(encryptedQuestions, aesKey, userId);

    const sharedState = {
      current_question_sequence: 0,
      your_correct_count: 0,
      game_ended: false,
      game_started: false,
      answer_processed: false,
    };

    const startTime = Date.now();
    await Promise.all([listener(uri, channel, userId, headers, sharedState), sender(uri, channel, extractedGameId, userId, headers, answers, sharedState)]);

    const endTime = Date.now();
    await addLog("INFO", `Game ended in ${(endTime - startTime) / 1000} seconds`, {
      duration: (endTime - startTime) / 1000,
    });

    // Step 3: Output result URL
    const resultUrl = `https://www.matiks.com/game/${extractedGameId}/result`;
    await addLog("INFO", `Game Result URL: ${resultUrl}`, { result_url: resultUrl });
    await addLog("INFO", `Open ${resultUrl} in a browser to view the final score`);
  } catch (e) {
    await addLog("ERROR", "Error during automation", { error: e.message });
    await addLog("ERROR", "Check token validity in browser's Network tab or try during peak hours");
    throw e;
  } finally {
    await saveLogs();
  }
}

// CLI setup with commander
program
  .version("1.0.0")
  .description("Matiks Automation CLI for educational and security testing")
  .option("--autoplay", "Automatically discover and analyze a Matiks game")
  .option("--game <url>", "Analyze a specific Matiks game using the full game URL (e.g., https://www.matiks.com/game/<gameId>/play)")
  .action(async (options) => {
    if (!options.autoplay && !options.game) {
      console.error("Error: You must specify either --autoplay or --game <url>");
      program.help();
      process.exit(1);
    }
    if (options.autoplay && options.game) {
      console.error("Error: Cannot use both --autoplay and --game together");
      program.help();
      process.exit(1);
    }

    try {
      if (options.autoplay) {
        await main(process.env.URI, process.env.USER_ID);
      } else if (options.game) {
        await main(process.env.URI, process.env.USER_ID, options.game);
      }
    } catch (e) {
      await addLog("ERROR", "CLI execution failed", { error: e.message });
      await saveLogs();
      process.exit(1);
    }
  });

// Parse CLI arguments
program.parse(process.argv);
