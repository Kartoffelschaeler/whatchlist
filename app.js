(() => {
  "use strict";

  const APP_SECRET_KEY = "app_secret";
  const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
  const WIKI_API = "https://en.wikipedia.org/w/api.php";
  const WIKI_BASE = "https://en.wikipedia.org/wiki/";
  const WIKI_SEARCH = "https://en.wikipedia.org/wiki/Special:Search?search=";

  const state = {
    appSecret: "",
    unlocked: false,
    movies: [],
    loadingMovies: false,
    searchQuery: "",
    searchResults: [],
    searchLoading: false,
    searchError: "",
    searchAbortController: null,
    activeMovieId: null,
    pendingMovieIds: new Set(),
    detailCache: new Map(),
    syncTimer: null,
    toastTimer: null,
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheDom();
    bindEvents();
    renderLockedState();

    const savedSecret = getStoredSecret();
    if (savedSecret) {
      await unlockWithSecret(savedSecret, true);
      return;
    }

    promptForSecret();
  }

  function cacheDom() {
    dom.accessStatus = document.getElementById("access-status");
    dom.clearSecretBtn = document.getElementById("clear-secret-btn");
    dom.watchlistGrid = document.getElementById("watchlist-grid");
    dom.watchedGrid = document.getElementById("watched-grid");
    dom.watchlistCount = document.getElementById("watchlist-count");
    dom.watchedCount = document.getElementById("watched-count");
    dom.addMovieBtn = document.getElementById("add-movie-btn");

    dom.searchModal = document.getElementById("search-modal");
    dom.searchForm = document.getElementById("search-form");
    dom.searchInput = document.getElementById("search-input");
    dom.searchResults = document.getElementById("search-results");

    dom.movieModal = document.getElementById("movie-modal");
    dom.movieModalContent = document.getElementById("movie-modal-content");

    dom.secretModal = document.getElementById("secret-modal");
    dom.secretForm = document.getElementById("secret-form");
    dom.secretInput = document.getElementById("secret-input");
    dom.secretSubmitBtn = document.getElementById("secret-submit-btn");
    dom.secretError = document.getElementById("secret-error");

    dom.toast = document.getElementById("toast");
  }

  function bindEvents() {
    dom.clearSecretBtn.addEventListener("click", clearPasswordAndReload);
    dom.addMovieBtn.addEventListener("click", openSearchModal);

    dom.secretForm.addEventListener("submit", onSecretSubmit);
    dom.searchForm.addEventListener("submit", (event) => event.preventDefault());

    dom.watchlistGrid.addEventListener("click", onMovieGridClick);
    dom.watchedGrid.addEventListener("click", onMovieGridClick);
    dom.searchResults.addEventListener("click", onSearchResultsClick);
    dom.movieModalContent.addEventListener("click", onMovieModalContentClick);

    dom.searchInput.addEventListener(
      "input",
      debounce(() => {
        const query = dom.searchInput.value.trim();
        state.searchQuery = query;
        void searchMovies(query);
      }, 280)
    );

    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeydown);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && state.unlocked) {
        void loadMovies({ quiet: true });
      }
    });
  }

  function getStoredSecret() {
    return String(localStorage.getItem(APP_SECRET_KEY) || "").trim();
  }

  function renderLockedState() {
    state.unlocked = false;
    dom.accessStatus.textContent = "Locked";
    dom.clearSecretBtn.classList.add("hidden");
    dom.addMovieBtn.classList.add("hidden");
    document.body.classList.add("locked");
    renderMovieSections();
  }

  async function unlockWithSecret(secret, fromStorage) {
    state.appSecret = secret;
    clearSecretError();

    dom.secretSubmitBtn.disabled = true;

    try {
      const data = await apiRequest("/api/movies", {
        method: "GET",
        secretOverride: secret,
      });

      state.unlocked = true;
      localStorage.setItem(APP_SECRET_KEY, secret);
      dom.accessStatus.textContent = "Unlocked";
      dom.clearSecretBtn.classList.remove("hidden");
      dom.addMovieBtn.classList.remove("hidden");
      document.body.classList.remove("locked");

      closeModal(dom.secretModal);

      state.movies = Array.isArray(data.movies) ? data.movies : [];
      renderMovieSections();

      startSyncPolling();

      if (!fromStorage) {
        showToast("Unlocked.");
      }
    } catch (error) {
      state.appSecret = "";
      localStorage.removeItem(APP_SECRET_KEY);
      stopSyncPolling();
      renderLockedState();

      const message = fromStorage
        ? "Saved password is invalid. Enter password again."
        : error.message || "Could not unlock with this password.";
      showSecretError(message);
      promptForSecret();
    } finally {
      dom.secretSubmitBtn.disabled = false;
    }
  }

  function promptForSecret() {
    openModal(dom.secretModal);
    dom.secretInput.focus();
  }

  function clearPasswordAndReload() {
    localStorage.removeItem(APP_SECRET_KEY);
    window.location.reload();
  }

  async function onSecretSubmit(event) {
    event.preventDefault();
    const secret = String(dom.secretInput.value || "").trim();

    if (!secret) {
      showSecretError("Please enter the shared password.");
      return;
    }

    await unlockWithSecret(secret, false);
  }

  function showSecretError(message) {
    dom.secretError.textContent = message;
    dom.secretError.classList.remove("hidden");
  }

  function clearSecretError() {
    dom.secretError.textContent = "";
    dom.secretError.classList.add("hidden");
  }

  function startSyncPolling() {
    stopSyncPolling();

    state.syncTimer = setInterval(() => {
      if (!state.unlocked || state.loadingMovies) {
        return;
      }
      void loadMovies({ quiet: true });
    }, 20000);
  }

  function stopSyncPolling() {
    if (state.syncTimer) {
      clearInterval(state.syncTimer);
      state.syncTimer = null;
    }
  }

  async function loadMovies(options = {}) {
    if (!state.unlocked) {
      return;
    }

    const quiet = options.quiet === true;

    if (!quiet) {
      state.loadingMovies = true;
      renderMovieSections();
    }

    try {
      const data = await apiRequest("/api/movies", { method: "GET" });
      state.movies = Array.isArray(data.movies) ? data.movies : [];
      state.loadingMovies = false;
      renderMovieSections();
    } catch (error) {
      state.loadingMovies = false;
      if (!quiet) {
        showToast(error.message || "Could not load movies.", true);
      }
      renderMovieSections();
    }
  }

  function renderMovieSections() {
    if (!state.unlocked) {
      dom.watchlistCount.textContent = "0";
      dom.watchedCount.textContent = "0";
      dom.watchlistGrid.innerHTML = '<p class="empty-state">Enter password to unlock watchlist.</p>';
      dom.watchedGrid.innerHTML = '<p class="empty-state">Enter password to unlock watchlist.</p>';
      return;
    }

    if (state.loadingMovies) {
      dom.watchlistGrid.innerHTML = renderSkeletonCards(3);
      dom.watchedGrid.innerHTML = renderSkeletonCards(2);
      dom.watchlistCount.textContent = "...";
      dom.watchedCount.textContent = "...";
      return;
    }

    const watchlist = state.movies
      .filter((movie) => !movie.watched)
      .sort((a, b) => toDateValue(b.created_at) - toDateValue(a.created_at));
    const watched = state.movies
      .filter((movie) => movie.watched)
      .sort((a, b) => toDateValue(b.updated_at) - toDateValue(a.updated_at));

    dom.watchlistCount.textContent = String(watchlist.length);
    dom.watchedCount.textContent = String(watched.length);

    renderMovieGrid(dom.watchlistGrid, watchlist, "No movies yet. Use + to add your first one.");
    renderMovieGrid(dom.watchedGrid, watched, "No watched movies yet.");
  }

  function renderMovieGrid(container, movies, emptyMessage) {
    if (!movies.length) {
      container.innerHTML = `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
      return;
    }

    container.innerHTML = movies.map((movie) => movieCardHtml(movie)).join("");
  }

  function movieCardHtml(movie) {
    const id = Number(movie.id);
    const ratingLabel = movie.rating ? `${Number(movie.rating).toFixed(1)} / 5 stars` : "Not rated yet";
    const posterHtml = movie.poster_url
      ? `<img src="${escapeHtml(movie.poster_url)}" alt="Poster for ${escapeHtml(movie.title)}" loading="lazy" />`
      : '<div class="poster-fallback">No poster</div>';

    return `
      <article class="movie-card" data-id="${escapeHtml(String(id))}">
        <button class="movie-card-body" type="button" data-open-detail="${escapeHtml(String(id))}">
          <div class="poster-wrap">${posterHtml}</div>
          <div class="movie-meta">
            <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
            <p class="movie-subtitle">${escapeHtml(ratingLabel)}</p>
          </div>
        </button>
        <button
          class="movie-toggle ${movie.watched ? "is-on" : ""}"
          type="button"
          data-toggle-id="${escapeHtml(String(id))}"
          aria-pressed="${movie.watched ? "true" : "false"}"
          aria-label="${movie.watched ? "Mark as unwatched" : "Mark as watched"}"
        >
          <span class="toggle-dot"></span>
        </button>
      </article>
    `;
  }

  function renderSkeletonCards(count) {
    return Array.from({ length: count })
      .map(() => '<div class="movie-skeleton skeleton"></div>')
      .join("");
  }

  function onMovieGridClick(event) {
    const toggle = event.target.closest("[data-toggle-id]");
    if (toggle) {
      const movieId = Number(toggle.getAttribute("data-toggle-id"));
      const nextWatched = toggle.getAttribute("aria-pressed") !== "true";
      void updateWatched(movieId, nextWatched);
      return;
    }

    const opener = event.target.closest("[data-open-detail]");
    if (opener) {
      const movieId = Number(opener.getAttribute("data-open-detail"));
      void openMovieDetails(movieId);
    }
  }

  async function updateWatched(movieId, watched) {
    if (!state.unlocked || state.pendingMovieIds.has(movieId)) {
      return;
    }

    const movie = state.movies.find((item) => Number(item.id) === Number(movieId));
    if (!movie) {
      return;
    }

    state.pendingMovieIds.add(movieId);

    const firstPositions = captureCardPositions();
    const previousWatched = movie.watched;
    const previousUpdatedAt = movie.updated_at;

    movie.watched = watched;
    movie.updated_at = new Date().toISOString();
    renderMovieSections();
    playFlip(firstPositions, movieId);

    try {
      const data = await apiRequest("/api/movies", {
        method: "PATCH",
        body: { id: Number(movie.id), watched },
      });
      if (data.movie) {
        upsertMovie(data.movie);
        renderMovieSections();
      }
    } catch (error) {
      movie.watched = previousWatched;
      movie.updated_at = previousUpdatedAt;
      renderMovieSections();
      showToast(error.message || "Could not update watched state.", true);
    } finally {
      state.pendingMovieIds.delete(movieId);
    }
  }

  function captureCardPositions() {
    const positions = new Map();
    document.querySelectorAll(".movie-card[data-id]").forEach((card) => {
      positions.set(card.getAttribute("data-id"), card.getBoundingClientRect());
    });
    return positions;
  }

  function playFlip(firstPositions, highlightMovieId) {
    requestAnimationFrame(() => {
      document.querySelectorAll(".movie-card[data-id]").forEach((card) => {
        const movieId = card.getAttribute("data-id");
        const first = firstPositions.get(movieId);
        const last = card.getBoundingClientRect();

        if (!first) {
          card.animate(
            [
              { opacity: 0, transform: "translateY(12px) scale(0.98)" },
              { opacity: 1, transform: "translateY(0) scale(1)" },
            ],
            { duration: 280, easing: "cubic-bezier(0.2, 0.7, 0, 1)" }
          );
          return;
        }

        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          return;
        }

        card.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
          { duration: 360, easing: "cubic-bezier(0.2, 0.75, 0, 1)" }
        );
      });

      if (highlightMovieId) {
        const highlighted = document.querySelector(`.movie-card[data-id="${highlightMovieId}"]`);
        if (highlighted) {
          highlighted.animate(
            [{ transform: "scale(0.985)" }, { transform: "scale(1)" }],
            { duration: 220, easing: "ease-out" }
          );
        }
      }
    });
  }

  function openSearchModal() {
    if (!state.unlocked) {
      promptForSecret();
      return;
    }

    openModal(dom.searchModal);
    dom.searchInput.focus();

    if (!state.searchQuery) {
      dom.searchResults.innerHTML = '<p class="empty-state">Search by movie title.</p>';
    }
  }

  async function searchMovies(query) {
    if (!state.unlocked || !isModalOpen(dom.searchModal)) {
      return;
    }

    state.searchError = "";

    if (query.length < 2) {
      state.searchResults = [];
      state.searchLoading = false;
      dom.searchResults.innerHTML = '<p class="empty-state">Type at least 2 characters.</p>';
      return;
    }

    if (state.searchAbortController) {
      state.searchAbortController.abort();
    }

    const controller = new AbortController();
    state.searchAbortController = controller;
    state.searchLoading = true;
    renderSearchResults();

    try {
      const data = await apiRequest("/api/tmdb-search", {
        method: "GET",
        query: { q: query },
        signal: controller.signal,
      });
      state.searchResults = Array.isArray(data.results) ? data.results : [];
      state.searchLoading = false;
      renderSearchResults();
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
      state.searchResults = [];
      state.searchLoading = false;
      state.searchError = error.message || "Search failed.";
      renderSearchResults();
    }
  }

  function renderSearchResults() {
    if (state.searchLoading) {
      dom.searchResults.innerHTML = renderSearchSkeletonRows(5);
      return;
    }

    if (state.searchError) {
      dom.searchResults.innerHTML = `<p class="empty-state">${escapeHtml(state.searchError)}</p>`;
      return;
    }

    if (!state.searchResults.length) {
      dom.searchResults.innerHTML = '<p class="empty-state">No results found.</p>';
      return;
    }

    dom.searchResults.innerHTML = state.searchResults
      .map((result) => {
        const releaseYear = formatYear(result.release_date);
        const posterUrl = result.poster_path ? `${IMAGE_BASE}${result.poster_path}` : "";
        const alreadyAdded = state.movies.some((movie) => Number(movie.tmdb_id) === Number(result.id));

        return `
          <article class="search-row">
            <div class="poster-wrap">
              ${
                posterUrl
                  ? `<img src="${escapeHtml(posterUrl)}" alt="Poster for ${escapeHtml(result.title || result.original_title || "movie")}" loading="lazy" />`
                  : '<div class="poster-fallback">No poster</div>'
              }
            </div>
            <div>
              <p class="search-title">${escapeHtml(result.title || result.original_title || "Untitled")}</p>
              <p class="search-subtitle">${escapeHtml(releaseYear)}</p>
            </div>
            <button
              type="button"
              data-add-id="${escapeHtml(String(result.id))}"
              ${alreadyAdded ? "disabled" : ""}
            >
              ${alreadyAdded ? "Added" : "Add"}
            </button>
          </article>
        `;
      })
      .join("");
  }

  function renderSearchSkeletonRows(count) {
    return Array.from({ length: count })
      .map(() => '<div class="search-skeleton skeleton"></div>')
      .join("");
  }

  async function onSearchResultsClick(event) {
    const addBtn = event.target.closest("[data-add-id]");
    if (!addBtn || !state.unlocked) {
      return;
    }

    const tmdbId = Number(addBtn.getAttribute("data-add-id"));
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      return;
    }

    if (state.movies.some((movie) => Number(movie.tmdb_id) === tmdbId)) {
      showToast("Movie is already in your list.");
      return;
    }

    addBtn.disabled = true;
    addBtn.textContent = "Adding...";

    try {
      const data = await apiRequest("/api/movies", {
        method: "POST",
        body: { tmdb_id: tmdbId },
      });

      if (!data.movie) {
        throw new Error("Could not add movie.");
      }

      const firstPositions = captureCardPositions();
      upsertMovie(data.movie, true);
      renderMovieSections();
      playFlip(firstPositions, data.movie.id);
      renderSearchResults();
      showToast("Movie added.");
    } catch (error) {
      if (error.code === 409) {
        showToast("Movie already exists in your watchlist.");
      } else {
        showToast(error.message || "Could not add movie.", true);
      }
      addBtn.disabled = false;
      addBtn.textContent = "Add";
    }
  }

  function upsertMovie(movie, prepend = false) {
    const id = Number(movie.id);
    const idx = state.movies.findIndex((item) => Number(item.id) === id);

    if (idx >= 0) {
      state.movies[idx] = movie;
      return;
    }

    if (prepend) {
      state.movies = [movie, ...state.movies];
    } else {
      state.movies.push(movie);
    }
  }

  async function openMovieDetails(movieId) {
    if (!state.unlocked) {
      promptForSecret();
      return;
    }

    const movie = state.movies.find((item) => Number(item.id) === Number(movieId));
    if (!movie) {
      return;
    }

    state.activeMovieId = Number(movieId);
    openModal(dom.movieModal);
    renderMovieDetailSkeleton();

    try {
      const detail = await getMovieDetailBundle(movie.tmdb_id);
      if (state.activeMovieId !== Number(movieId)) {
        return;
      }
      renderMovieDetail(movie, detail);
    } catch (error) {
      dom.movieModalContent.innerHTML = `<p class="empty-state">${escapeHtml(
        error.message || "Could not load movie details."
      )}</p>`;
    }
  }

  function renderMovieDetailSkeleton() {
    dom.movieModalContent.innerHTML = `
      <div class="detail-layout">
        <div class="detail-skeleton skeleton"></div>
        <div class="detail-skeleton skeleton"></div>
        <div class="detail-skeleton skeleton"></div>
      </div>
    `;
  }

  async function getMovieDetailBundle(tmdbId) {
    const cacheKey = String(tmdbId);
    if (state.detailCache.has(cacheKey)) {
      return state.detailCache.get(cacheKey);
    }

    const pending = Promise.all([
      apiRequest("/api/tmdb-movie", { method: "GET", query: { id: tmdbId } }),
      apiRequest("/api/tmdb-credits", { method: "GET", query: { id: tmdbId } }),
      apiRequest("/api/tmdb-videos", { method: "GET", query: { id: tmdbId } }),
    ])
      .then(([movie, credits, videos]) => ({ movie, credits, videos }))
      .catch((error) => {
        state.detailCache.delete(cacheKey);
        throw error;
      });

    state.detailCache.set(cacheKey, pending);
    return pending;
  }

  function renderMovieDetail(movieRow, detail) {
    const movie = detail.movie || {};
    const credits = detail.credits || {};
    const videos = detail.videos || {};

    const director = Array.isArray(credits.crew)
      ? credits.crew.find((person) => person.job === "Director")
      : null;
    const cast = Array.isArray(credits.cast) ? credits.cast.slice(0, 10) : [];
    const genres = Array.isArray(movie.genres) ? movie.genres : [];
    const trailerKey = findYoutubeTrailerKey(videos.results || []);

    dom.movieModalContent.innerHTML = `
      <div class="detail-layout">
        <h2 class="detail-title">${escapeHtml(movieRow.title)}</h2>
        <div class="detail-grid">
          <div class="trailer-wrap">
            ${
              trailerKey
                ? `<iframe src="https://www.youtube.com/embed/${escapeHtml(
                    trailerKey
                  )}" title="Trailer for ${escapeHtml(
                    movieRow.title
                  )}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
                : '<div class="trailer-fallback">No trailer available.</div>'
            }
          </div>
          <div>
            <p class="overview">${escapeHtml(movie.overview || "No description available for this movie.")}</p>

            <div class="meta-row">
              <p class="meta-label">Director</p>
              <p class="meta-value">${escapeHtml(director?.name || "Unknown")}</p>
            </div>

            <div class="meta-row">
              <p class="meta-label">Cast</p>
              <div class="cast-wrap">
                ${
                  cast.length
                    ? cast
                        .map(
                          (person) => `
                            <button type="button" class="actor-btn" data-actor-name="${escapeHtml(person.name)}">
                              ${escapeHtml(person.name)}
                            </button>
                          `
                        )
                        .join("")
                    : '<span class="chip">No cast data</span>'
                }
              </div>
            </div>

            <div class="meta-row">
              <p class="meta-label">Genres</p>
              <div class="chip-wrap">
                ${
                  genres.length
                    ? genres.map((genre) => `<span class="chip">${escapeHtml(genre.name)}</span>`).join("")
                    : '<span class="chip">Unknown</span>'
                }
              </div>
            </div>

            <div class="meta-row">
              <p class="meta-label">Your rating</p>
              <div class="rating-wrap">
                <div class="rating-stars" data-rating-stars="true">${renderRatingStars(movieRow.rating)}</div>
                <button type="button" class="clear-rating-btn" data-clear-rating="true">Clear</button>
              </div>
              <p class="rating-value">${formatRating(movieRow.rating)}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function onMovieModalContentClick(event) {
    const actorButton = event.target.closest("[data-actor-name]");
    if (actorButton) {
      const actorName = actorButton.getAttribute("data-actor-name");
      void openActorWikipedia(actorName);
      return;
    }

    const clearButton = event.target.closest("[data-clear-rating]");
    if (clearButton) {
      void updateRating(state.activeMovieId, null);
      return;
    }

    const star = event.target.closest("[data-star-value]");
    if (star) {
      const starValue = Number(star.getAttribute("data-star-value"));
      const rect = star.getBoundingClientRect();
      const clickOffset = event.clientX - rect.left;
      const half = clickOffset < rect.width / 2;
      const nextRating = half ? starValue - 0.5 : starValue;
      void updateRating(state.activeMovieId, nextRating);
    }
  }

  function renderRatingStars(rating) {
    const value = typeof rating === "number" ? rating : 0;
    const stars = [];

    for (let i = 1; i <= 5; i += 1) {
      let cls = "";
      if (value >= i) {
        cls = "is-full";
      } else if (value >= i - 0.5) {
        cls = "is-half";
      }
      stars.push(
        `<button type="button" class="rating-star ${cls}" data-star-value="${i}" aria-label="Rate ${i} stars">&#9733;</button>`
      );
    }

    return stars.join("");
  }

  async function updateRating(movieId, rating) {
    if (!movieId || !state.unlocked || state.pendingMovieIds.has(movieId)) {
      return;
    }

    const movie = state.movies.find((item) => Number(item.id) === Number(movieId));
    if (!movie) {
      return;
    }

    const nextRating = typeof rating === "number" ? normalizeHalfStep(rating) : null;
    const previousRating = movie.rating;

    state.pendingMovieIds.add(movieId);
    movie.rating = nextRating;

    renderMovieSections();

    if (state.activeMovieId === Number(movieId)) {
      const detail = await getMovieDetailBundle(movie.tmdb_id).catch(() => null);
      if (detail && state.activeMovieId === Number(movieId)) {
        renderMovieDetail(movie, detail);
      }
    }

    try {
      const data = await apiRequest("/api/movies", {
        method: "PATCH",
        body: { id: Number(movie.id), rating: nextRating },
      });

      if (data.movie) {
        upsertMovie(data.movie);
      }

      renderMovieSections();

      if (state.activeMovieId === Number(movieId)) {
        const detail = await getMovieDetailBundle(movie.tmdb_id).catch(() => null);
        if (detail && state.activeMovieId === Number(movieId)) {
          renderMovieDetail(movie, detail);
        }
      }
    } catch (error) {
      movie.rating = previousRating;
      renderMovieSections();

      if (state.activeMovieId === Number(movieId)) {
        const detail = await getMovieDetailBundle(movie.tmdb_id).catch(() => null);
        if (detail && state.activeMovieId === Number(movieId)) {
          renderMovieDetail(movie, detail);
        }
      }

      showToast(error.message || "Could not save rating.", true);
    } finally {
      state.pendingMovieIds.delete(movieId);
    }
  }

  async function openActorWikipedia(name) {
    const actorName = (name || "").trim();
    if (!actorName) {
      return;
    }

    const title = actorName.replace(/\s+/g, "_");
    const primaryUrl = `${WIKI_BASE}${encodeURIComponent(title)}`;
    const fallbackUrl = `${WIKI_SEARCH}${encodeURIComponent(actorName)}`;

    try {
      const url = new URL(WIKI_API);
      url.searchParams.set("action", "query");
      url.searchParams.set("format", "json");
      url.searchParams.set("origin", "*");
      url.searchParams.set("titles", title);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Wikipedia lookup failed.");
      }

      const data = await response.json();
      const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
      const page = pages[0];
      const target = page && !Object.prototype.hasOwnProperty.call(page, "missing") ? primaryUrl : fallbackUrl;
      window.open(target, "_blank", "noopener,noreferrer");
    } catch (_error) {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  }

  function findYoutubeTrailerKey(videos) {
    if (!Array.isArray(videos) || !videos.length) {
      return "";
    }

    const youtube = videos.filter((item) => item.site === "YouTube");
    if (!youtube.length) {
      return "";
    }

    const preferred = youtube.find((video) => video.type === "Trailer" && video.official);
    if (preferred) {
      return preferred.key;
    }

    const trailer = youtube.find((video) => video.type === "Trailer");
    if (trailer) {
      return trailer.key;
    }

    return youtube[0].key || "";
  }

  function onDocumentClick(event) {
    const closer = event.target.closest("[data-close-modal]");
    if (!closer) {
      return;
    }

    const modalType = closer.getAttribute("data-close-modal");
    if (modalType === "search") {
      closeModal(dom.searchModal);
    } else if (modalType === "movie") {
      closeModal(dom.movieModal);
      state.activeMovieId = null;
    }
  }

  function onDocumentKeydown(event) {
    if (event.key !== "Escape") {
      return;
    }

    if (isModalOpen(dom.movieModal)) {
      closeModal(dom.movieModal);
      state.activeMovieId = null;
      return;
    }

    if (isModalOpen(dom.searchModal)) {
      closeModal(dom.searchModal);
    }
  }

  function openModal(modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    updateBodyModalState();
  }

  function closeModal(modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    updateBodyModalState();
  }

  function isModalOpen(modal) {
    return modal.classList.contains("is-open");
  }

  function updateBodyModalState() {
    const anyOpen = document.querySelector(".modal.is-open");
    if (anyOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }

  async function apiRequest(path, options = {}) {
    const method = options.method || "GET";
    const query = options.query || {};
    const signal = options.signal;
    const body = options.body;
    const secret = options.secretOverride || state.appSecret;

    if (!secret) {
      throw new Error("Missing password.");
    }

    const url = new URL(path, window.location.origin);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method,
      signal,
      headers: {
        "x-app-secret": secret,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
      if (!options.secretOverride) {
        handleUnauthorized();
      }
      const unauthorized = new Error(payload.error || "Unauthorized");
      unauthorized.code = 401;
      throw unauthorized;
    }

    if (!response.ok) {
      const error = new Error(payload.error || `Request failed with status ${response.status}.`);
      error.code = response.status;
      throw error;
    }

    return payload;
  }

  function handleUnauthorized() {
    localStorage.removeItem(APP_SECRET_KEY);
    state.appSecret = "";
    stopSyncPolling();

    closeModal(dom.searchModal);
    closeModal(dom.movieModal);

    renderLockedState();
    showSecretError("Unauthorized. Enter password again.");
    promptForSecret();
    showToast("Unauthorized. Please enter password again.", true);
  }

  function showToast(message, isError = false) {
    if (!message) {
      return;
    }

    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    dom.toast.style.background = isError ? "var(--danger)" : "#222f46";

    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      dom.toast.classList.remove("is-visible");
    }, 2600);
  }

  function formatYear(dateString) {
    if (!dateString) {
      return "Release date unknown";
    }
    const match = /^(\d{4})/.exec(dateString);
    return match ? match[1] : "Release date unknown";
  }

  function formatRating(rating) {
    if (typeof rating !== "number") {
      return "No rating yet";
    }
    return `${rating.toFixed(1)} / 5`;
  }

  function toDateValue(value) {
    const timestamp = Date.parse(value || "");
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  function normalizeHalfStep(value) {
    const normalized = Math.round(Number(value) * 2) / 2;
    if (normalized < 0.5) {
      return 0.5;
    }
    if (normalized > 5) {
      return 5;
    }
    return normalized;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#039;";
        default:
          return char;
      }
    });
  }

  function debounce(callback, delay) {
    let timeoutId = null;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(...args), delay);
    };
  }
})();
