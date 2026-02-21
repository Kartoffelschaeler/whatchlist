const TMDB_BASE_URL = "https://api.themoviedb.org/3";
let cachedListsRaw = null;
let cachedLists = null;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-app-secret");
}

function sendJson(res, status, payload) {
  setCors(res);
  res.status(status).json(payload);
}

function handleOptions(req, res) {
  if (req.method !== "OPTIONS") {
    return false;
  }
  setCors(res);
  res.status(204).end();
  return true;
}

function getHeader(req, name) {
  const lower = name.toLowerCase();
  const value = req.headers?.[lower] ?? req.headers?.[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function requireAppSecret(req, res) {
  const provided = String(getHeader(req, "x-app-secret") || "");
  if (!provided) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }

  let configuredLists = null;
  try {
    configuredLists = getConfiguredLists();
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "Invalid LISTS_JSON configuration." });
    return false;
  }

  if (configuredLists) {
    const list = getListFromPassword(provided, configuredLists);
    if (!list) {
      sendJson(res, 401, { error: "Unauthorized" });
      return false;
    }
    req.authList = list;
    return true;
  }

  const expected = process.env.APP_SECRET;
  if (!expected) {
    sendJson(res, 500, { error: "LISTS_JSON or APP_SECRET must be configured." });
    return false;
  }

  if (provided !== expected) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }

  req.authList = { id: "main", name: "Main" };
  return true;
}

function getConfiguredLists() {
  const raw = process.env.LISTS_JSON;
  if (!raw) {
    cachedListsRaw = null;
    cachedLists = null;
    return null;
  }

  if (cachedListsRaw === raw && cachedLists) {
    return cachedLists;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    const error = new Error("LISTS_JSON must be valid JSON.");
    error.statusCode = 500;
    throw error;
  }

  if (!Array.isArray(parsed)) {
    const error = new Error("LISTS_JSON must be a JSON array.");
    error.statusCode = 500;
    throw error;
  }

  const normalized = parsed.map((entry, index) => {
    const id = String(entry?.id || "").trim();
    const password = String(entry?.password || "");
    const name = String(entry?.name || id || "").trim();

    if (!id || !password) {
      const error = new Error(`LISTS_JSON entry at index ${index} requires non-empty "id" and "password".`);
      error.statusCode = 500;
      throw error;
    }

    return { id, name: name || id, password };
  });

  const passwordSet = new Set();
  normalized.forEach((entry) => {
    if (passwordSet.has(entry.password)) {
      const error = new Error("LISTS_JSON contains duplicate passwords.");
      error.statusCode = 500;
      throw error;
    }
    passwordSet.add(entry.password);
  });

  cachedListsRaw = raw;
  cachedLists = normalized;
  return cachedLists;
}

function getListFromPassword(password, preloadedLists) {
  const lists = preloadedLists || getConfiguredLists();
  if (!lists) {
    return null;
  }

  const match = lists.find((entry) => entry.password === String(password || ""));
  if (!match) {
    return null;
  }

  return { id: match.id, name: match.name };
}

function requireListAccess(req, res) {
  if (!requireAppSecret(req, res)) {
    return null;
  }
  return req.authList || { id: "main", name: "Main" };
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (_error) {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (_error) {
    return {};
  }
}

function requireEnvVars(varNames) {
  const values = {};
  const missing = [];

  varNames.forEach((name) => {
    const value = process.env[name];
    if (!value) {
      missing.push(name);
      return;
    }
    values[name] = value;
  });

  if (missing.length) {
    const error = new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }

  return values;
}

function requireSupabaseConfig() {
  console.log("ENV CHECK:", {
    hasUrl: !!process.env.SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  const env = requireEnvVars(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

  return {
    supabaseUrl: env.SUPABASE_URL.replace(/\/+$/, ""),
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function supabaseRequest({ method, path, body, returnRepresentation = false }) {
  const { supabaseUrl, serviceRoleKey } = requireSupabaseConfig();
  const url = `${supabaseUrl}/rest/v1/${path}`;

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (returnRepresentation) {
    headers.Prefer = "return=representation";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || "Database request failed.");
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return payload;
}

async function callTmdb(pathname, params = {}) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    const error = new Error("TMDB_API_KEY is not configured.");
    error.statusCode = 500;
    throw error;
  }

  const url = new URL(`${TMDB_BASE_URL}${pathname}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.status_message || "TMDB request failed.");
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

function isValidHalfStepRating(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return false;
  }
  const scaled = value * 2;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
    return false;
  }
  return value >= 0.5 && value <= 5.0;
}

function resolveEnglishTitle(tmdbMovie) {
  if (tmdbMovie?.original_language === "en" && tmdbMovie?.original_title) {
    return String(tmdbMovie.original_title);
  }
  if (tmdbMovie?.title) {
    return String(tmdbMovie.title);
  }
  if (tmdbMovie?.original_title) {
    return String(tmdbMovie.original_title);
  }
  return "Untitled";
}

module.exports = {
  callTmdb,
  getListFromPassword,
  handleOptions,
  isValidHalfStepRating,
  readJsonBody,
  requireAppSecret,
  requireListAccess,
  resolveEnglishTitle,
  sendJson,
  supabaseRequest,
};
