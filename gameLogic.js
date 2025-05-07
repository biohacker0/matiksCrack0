const WebSocket = require("ws");
const axios = require("axios");
const { addLog, findGameId, extractGameIdRegex, decryptJsonData } = require("./utils");

// StartSearching for game
async function startGame(headers) {
  try {
    const response = await axios.post(
      "https://server.matiks.com/api",
      {
        operationName: "StartSearching",
        variables: { gameConfig: { numPlayers: 2, timeLimit: 60, gameType: "PLAY_ONLINE" } },
        query: "mutation StartSearching($gameConfig: GameConfigInput) {\n  startSearching(gameConfig: $gameConfig)\n}",
      },
      { headers }
    );
    if (response.data.data && response.data.data.startSearching) {
      await addLog("INFO", "Matchmaking started");
      return true;
    }
    await addLog("ERROR", "Matchmaking failed", { response: response.data });
    return false;
  } catch (e) {
    await addLog("ERROR", "Error in start_game", { error: e.message });
    return false;
  }
}

// Fetch gameId
async function fetchGameId(userChannel, uri, headers) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(uri);
    ws.on("open", async () => {
      ws.send(JSON.stringify({ type: "channel_subscribe", channel: userChannel }));
      await addLog("INFO", `Subscribed to ${userChannel} to fetch gameId`);

      setTimeout(async () => {
        if (!(await startGame(headers))) {
          await addLog("ERROR", "Failed to start game");
          ws.close();
          resolve(null);
        }
      }, 1000);
    });

    const startTime = Date.now();
    const maxWait = 120000;

    ws.on("message", async (message) => {
      try {
        await addLog("INFO", "Received WebSocket message");
        const msgData = JSON.parse(message.toString());
        if (msgData.type === "message" && msgData.data) {
          try {
            const innerData = JSON.parse(msgData.data);
            await addLog("INFO", "Parsed inner WebSocket data", { inner_data: innerData });
            let gameId = findGameId(innerData);
            if (gameId) {
              await addLog("INFO", `Game ID received: ${gameId}`, { game_id: gameId });
              try {
                await axios.post(
                  "https://server.matiks.com/api",
                  {
                    operationName: "AbortSearching",
                    variables: {},
                    query: "mutation AbortSearching {\n  abortSearching\n}",
                  },
                  { headers }
                );
              } catch (e) {
                await addLog("ERROR", "Error in AbortSearching", { error: e.message });
              }
              ws.close();
              resolve(gameId);
            } else {
              gameId = extractGameIdRegex(msgData.data);
              if (gameId) {
                await addLog("INFO", `Game ID received via regex: ${gameId}`, { game_id: gameId });
                try {
                  await axios.post(
                    "https://server.matiks.com/api",
                    {
                      operationName: "AbortSearching",
                      variables: {},
                      query: "mutation AbortSearching {\n  abortSearching\n}",
                    },
                    { headers }
                  );
                } catch (e) {
                  await addLog("ERROR", "Error in AbortSearching", { error: e.message });
                }
                ws.close();
                resolve(gameId);
              }
              await addLog("ERROR", "No gameId found in message", { inner_data: innerData });
            }
          } catch (e) {
            await addLog("ERROR", "Failed to parse inner WebSocket data", { error: e.message, data: msgData.data });
            const gameId = extractGameIdRegex(msgData.data);
            if (gameId) {
              await addLog("INFO", `Game ID received via regex: ${gameId}`, { game_id: gameId });
              try {
                await axios.post(
                  "https://server.matiks.com/api",
                  {
                    operationName: "AbortSearching",
                    variables: {},
                    query: "mutation AbortSearching {\n  abortSearching\n}",
                  },
                  { headers }
                );
              } catch (e) {
                await addLog("ERROR", "Error in AbortSearching", { error: e.message });
              }
              ws.close();
              resolve(gameId);
            }
          }
        } else {
          await addLog("INFO", "Received non-message WebSocket event", { type: msgData.type });
        }
      } catch (e) {
        await addLog("ERROR", "Error processing WebSocket message", { error: e.message });
      }

      if (Date.now() - startTime > maxWait) {
        await addLog("ERROR", "Failed to fetch gameId within time limit");
        ws.close();
        reject(new Error("Failed to fetch gameId within time limit"));
      }
    });

    ws.on("error", async (e) => {
      await addLog("ERROR", "WebSocket error", { error: e.message });
      ws.close();
      reject(e);
    });

    ws.on("close", () => {
      if (!resolve.called) resolve(null);
    });
  });
}

// Fetch encryptedQuestions
async function fetchEncryptedQuestions(gameId, headers, maxAttempts = 5, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.post(
        "https://server.matiks.com/api",
        {
          operationName: "GetGameById",
          variables: { gameId },
          query: "query GetGameById($gameId: ID) {\n  game: getGameById(gameId: $gameId) {\n    _id\n    encryptedQuestions\n    __typename\n  }\n}",
        },
        { headers }
      );
      const encryptedQuestions = response.data.data?.game?.encryptedQuestions;
      if (encryptedQuestions) {
        await addLog("INFO", "Successfully fetched encryptedQuestions", { game_id: gameId });
        return encryptedQuestions;
      }
      await addLog("INFO", `encryptedQuestions not available yet (attempt ${attempt}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (e) {
      await addLog("ERROR", `Error in fetch_encrypted_questions attempt ${attempt}`, { error: e.message });
    }
  }
  throw new Error("Failed to fetch encryptedQuestions after maximum attempts");
}

// Parse questions
function parseAndSolveQuestions(encryptedQuestions, key, userId) {
  const answers = {};
  const decryptedQuestions = [];
  for (const eq of encryptedQuestions) {
    if (!eq || eq.endsWith(":")) {
      addLog("INFO", `Skipping incomplete encrypted question: ${eq}`);
      continue;
    }
    const decrypted = decryptJsonData(eq, key);
    if (decrypted) decryptedQuestions.push(decrypted);
  }
  decryptedQuestions.forEach((dq, idx) => {
    const questionData = dq.question || {};
    const questionId = questionData.id || `${userId}_${idx}`;
    const answer = questionData.answers ? questionData.answers[0] : null;
    if (answer !== null) {
      answers[idx] = { question_id: questionId, answer };
    }
  });
  addLog("INFO", `Parsed ${Object.keys(answers).length} answers`);
  return answers;
}

// Listener task
function listener(uri, channel, userId, headers, sharedState) {
  return new Promise((resolve) => {
    const ws = new WebSocket(uri);
    ws.on("open", async () => {
      ws.send(JSON.stringify({ type: "channel_subscribe", channel }));
      await addLog("INFO", `Subscribed to game channel ${channel}`);
    });

    ws.on("message", async (message) => {
      try {
        const msgData = JSON.parse(message.toString());
        if (msgData.type === "message" && msgData.data) {
          const innerData = JSON.parse(msgData.data);
          if (innerData.gameStatus === "ENDED" && innerData.event === "GAME_ENDED") {
            sharedState.game_ended = true;
            await addLog("INFO", "Game ended");
            ws.close();
            resolve();
          } else if (innerData.event === "CORRECT_MOVE_MADE") {
            const leaderboard = innerData.game.leaderBoard;
            for (const player of leaderboard) {
              if (player.userId === userId) {
                const newCorrectCount = player.correct;
                if (newCorrectCount > sharedState.your_correct_count) {
                  sharedState.your_correct_count = newCorrectCount;
                  sharedState.current_question_sequence++;
                  sharedState.answer_processed = true;
                  await addLog("INFO", `Correct answer for question ${sharedState.current_question_sequence - 1}, moving to ${sharedState.current_question_sequence}`);
                }
              }
            }
          }
          sharedState.game_started = true;
        }
      } catch (e) {
        await addLog("ERROR", "Error in listener", { error: e.message });
        ws.close();
        resolve();
      }
    });

    ws.on("error", async (e) => {
      await addLog("ERROR", "Listener WebSocket error", { error: e.message });
      ws.close();
      resolve();
    });

    ws.on("close", () => resolve());
  });
}

// Sender task
function sender(uri, channel, gameId, userId, headers, answers, sharedState) {
  return new Promise((resolve) => {
    const ws = new WebSocket(uri);
    ws.on("open", async () => {
      ws.send(JSON.stringify({ type: "channel_subscribe", channel }));
      await addLog("INFO", `Subscribed to game channel ${channel} for sending answers`);

      const interval = setInterval(async () => {
        if (sharedState.game_ended) {
          clearInterval(interval);
          ws.close();
          resolve();
          return;
        }
        if (!sharedState.game_started) return;

        const sequence = sharedState.current_question_sequence;
        if (sequence >= Object.keys(answers).length) {
          await addLog("INFO", "All questions answered");
          clearInterval(interval);
          ws.close();
          resolve();
          return;
        }

        const questionId = answers[sequence].question_id;
        const answer = answers[sequence].answer;
        const answerMessage = {
          type: "submitAnswer",
          channel,
          data: {
            gameId,
            questionId,
            submittedValue: String(answer),
            timeOfSubmission: Date.now(),
            isCorrect: true,
            incorrectAttempts: 0,
            userId,
          },
        };
        ws.send(JSON.stringify(answerMessage));
        await addLog("INFO", `Submitted answer ${answer} for question ${questionId}`);
        sharedState.answer_processed = false;

        const timeout = setTimeout(async () => {
          if (!sharedState.answer_processed && !sharedState.game_ended) {
            await addLog("INFO", `Timeout for question ${questionId}, moving to next`);
            sharedState.current_question_sequence++;
          }
        }, 1000);

        while (!sharedState.answer_processed && !sharedState.game_ended) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        clearTimeout(timeout);
      }, 100);
    });

    ws.on("error", async (e) => {
      await addLog("ERROR", "Sender WebSocket error", { error: e.message });
      ws.close();
      resolve();
    });

    ws.on("close", () => resolve());
  });
}

module.exports = {
  startGame,
  fetchGameId,
  fetchEncryptedQuestions,
  parseAndSolveQuestions,
  listener,
  sender,
};
