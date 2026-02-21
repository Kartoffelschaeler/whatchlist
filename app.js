(() => {
  "use strict";

  const PREVIEW_MODE = 0;
  const APP_SECRET_KEY = "app_secret";
  const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
  const WIKI_API = "https://en.wikipedia.org/w/api.php";
  const WIKI_BASE = "https://en.wikipedia.org/wiki/";
  const WIKI_SEARCH = "https://en.wikipedia.org/wiki/Special:Search?search=";
  const DEMO_MOVIES = [
    {
      id: 1,
      tmdb_id: 27205,
      title: "Inception",
      poster_url: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
      watched: false,
      rating: 4.5,
      release_date: "2010-07-15",
      runtime: 148,
      tagline: "Your mind is the scene of the crime.",
      overview:
        "A skilled thief enters shared dream worlds to steal secrets and is offered one last impossible job.",
      director: "Christopher Nolan",
      cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page", "Tom Hardy"],
      genres: ["Science Fiction", "Action", "Thriller"],
      trailer_url: "https://www.youtube.com/embed/YoHD9XEInc0",
      created_at: "2025-01-12T09:00:00.000Z",
      updated_at: "2025-01-12T09:00:00.000Z",
    },
    {
      id: 2,
      tmdb_id: 157336,
      title: "Interstellar",
      poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      watched: true,
      rating: 5.0,
      release_date: "2014-11-05",
      runtime: 169,
      tagline: "Mankind was born on Earth. It was never meant to die here.",
      overview:
        "A former pilot joins a mission through a wormhole to find a new habitable world for humanity.",
      director: "Christopher Nolan",
      cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Mackenzie Foy"],
      genres: ["Adventure", "Drama", "Science Fiction"],
      trailer_url: "https://www.youtube.com/embed/zSWdZVtXT7E",
      created_at: "2025-01-09T09:00:00.000Z",
      updated_at: "2025-01-18T17:00:00.000Z",
    },
    {
      id: 3,
      tmdb_id: 414906,
      title: "The Batman",
      poster_url: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
      watched: false,
      rating: 3.5,
      release_date: "2022-03-01",
      runtime: 177,
      tagline: "Unmask the truth.",
      overview:
        "Batman uncovers a web of corruption in Gotham while tracking a serial killer targeting city elites.",
      director: "Matt Reeves",
      cast: ["Robert Pattinson", "Zoë Kravitz", "Paul Dano", "Jeffrey Wright"],
      genres: ["Crime", "Mystery", "Thriller"],
      trailer_url: "https://www.youtube.com/embed/mqqft2x_Aa4",
      created_at: "2025-01-15T09:00:00.000Z",
      updated_at: "2025-01-15T09:00:00.000Z",
    },
    {
      id: 4,
      tmdb_id: 438631,
      title: "Dune",
      poster_url: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
      watched: true,
      rating: 4.0,
      release_date: "2021-09-15",
      runtime: 155,
      tagline: "Beyond fear, destiny awaits.",
      overview:
        "A noble family is thrust into war over the most valuable resource in the universe on a desert planet.",
      director: "Denis Villeneuve",
      cast: ["Timothée Chalamet", "Rebecca Ferguson", "Oscar Isaac", "Zendaya"],
      genres: ["Science Fiction", "Adventure", "Drama"],
      trailer_url: "https://www.youtube.com/embed/n9xhJrPXop4",
      created_at: "2025-01-07T09:00:00.000Z",
      updated_at: "2025-01-19T11:30:00.000Z",
    },
  ];
  const PREVIEW_SEARCH_CATALOG = [
    ...DEMO_MOVIES,
    {
      id: 5,
      tmdb_id: 329865,
      title: "Arrival",
      poster_url: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
      watched: false,
      rating: null,
      runtime: 116,
      tagline: "Why are they here?",
      overview:
        "A linguist is recruited to communicate with mysterious visitors and uncover the meaning of their arrival.",
      director: "Denis Villeneuve",
      cast: ["Amy Adams", "Jeremy Renner", "Forest Whitaker"],
      genres: ["Science Fiction", "Drama"],
      trailer_url: "https://www.youtube.com/embed/tFMo3UJ4B4g",
      release_date: "2016-11-10",
    },
    {
      id: 6,
      tmdb_id: 286217,
      title: "The Martian",
      poster_url: "https://image.tmdb.org/t/p/w500/5aGhaIHYuQbqlHWvWYqMCnj40y2.jpg",
      watched: false,
      rating: null,
      runtime: 141,
      tagline: "Bring him home.",
      overview:
        "An astronaut stranded on Mars must survive alone while Earth races to bring him home.",
      director: "Ridley Scott",
      cast: ["Matt Damon", "Jessica Chastain", "Chiwetel Ejiofor"],
      genres: ["Drama", "Adventure", "Science Fiction"],
      trailer_url: "https://www.youtube.com/embed/ej3ioOneTy8",
      release_date: "2015-09-30",
    },
  ];

  const state = {
    appSecret: "",
    activeListName: "",
    unlocked: false,
    movies: [],
    loadingMovies: false,
    searchQuery: "",
    searchResults: [],
    searchLoading: false,
    searchError: "",
    searchAbortController: null,
    activeMovieId: null,
    activeTrailerEmbedUrl: "",
    activeTrailerWatchUrl: "",
    activePosterUrl: "",
    pendingMovieIds: new Set(),
    detailCache: new Map(),
    previewNextId: 1000,
    syncTimer: null,
    toastTimer: null,
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheDom();
    bindEvents();

    if (PREVIEW_MODE) {
      enterPreviewMode();
      return;
    }

    renderLockedState();

    const savedSecret = getStoredSecret();
    if (savedSecret) {
      await unlockWithSecret(savedSecret, true);
      if (!state.unlocked) {
        dom.lockInput.focus();
      }
      return;
    }

    dom.lockInput.focus();
  }

  function enterPreviewMode() {
    state.unlocked = true;
    state.appSecret = "preview-mode";
    state.activeListName = "Preview";
    state.movies = cloneMovies(DEMO_MOVIES);
    state.previewNextId = Math.max(...state.movies.map((movie) => Number(movie.id)), 0) + 1;
    dom.accessStatus.textContent = "Preview mode";
    dom.secretInlineForm.classList.add("hidden");
    dom.clearSecretBtn.classList.add("hidden");
    dom.addMovieTile.classList.remove("hidden");
    setActiveListName(state.activeListName);
    setLockError("");
    setLockedUi(false);
    renderMovieSections();
  }

  function cloneMovies(movies) {
    return movies.map((movie) => ({
      ...movie,
      cast: Array.isArray(movie.cast) ? [...movie.cast] : [],
      genres: Array.isArray(movie.genres) ? [...movie.genres] : [],
    }));
  }

  function cacheDom() {
    dom.lockScreen = document.getElementById("lock-screen");
    dom.lockForm = document.getElementById("lock-form");
    dom.lockInput = document.getElementById("lock-input");
    dom.lockSubmitBtn = document.getElementById("lock-submit-btn");
    dom.lockError = document.getElementById("lock-error");
    dom.activeListName = document.getElementById("active-list-name");

    dom.accessStatus = document.getElementById("access-status");
    dom.clearSecretBtn = document.getElementById("clear-secret-btn");
    dom.secretInlineForm = document.getElementById("secret-inline-form");
    dom.watchlistGrid = document.getElementById("watchlist-grid");
    dom.watchedGrid = document.getElementById("watched-grid");
    dom.watchlistCount = document.getElementById("watchlist-count");
    dom.watchedCount = document.getElementById("watched-count");
    dom.addMovieTile = document.getElementById("add-movie-tile");

    dom.searchModal = document.getElementById("search-modal");
    dom.searchForm = document.getElementById("search-form");
    dom.searchInput = document.getElementById("search-input");
    dom.searchResults = document.getElementById("search-results");

    dom.movieModal = document.getElementById("movie-modal");
    dom.movieModalContent = document.getElementById("movie-modal-content");
    dom.movieDeleteBtn = document.getElementById("movie-delete-btn");
    dom.trailerModal = document.getElementById("trailer-modal");
    dom.trailerIframe = document.getElementById("trailer-iframe");
    dom.trailerFallbackLink = document.getElementById("trailer-fallback-link");
    dom.posterModal = document.getElementById("poster-modal");
    dom.posterModalImage = document.getElementById("poster-modal-image");

    dom.toast = document.getElementById("toast");
  }

  function bindEvents() {
    dom.clearSecretBtn.addEventListener("click", onChangePasswordClick);
    dom.activeListName.addEventListener("click", onChangePasswordClick);
    dom.addMovieTile.addEventListener("click", openSearchModal);

    dom.lockForm.addEventListener("submit", onSecretSubmit);
    dom.searchForm.addEventListener("submit", (event) => event.preventDefault());

    dom.watchlistGrid.addEventListener("click", onMovieGridClick);
    dom.watchedGrid.addEventListener("click", onMovieGridClick);
    dom.searchResults.addEventListener("click", onSearchResultsClick);
    dom.movieModalContent.addEventListener("click", onMovieModalContentClick);
    dom.movieDeleteBtn.addEventListener("click", onMovieDeleteClick);

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
    state.movies = [];
    state.activeListName = "";
    dom.accessStatus.textContent = "Locked";
    dom.secretInlineForm.classList.add("hidden");
    dom.clearSecretBtn.classList.add("hidden");
    dom.addMovieTile.classList.add("hidden");
    setActiveListName("");
    setMovieDeleteButtonVisible(false);
    setLockedUi(true);
    renderMovieSections();
  }

  function setActiveListName(value) {
    const label = String(value || "").trim();
    dom.activeListName.textContent = label || "Current list";
    dom.activeListName.classList.toggle("hidden", !state.unlocked);
  }

  function setMovieDeleteButtonVisible(visible) {
    dom.movieDeleteBtn.classList.toggle("hidden", !visible);
    dom.movieDeleteBtn.disabled = !visible;
  }

  function setLockedUi(isLocked) {
    document.body.classList.toggle("is-locked", isLocked);
    dom.lockScreen.setAttribute("aria-hidden", isLocked ? "false" : "true");
  }

  function setLockError(message) {
    if (message) {
      dom.lockError.textContent = String(message);
      dom.lockError.classList.remove("hidden");
      return;
    }
    dom.lockError.textContent = "";
    dom.lockError.classList.add("hidden");
  }

  async function unlockWithSecret(secret, fromStorage) {
    if (PREVIEW_MODE) {
      return;
    }

    state.appSecret = secret;
    setLockError("");
    dom.lockSubmitBtn.disabled = true;

    try {
      const data = await apiRequest("/api/movies", {
        method: "GET",
        secretOverride: secret,
      });

      state.unlocked = true;
      localStorage.setItem(APP_SECRET_KEY, secret);
      dom.accessStatus.textContent = "Unlocked";
      state.activeListName = resolveListName(data);
      dom.secretInlineForm.classList.add("hidden");
      dom.clearSecretBtn.classList.remove("hidden");
      dom.addMovieTile.classList.remove("hidden");
      setActiveListName(state.activeListName);
      setLockedUi(false);
      dom.lockInput.value = "";

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
      setLockError(message);
      dom.lockInput.focus();
    } finally {
      dom.lockSubmitBtn.disabled = false;
    }
  }

  function onChangePasswordClick() {
    if (PREVIEW_MODE) {
      state.movies = cloneMovies(DEMO_MOVIES);
      state.activeListName = "Preview";
      state.detailCache.clear();
      state.previewNextId = Math.max(...state.movies.map((movie) => Number(movie.id)), 0) + 1;
      closeModal(dom.searchModal);
      closeModal(dom.movieModal);
      closeModal(dom.trailerModal);
      closeModal(dom.posterModal);
      resetTrailerPlayer();
      setActiveListName(state.activeListName);
      renderMovieSections();
      showToast("Preview reset.");
      return;
    }

    localStorage.removeItem(APP_SECRET_KEY);
    state.appSecret = "";
    stopSyncPolling();
    closeModal(dom.searchModal);
    closeModal(dom.movieModal);
    closeModal(dom.trailerModal);
    closeModal(dom.posterModal);
    resetTrailerPlayer();
    renderLockedState();
    setLockError("");
    dom.lockInput.value = "";
    dom.lockInput.focus();
  }

  function resolveListName(payload) {
    const list = payload && typeof payload === "object" ? payload.list : null;
    if (list && typeof list === "object") {
      const name = String(list.name || "").trim();
      const id = String(list.id || "").trim();
      if (name) {
        return name;
      }
      if (id) {
        return id;
      }
    }

    const listName = String(payload?.list_name || "").trim();
    if (listName) {
      return listName;
    }

    const listId = String(payload?.list_id || "").trim();
    if (listId) {
      return listId;
    }

    if (Array.isArray(payload?.movies)) {
      const firstMovieListId = String(payload.movies[0]?.list_id || "").trim();
      if (firstMovieListId) {
        return firstMovieListId;
      }
    }

    return "Current list";
  }

  async function onSecretSubmit(event) {
    event.preventDefault();
    const secret = String(dom.lockInput.value || "").trim();

    if (!secret) {
      setLockError("Please enter the shared password.");
      dom.lockInput.focus();
      return;
    }

    await unlockWithSecret(secret, false);
  }

  function startSyncPolling() {
    if (PREVIEW_MODE) {
      return;
    }

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

    if (PREVIEW_MODE) {
      renderMovieSections();
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

    const flipState = captureFlipState();
    const previousWatched = movie.watched;
    const previousUpdatedAt = movie.updated_at;

    movie.watched = watched;
    movie.updated_at = new Date().toISOString();
    renderMovieSections();
    playFlip(flipState, movieId);

    if (PREVIEW_MODE) {
      state.pendingMovieIds.delete(movieId);
      return;
    }

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

  // FLIP animation helper for smooth watched/unwatched reordering.
  function captureFlipState() {
    const cardRects = new Map();
    document.querySelectorAll(".movie-card[data-id]").forEach((card) => {
      cardRects.set(card.getAttribute("data-id"), card.getBoundingClientRect());
    });

    return {
      cardRects,
      watchlistHeight: dom.watchlistGrid.offsetHeight,
      watchedHeight: dom.watchedGrid.offsetHeight,
    };
  }

  function playFlip(flipState, highlightMovieId) {
    const watchlistTargetHeight = dom.watchlistGrid.offsetHeight;
    const watchedTargetHeight = dom.watchedGrid.offsetHeight;

    dom.watchlistGrid.style.height = `${flipState.watchlistHeight}px`;
    dom.watchedGrid.style.height = `${flipState.watchedHeight}px`;
    dom.watchlistGrid.style.overflow = "hidden";
    dom.watchedGrid.style.overflow = "hidden";

    requestAnimationFrame(() => {
      dom.watchlistGrid.style.height = `${watchlistTargetHeight}px`;
      dom.watchedGrid.style.height = `${watchedTargetHeight}px`;
      dom.watchlistGrid.style.transition = "height 260ms cubic-bezier(0.2, 0.75, 0, 1)";
      dom.watchedGrid.style.transition = "height 260ms cubic-bezier(0.2, 0.75, 0, 1)";

      document.querySelectorAll(".movie-card[data-id]").forEach((card) => {
        const movieId = card.getAttribute("data-id");
        const first = flipState.cardRects.get(movieId);
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

    window.setTimeout(() => {
      dom.watchlistGrid.style.height = "";
      dom.watchedGrid.style.height = "";
      dom.watchlistGrid.style.transition = "";
      dom.watchedGrid.style.transition = "";
      dom.watchlistGrid.style.overflow = "";
      dom.watchedGrid.style.overflow = "";
    }, 320);
  }

  function openSearchModal() {
    if (!state.unlocked) {
      showToast("Enter the shared password to unlock.", true);
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

    if (PREVIEW_MODE) {
      const normalized = query.toLowerCase();
      state.searchResults = PREVIEW_SEARCH_CATALOG.filter((movie) =>
        String(movie.title || "")
          .toLowerCase()
          .includes(normalized)
      ).map((movie) => ({
        id: movie.tmdb_id || movie.id,
        title: movie.title,
        original_title: movie.title,
        release_date: movie.release_date || "",
        runtime: movie.runtime || null,
        tagline: movie.tagline || "",
        poster_url: movie.poster_url || "",
        overview: movie.overview || "",
        director: movie.director || "Unknown",
        cast: Array.isArray(movie.cast) ? movie.cast.slice(0, 10) : [],
        genres: Array.isArray(movie.genres) ? [...movie.genres] : [],
        trailer_url: movie.trailer_url || "",
      }));
      state.searchLoading = false;
      renderSearchResults();
      return;
    }

    if (!PREVIEW_MODE) {
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
        const posterUrl = result.poster_url || (result.poster_path ? `${IMAGE_BASE}${result.poster_path}` : "");
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
      if (PREVIEW_MODE) {
        const result = state.searchResults.find((item) => Number(item.id) === tmdbId);
        if (!result) {
          throw new Error("Movie not found in preview catalog.");
        }

        const createdAt = new Date().toISOString();
        const previewMovie = {
          id: state.previewNextId++,
          tmdb_id: tmdbId,
          title: result.title || result.original_title || "Untitled",
          poster_url: result.poster_url || (result.poster_path ? `${IMAGE_BASE}${result.poster_path}` : null),
          watched: false,
          rating: null,
          release_date: result.release_date || "",
          runtime: result.runtime || null,
          tagline: result.tagline || "",
          overview: result.overview || "No description available for this movie.",
          director: result.director || "Unknown",
          cast: Array.isArray(result.cast) ? result.cast.slice(0, 10) : [],
          genres: Array.isArray(result.genres) ? [...result.genres] : [],
          trailer_url: result.trailer_url || "",
          created_at: createdAt,
          updated_at: createdAt,
        };

        const flipState = captureFlipState();
        upsertMovie(previewMovie, true);
        renderMovieSections();
        playFlip(flipState, previewMovie.id);
        renderSearchResults();
        showToast("Movie added.");
        return;
      }

      if (!PREVIEW_MODE) {
        const data = await apiRequest("/api/movies", {
          method: "POST",
          body: { tmdb_id: tmdbId },
        });

        if (!data.movie) {
          throw new Error("Could not add movie.");
        }

        const flipState = captureFlipState();
        upsertMovie(data.movie, true);
        renderMovieSections();
        playFlip(flipState, data.movie.id);
        renderSearchResults();
        showToast("Movie added.");
      }
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
      showToast("Enter the shared password to unlock.", true);
      return;
    }

    const movie = state.movies.find((item) => Number(item.id) === Number(movieId));
    if (!movie) {
      return;
    }

    state.activeMovieId = Number(movieId);
    setMovieDeleteButtonVisible(Boolean(movie.watched));
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
    if (PREVIEW_MODE) {
      const movie = state.movies.find((item) => Number(item.tmdb_id) === Number(tmdbId));
      if (!movie) {
        throw new Error("Movie details unavailable in preview mode.");
      }
      return buildPreviewDetailBundle(movie);
    }

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
    const trailerWatchUrl = trailerKey ? `https://www.youtube.com/watch?v=${encodeURIComponent(trailerKey)}` : "";
    const releaseYear = formatYear(movie.release_date || movieRow.release_date || "");
    const topMeta = `${releaseYear !== "Release date unknown" ? releaseYear : "Year unknown"} • directed by ${
      director?.name || movieRow.director || "Unknown"
    }`;
    const runtimeLabel = formatRuntime(movie.runtime || movieRow.runtime);
    const tagline = movie.tagline || movieRow.tagline || "";
    const overview = movie.overview || movieRow.overview || "No description available for this movie.";
    const posterUrl = movieRow.poster_url || "";
    const trailerUnavailable = !trailerKey;
    const castHtml = cast.length
      ? cast
          .map(
            (person) => `
              <button type="button" class="actor-btn" data-actor-name="${escapeHtml(person.name)}">
                ${escapeHtml(person.name)}
              </button>
            `
          )
          .join("")
      : '<p class="meta-note">Cast unavailable.</p>';

    dom.movieModalContent.innerHTML = `
      <div class="detail-shell">
        <div class="detail-top-grid">
          <div class="detail-left">
            <h2 class="detail-title">${escapeHtml(movieRow.title)}</h2>

            <div class="detail-meta-actions">
              <p class="detail-topline">${escapeHtml(topMeta)}</p>

              <div class="detail-actions">
                <button
                  type="button"
                  class="trailer-btn"
                  data-open-trailer="true"
                  data-trailer-key="${escapeHtml(trailerKey)}"
                  data-trailer-watch="${escapeHtml(trailerWatchUrl)}"
                  data-trailer-title="${escapeHtml(movieRow.title)}"
                  ${trailerUnavailable ? "disabled" : ""}
                >
                  ${trailerUnavailable ? "Trailer unavailable" : "Trailer"}
                </button>
                <span class="runtime-badge">${escapeHtml(runtimeLabel)}</span>
              </div>
            </div>

            <div class="detail-desc">
              ${tagline ? `<p class="detail-tagline">${escapeHtml(tagline)}</p>` : ""}
              <p class="overview">${escapeHtml(overview)}</p>
            </div>
          </div>

          ${
            posterUrl
              ? `
                <button
                  type="button"
                  class="detail-poster-btn"
                  data-open-poster="true"
                  data-poster-url="${escapeHtml(posterUrl)}"
                  data-poster-title="${escapeHtml(movieRow.title)}"
                >
                  <img class="detail-poster" src="${escapeHtml(posterUrl)}" alt="Poster for ${escapeHtml(
                  movieRow.title
                )}" loading="lazy" />
                </button>
              `
              : `<div class="detail-poster-placeholder">Poster unavailable</div>`
          }
        </div>

        <div class="detail-lower">
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
            <p class="meta-label">Cast</p>
            <div class="cast-wrap">${castHtml}</div>
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
    `;

    setMovieDeleteButtonVisible(Boolean(movieRow.watched));
  }

  async function onMovieDeleteClick() {
    const movieId = Number(state.activeMovieId);
    if (!movieId || state.pendingMovieIds.has(movieId)) {
      return;
    }

    const movie = state.movies.find((item) => Number(item.id) === movieId);
    if (!movie || !movie.watched) {
      return;
    }

    const confirmed = window.confirm(`Delete "${movie.title}"?`);
    if (!confirmed) {
      return;
    }

    state.pendingMovieIds.add(movieId);
    const previousMovies = [...state.movies];

    state.movies = state.movies.filter((item) => Number(item.id) !== movieId);
    renderMovieSections();
    closeModal(dom.movieModal);
    state.activeMovieId = null;
    setMovieDeleteButtonVisible(false);

    if (PREVIEW_MODE) {
      state.pendingMovieIds.delete(movieId);
      showToast("Movie deleted.");
      return;
    }

    try {
      await apiRequest("/api/movies", {
        method: "DELETE",
        body: { id: movieId },
      });
      showToast("Movie deleted.");
    } catch (error) {
      state.movies = previousMovies;
      renderMovieSections();
      showToast(error.message || "Could not delete movie.", true);
    } finally {
      state.pendingMovieIds.delete(movieId);
    }
  }

  function onMovieModalContentClick(event) {
    const trailerButton = event.target.closest("[data-open-trailer]");
    if (trailerButton) {
      const trailerKey = trailerButton.getAttribute("data-trailer-key") || "";
      const trailerWatch = trailerButton.getAttribute("data-trailer-watch") || "";
      const trailerTitle = trailerButton.getAttribute("data-trailer-title") || "Trailer";
      if (trailerKey) {
        openTrailerModal(trailerKey, trailerTitle, trailerWatch);
      }
      return;
    }

    const posterButton = event.target.closest("[data-open-poster]");
    if (posterButton) {
      const posterUrl = posterButton.getAttribute("data-poster-url") || "";
      const posterTitle = posterButton.getAttribute("data-poster-title") || "Poster";
      if (posterUrl) {
        openPosterModal(posterUrl, posterTitle);
      }
      return;
    }

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

    if (PREVIEW_MODE) {
      state.pendingMovieIds.delete(movieId);
      return;
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

    if (PREVIEW_MODE) {
      window.open(primaryUrl, "_blank", "noopener,noreferrer");
      return;
    }

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

  // Dedicated trailer modal with robust YouTube-nocookie embed and fallback link.
  function openTrailerModal(trailerKey, trailerTitle, fallbackWatchUrl) {
    state.activeTrailerEmbedUrl = buildTrailerEmbedUrl(trailerKey);
    state.activeTrailerWatchUrl =
      fallbackWatchUrl || `https://www.youtube.com/watch?v=${encodeURIComponent(trailerKey)}`;

    dom.trailerIframe.src = state.activeTrailerEmbedUrl;
    dom.trailerIframe.title = `Trailer for ${trailerTitle || "movie"}`;
    dom.trailerFallbackLink.href = state.activeTrailerWatchUrl;

    openModal(dom.trailerModal);
  }

  function resetTrailerPlayer() {
    state.activeTrailerEmbedUrl = "";
    state.activeTrailerWatchUrl = "";
    dom.trailerIframe.src = "";
    dom.trailerFallbackLink.href = "#";
  }

  // Poster lightbox for full-screen poster view with simple tap-outside close.
  function openPosterModal(posterUrl, movieTitle) {
    state.activePosterUrl = posterUrl;
    dom.posterModalImage.src = posterUrl;
    dom.posterModalImage.alt = `Poster for ${movieTitle || "movie"}`;
    openModal(dom.posterModal);
  }

  function buildTrailerEmbedUrl(trailerKey) {
    const base = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailerKey)}`;
    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      origin: window.location.origin,
    });
    return `${base}?${params.toString()}`;
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
      setMovieDeleteButtonVisible(false);
    } else if (modalType === "trailer") {
      closeModal(dom.trailerModal);
      resetTrailerPlayer();
    } else if (modalType === "poster") {
      closeModal(dom.posterModal);
    }
  }

  function onDocumentKeydown(event) {
    if (event.key !== "Escape") {
      return;
    }

    if (isModalOpen(dom.posterModal)) {
      closeModal(dom.posterModal);
      return;
    }

    if (isModalOpen(dom.trailerModal)) {
      closeModal(dom.trailerModal);
      resetTrailerPlayer();
      return;
    }

    if (isModalOpen(dom.movieModal)) {
      closeModal(dom.movieModal);
      state.activeMovieId = null;
      setMovieDeleteButtonVisible(false);
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
    if (PREVIEW_MODE) {
      throw new Error("Network requests are disabled in preview mode.");
    }

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
    if (PREVIEW_MODE) {
      return;
    }

    localStorage.removeItem(APP_SECRET_KEY);
    state.appSecret = "";
    stopSyncPolling();

    closeModal(dom.searchModal);
    closeModal(dom.movieModal);
    closeModal(dom.trailerModal);
    closeModal(dom.posterModal);
    resetTrailerPlayer();

    renderLockedState();
    setLockError("Unauthorized. Please enter password again.");
    dom.lockInput.focus();
  }

  function buildPreviewDetailBundle(movie) {
    const trailerKey = extractYouTubeKey(movie.trailer_url || "");
    return {
      movie: {
        release_date: movie.release_date || "",
        runtime: movie.runtime || null,
        tagline: movie.tagline || "",
        overview: movie.overview || "No description available for this movie.",
        genres: Array.isArray(movie.genres) ? movie.genres.map((name) => ({ name })) : [],
      },
      credits: {
        crew: movie.director ? [{ job: "Director", name: movie.director }] : [],
        cast: Array.isArray(movie.cast) ? movie.cast.map((name) => ({ name })) : [],
      },
      videos: {
        results: trailerKey
          ? [{ site: "YouTube", type: "Trailer", official: true, key: trailerKey }]
          : [],
      },
    };
  }

  function extractYouTubeKey(url) {
    const value = String(url || "");
    const embedMatch = /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i.exec(value);
    if (embedMatch) {
      return embedMatch[1];
    }
    const watchMatch = /[?&]v=([A-Za-z0-9_-]{6,})/i.exec(value);
    if (watchMatch) {
      return watchMatch[1];
    }
    return "";
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

  function formatRuntime(runtimeMinutes) {
    const runtime = Number(runtimeMinutes);
    if (!Number.isFinite(runtime) || runtime <= 0) {
      return "Runtime unavailable";
    }
    const hours = Math.floor(runtime / 60);
    const mins = runtime % 60;
    if (!hours) {
      return `${mins}m`;
    }
    return `${hours}h ${mins}m`;
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
