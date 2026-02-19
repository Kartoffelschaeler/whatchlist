const {
  callTmdb,
  handleOptions,
  isValidHalfStepRating,
  readJsonBody,
  requireAppSecret,
  resolveEnglishTitle,
  sendJson,
  supabaseRequest,
} = require("./_server");

const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  if (!requireAppSecret(req, res)) {
    return;
  }

  try {
    if (req.method === "GET") {
      await handleGet(res);
      return;
    }

    if (req.method === "POST") {
      await handlePost(req, res);
      return;
    }

    if (req.method === "PATCH") {
      await handlePatch(req, res);
      return;
    }

    if (req.method === "DELETE") {
      await handleDelete(req, res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    const status = error.statusCode || 500;

    if (error?.payload?.code === "23505") {
      sendJson(res, 409, { error: "Movie already exists." });
      return;
    }

    sendJson(res, status, { error: error.message || "Request failed." });
  }
};

async function handleGet(res) {
  const movies = await supabaseRequest({
    method: "GET",
    path: "movies?select=*&order=watched.asc,created_at.desc",
  });

  sendJson(res, 200, { movies: Array.isArray(movies) ? movies : [] });
}

async function handlePost(req, res) {
  const body = await readJsonBody(req);
  const tmdbId = Number(body.tmdb_id);

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    sendJson(res, 400, { error: "tmdb_id must be a positive integer." });
    return;
  }

  const tmdbMovie = await callTmdb(`/movie/${encodeURIComponent(String(tmdbId))}`);
  const title = resolveEnglishTitle(tmdbMovie);
  const posterUrl = tmdbMovie.poster_path ? `${POSTER_BASE}${tmdbMovie.poster_path}` : null;

  const inserted = await supabaseRequest({
    method: "POST",
    path: "movies",
    body: {
      tmdb_id: tmdbId,
      title,
      poster_url: posterUrl,
      watched: false,
      rating: null,
    },
    returnRepresentation: true,
  });

  const movie = Array.isArray(inserted) ? inserted[0] : null;
  sendJson(res, 201, { movie });
}

async function handlePatch(req, res) {
  const body = await readJsonBody(req);
  const id = Number(body.id);

  if (!Number.isInteger(id) || id <= 0) {
    sendJson(res, 400, { error: "id must be a positive integer." });
    return;
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(body, "watched")) {
    if (typeof body.watched !== "boolean") {
      sendJson(res, 400, { error: "watched must be a boolean." });
      return;
    }
    updates.watched = body.watched;
  }

  if (Object.prototype.hasOwnProperty.call(body, "rating")) {
    const rating = body.rating;
    if (rating === null) {
      updates.rating = null;
    } else {
      const numericRating = Number(rating);
      if (!isValidHalfStepRating(numericRating)) {
        sendJson(res, 400, { error: "rating must be in 0.5 increments from 0.5 to 5.0." });
        return;
      }
      updates.rating = numericRating;
    }
  }

  if (!Object.keys(updates).length) {
    sendJson(res, 400, { error: "Provide watched and/or rating to update." });
    return;
  }

  const updated = await supabaseRequest({
    method: "PATCH",
    path: `movies?id=eq.${id}`,
    body: updates,
    returnRepresentation: true,
  });

  const movie = Array.isArray(updated) ? updated[0] : null;
  if (!movie) {
    sendJson(res, 404, { error: "Movie not found." });
    return;
  }

  sendJson(res, 200, { movie });
}

async function handleDelete(req, res) {
  const body = await readJsonBody(req);
  const id = Number(body.id);

  if (!Number.isInteger(id) || id <= 0) {
    sendJson(res, 400, { error: "id must be a positive integer." });
    return;
  }

  const deleted = await supabaseRequest({
    method: "DELETE",
    path: `movies?id=eq.${id}&select=id`,
    returnRepresentation: true,
  });

  const movie = Array.isArray(deleted) ? deleted[0] : null;
  if (!movie) {
    sendJson(res, 404, { error: "Movie not found." });
    return;
  }

  sendJson(res, 200, { ok: true });
}
