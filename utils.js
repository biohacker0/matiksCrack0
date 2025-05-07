const fs = require("fs").promises;
const crypto = require("crypto");
const { URL } = require("url");

// Log storage for JSON
let logs = [];

async function addLog(level, message, details = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (details) logEntry.details = details;
  logs.push(logEntry);
  console.log(`${level}: ${message}`);
}

// Save logs to JSON file
async function saveLogs() {
  try {
    await fs.writeFile("matiks_logs.json", JSON.stringify(logs, null, 4));
    await addLog("INFO", "Logs saved to matiks_logs.json");
  } catch (e) {
    await addLog("ERROR", "Failed to save logs to JSON", { error: e.message });
  }
}

function extractTokenFromUri(uri) {
  try {
    const url = new URL(uri);
    const token = url.searchParams.get("token");
    if (!token) throw new Error("No token found in URI");
    return token;
  } catch (e) {
    addLog("ERROR", "Failed to extract token from URI", { error: e.message });
    throw e;
  }
}

//  find gameId in JSON structure with fallbacks
function findGameId(data) {
  function recursiveSearch(obj, key = "_id") {
    if (typeof obj !== "object" || obj === null) return null;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = recursiveSearch(item, key);
        if (result) return result;
      }
    } else {
      for (const [k, v] of Object.entries(obj)) {
        if (k === key && typeof v === "string" && v.length === 24) return v;
        const result = recursiveSearch(v, key);
        if (result) return result;
      }
    }
    return null;
  }

  if (data.event && data.event.game && data.event.game._id) return data.event.game._id;
  if (data.game && data.game._id) return data.game._id;
  return recursiveSearch(data);
}

// Regex fallback to extract gameId from raw data string
function extractGameIdRegex(dataStr) {
  const pattern = /[0-9a-f]{24}/;
  const match = dataStr.match(pattern);
  return match ? match[0] : null;
}

// Extract gameId from URL
function extractGameId(url) {
  try {
    const pattern = /https:\/\/www\.matiks\.com\/game\/([0-9a-f]{24})\/play/;
    const match = url.match(pattern);
    if (match) return match[1];
    throw new Error("Invalid game URL format");
  } catch (e) {
    addLog("ERROR", "Error in extract_game_id", { error: e.message });
    throw e;
  }
}

// Decrypt JSON data
function decryptJsonData(encryptedData, key) {
  try {
    const [ivHex, ciphertextHex] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    const keyBytes = Buffer.from(key, "utf-8");
    const decipher = crypto.createDecipheriv("aes-256-cbc", keyBytes, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const decryptedStr = decrypted.toString("utf-8").replace(/\0+$/, "");
    return JSON.parse(decryptedStr);
  } catch (e) {
    addLog("ERROR", "Error in decrypt_json_data", { error: e.message });
    return null;
  }
}

module.exports = {
  addLog,
  saveLogs,
  extractTokenFromUri,
  findGameId,
  extractGameIdRegex,
  extractGameId,
  decryptJsonData,
};
