const { callTmdb, handleOptions, requireAppSecret, sendJson } = require("./_server");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  if (!requireAppSecret(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!id) {
    sendJson(res, 400, { error: "Missing required query parameter: id" });
    return;
  }

  try {
    const data = await callTmdb(`/movie/${encodeURIComponent(id)}`);
    sendJson(res, 200, data);
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "TMDB movie request failed." });
  }
};
