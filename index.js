// index.js
require("dotenv").config();
const { addLog, saveLogs, extractTokenFromUri, extractGameId } = require("./utils");
const { fetchGameId, fetchEncryptedQuestions, parseAndSolveQuestions, listener, sender } = require("./gameLogic");

async function main(uri, userId) {
  // Validate environment variables
  if (!uri || !userId) {
    await addLog("ERROR", "URI or USER_ID not provided in .env file");
    return;
  }

  // Extracting JWT token from URI
  let token;
  try {
    token = extractTokenFromUri(uri);
  } catch (e) {
    await addLog("ERROR", "Invalid URI or token", { error: e.message });
    return;
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

  const userChannel = `USER_EVENT_${userId}`;
  try {
    // Find game and get URL
    await addLog("INFO", "Starting game search");
    const gameId = await fetchGameId(userChannel, uri, headers);
    if (!gameId) {
      await addLog("ERROR", "Failed to retrieve gameId");
      return;
    }
    const gameUrl = `https://www.matiks.com/game/${gameId}/play`;
    await addLog("INFO", `Game URL formed: ${gameUrl}`, { game_url: gameUrl });

    //  Play the game
    await addLog("INFO", "Starting gameplay");
    const extractedGameId = extractGameId(gameUrl);
    await addLog("INFO", `Extracted gameId: ${extractedGameId}`, { game_id: extractedGameId });
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
    await addLog("INFO", `Game ended in ${(endTime - startTime) / 1000} seconds`, { duration: (endTime - startTime) / 1000 });

    //Output result URL
    const resultUrl = `https://www.matiks.com/game/${extractedGameId}/result`;
    await addLog("INFO", `Game Result URL: ${resultUrl}`, { result_url: resultUrl });
    await addLog(
      "INFO",
      `Open ${resultUrl} in a browser to view the final

 score`
    );
  } catch (e) {
    await addLog("ERROR", "Error during automation", { error: e.message });
    await addLog("ERROR", "Check token validity in browser's Network tab or try during peak hours");
  } finally {
    await saveLogs();
  }
}

// Run the script
main(process.env.URI, process.env.USER_ID).catch(async (e) => {
  await addLog("ERROR", "Main execution failed", { error: e.message });
  await saveLogs();
});
