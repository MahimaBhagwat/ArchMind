/**
 * errorMessages.js - User-facing error message helpers.
 *
 * Extracted from App.jsx so the classification branches can be unit-tested
 * without spinning up a full React tree. Pure functions only.
 */

/**
 * Map a backend error (with optional _classification metadata set by the
 * Analyze route's try/catch) to a user-facing message. Falls back to
 * friendlyError() for network/parse errors.
 *
 * @param {Error} err
 * @param {string} fallback
 * @returns {string}
 */
export function friendlyAnalyzeError(err, fallback) {
  const cls = err?._classification;
  if (cls === "quota") {
    return "Daily free-tier limit reached. Analysis is paused until the quota resets. Please try again later.";
  }
  if (cls === "overload") {
    return "AI is busy right now. Please try again in a moment.";
  }
  if (cls === "malformed") {
    return "The AI returned an unexpected response. Please try again.";
  }
  if (cls === "auth") {
    return "AI service authentication failed. Please contact support.";
  }
  if (cls === "network") {
    return "Can't reach the AI service. Check your connection and try again.";
  }
  return friendlyError(err, fallback);
}

/**
 * Map a fetch-level error to a user-facing message.
 * @param {Error} err
 * @param {string} fallback
 * @returns {string}
 */
export function friendlyError(err, fallback) {
  const raw = err?.message || "";
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw))
    return "Can't reach the server. Is it running on port 5000?";
  if (/Unexpected token|Not valid JSON|JSON\.parse/i.test(raw))
    return "Server returned an unexpected response. Try again.";
  return raw && /[a-zA-Z]{4,}/.test(raw) ? raw : fallback;
}

/**
 * Convert a 4xx/5xx backend response body into a real Error with the
 * classification/retryAfterMs metadata attached. This is what App.jsx's
 * try/catch receives after a non-OK fetch.
 *
 * @param {Object} data - the parsed JSON body
 * @returns {Error}
 */
export function errorFromResponse(data) {
  const e = new Error(data?.error || "Analysis failed.");
  if (data?.classification) e._classification = data.classification;
  if (data?.retryAfterMs != null) e._retryAfterMs = data.retryAfterMs;
  return e;
}
