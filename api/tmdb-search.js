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

  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!query) {
    sendJson(res, 400, { error: "Missing required query parameter: q" });
    return;
  }

  try {
    const data = await callTmdb("/search/movie", {
      query,
      include_adult: "false",
      page: req.query.page || "1",
    });

    sendJson(res, 200, {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
      results: (data.results || []).map((movie) => ({
        id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
        release_date: movie.release_date,
        poster_path: movie.poster_path,
      })),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "TMDB search failed." });
  }
};
