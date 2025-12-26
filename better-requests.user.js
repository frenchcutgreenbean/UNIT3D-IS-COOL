// ==UserScript==
// @name         Better-Requests
// @version      0.1
// @description  Streamline request creation.
// @match        *://*/torrents/create*
// @match        *://*/requests/create*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/better-requests.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/better-requests.user.js
// @grant        GM.xmlHttpRequest
// @grant        GM.addStyle
// @grant        GM.getValue
// @grant        GM.setValue

// ==/UserScript==



/*jshint esversion: 6 */
(function () {
  "use strict";

  const TMDB_KEY = ""; // Add your TMDB API key here
  const YEAR_REGEX = /\b\d{4}\b/g;
  const isRequestPage = window.location.pathname.includes('/requests/create');

  // Form selectors
  const SELECTORS = {
    TITLE: '#title',
    CATEGORY: '#category_id',
    TYPE: '#type_id',
    RESOLUTION: '#resolution_id',
    SEASON: '#season_number',
    EPISODE: '#episode_number'
  };


  ///////////
  /* UTILS */
  ///////////
  function GM_xmlHttpRequest_promise(details) {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        ...details,
        onload: resolve,
        onerror: reject,
      });
    });
  }

  // Helper to find option value by text content
  function findOptionByText(selectElement, searchText, caseSensitive = false) {
    if (!selectElement) return null;
    const search = caseSensitive ? searchText : searchText.toLowerCase();
    const options = selectElement.querySelectorAll('option');

    for (const option of options) {
      const optionText = caseSensitive ? option.textContent.trim() : option.textContent.trim().toLowerCase();
      if (optionText === search) {
        return option.value;
      }
    }
    return null;
  }

  // Parse title to extract metadata
  function parseTitle(title) {
    const titleLower = title.toLowerCase();
    const result = {
      category: null,
      type: null,
      resolution: null,
      season: null,
      episode: null
    };

    // Detect category (TV if has season pattern)
    const seasonMatch = title.match(/s(\d{1,2})(?:e(\d{1,2}))?/i);
    if (seasonMatch) {
      result.category = 'TV';
      result.season = parseInt(seasonMatch[1], 10);
      result.episode = seasonMatch[2] ? parseInt(seasonMatch[2], 10) : 0;
    } else {
      result.category = 'Movie';
    }

    // Detect type (order matters - check specific types first)
    if (/remux/i.test(titleLower)) {
      result.type = 'Remux';
    } else if (/web-?dl/i.test(titleLower)) {
      result.type = 'WEB-DL';
    } else if (/webrip/i.test(titleLower)) {
      result.type = 'WEBRip';
    } else if (/hdtv/i.test(titleLower)) {
      result.type = 'HDTV';
    } else if (/x26[45]/i.test(titleLower)) {
      result.type = 'Encode';
    } else if (
      (/(bluray|blu-ray).*disc|full.*disc/i.test(titleLower)) ||
      (/hevc|avc|vc-?1|ntsc|pal/i.test(titleLower) && !/remux|web-?dl/i.test(titleLower))
    ) {
      result.type = 'Full Disc';
    } else {
      result.type = 'Any';
    }

    // Detect resolution
    const resolutionMatch = title.match(/\b(4320p|2160p|1440p|1080[pi]|720p|576[pi]|480[pi])\b/i);
    if (resolutionMatch) {
      result.resolution = resolutionMatch[1];
    } else {
      result.resolution = 'Any';
    }

    return result;
  }

  // Apply parsed data to form fields
  async function applyParsedData(parsedData) {
    const categoryElement = document.querySelector(SELECTORS.CATEGORY);
    const typeElement = document.querySelector(SELECTORS.TYPE);
    const resolutionElement = document.querySelector(SELECTORS.RESOLUTION);
    const seasonElement = document.querySelector(SELECTORS.SEASON);
    const episodeElement = document.querySelector(SELECTORS.EPISODE);

    // Helper to set select value and trigger events
    const setSelectValue = (element, searchText) => {
      if (!element || !searchText) return;
      const value = findOptionByText(element, searchText);
      if (value) {
        element.value = value;
        ['input', 'change', 'blur'].forEach(eventType => {
          element.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
      }
    };

    // Set category first (may trigger conditional fields)
    if (parsedData.category) {
      setSelectValue(categoryElement, parsedData.category);
      // Wait for conditional fields to appear
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Set type and resolution
    if (parsedData.type) {
      setSelectValue(typeElement, parsedData.type);
    }
    if (parsedData.resolution) {
      setSelectValue(resolutionElement, parsedData.resolution);
    }

    // Set season and episode for TV shows
    if (parsedData.season !== null && seasonElement) {
      seasonElement.value = parsedData.season;
      seasonElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (parsedData.episode !== null && episodeElement) {
      episodeElement.value = parsedData.episode;
      episodeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function cleanTitle(year, title) {
    // First remove year if present
    if (year) {
      title = title.split(year)[0].trim();
    }

    // Also remove season/episode patterns (S01, S01E01, etc)
    const seasonPattern = /\s*s\d{1,2}(?:e\d{1,2})?\s*/i;
    const seasonMatch = title.match(seasonPattern);
    if (seasonMatch) {
      title = title.split(seasonMatch[0])[0].trim();
    }

    let candidates = [];

    // Handle "aka" titles
    if (/\saka\s/i.test(title)) {
      const possibleTitles = title.split(/\saka\s/i).map(s => s.trim());
      for (const t of possibleTitles) {
        if (t) candidates.push(t);
      }
      return candidates;
    }
    return [title]
  }

  function normalizeTitle(s) {
    if (!s) return "";
    return s
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")      // remove diacritics
      .replace(/[^a-z0-9 ]+/gi, " ")        // strip punctuation
      .replace(/\s+/g, " ")                 // collapse spaces
      .trim()
      .toLowerCase();
  }

  function matchScore(result, candidates = []) {
    const titleNorm = normalizeTitle(result.title || "");
    const ogNorm = normalizeTitle(result.original_title || "");
    let score = 0;

    // boost by votes
    const votes = Number(result.vote_count || 0);
    if (votes > 0) {
      score += Math.min(40, Math.log10(votes + 1) * 10); // 0..~40
    }

    // small boost by TMDB popularity
    const popularity = Number(result.popularity || 0);
    if (popularity > 0) {
      score += Math.min(30, Math.log10(popularity + 1) * 10); // 0..~30
    }

    for (const c of candidates) {
      const cand = normalizeTitle(c);
      if (!cand) continue;

      // exact normalized matches are best
      if (cand === titleNorm || cand === ogNorm) {
        score += 100;
        continue;
      }

      // common partial matches
      if (titleNorm.includes(cand) || ogNorm.includes(cand)) {
        score += 50;
      } else if (cand.includes(titleNorm) || cand.includes(ogNorm)) {
        score += 30;
      }
    }

    return score;
  }

  function findBestMatch(results = [], candidates = []) {
    let best = null;
    let bestScore = 0;

    for (const r of results) {
      const s = matchScore(r, candidates);
      if (s > bestScore) {
        bestScore = s;
        best = r;
      }
    }
    return bestScore >= 60 ? best : null;
  }

  async function fetch_tmdb_id(year, title, type) {
    const search_title = title[0];

    const params = {
      api_key: TMDB_KEY,
      language: "en-US",
      query: search_title,
      include_adult: true
    };

    // Add year parameter only if year exists.
    if (year) {
      params.year = year;
    }

    const url = `https://api.themoviedb.org/3/search/${type}?${new URLSearchParams(params).toString()}`;
    const response = await GM_xmlHttpRequest_promise({
      method: "GET",
      url: url,
    });
    const data = JSON.parse(response.responseText || "{}");
    if (!data.results || !data.results.length) return null;

    // Try to find a good match among results using candidates
    const matched = findBestMatch(data.results, title);
    if (matched) return matched;

    // fallback: prefer first highly voted result, else first result
    const sorted = data.results.slice().sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    if (sorted[0] && (sorted[0].vote_count || 0) >= 5) return sorted[0];

    return data.results[0] || null;
  }

  async function fetch_ids(tmdbResult, type, title) {
    let tmdb_id = null, imdb_id = null, tvdb_id = null, mal_id = null;
    let keywords = [];
    try {
      if (tmdbResult) {
        const result = tmdbResult;
        tmdb_id = result.id;
        let genres = result.genre_ids.map(genreId => getGenreName(genreId));
        keywords = genres;
        const isAnime = genres.includes("Animation");

        // Fetch external IDs (IMDb, TVDB)
        if (tmdb_id) {
          const external_url = `https://api.themoviedb.org/3/${type}/${tmdb_id}/external_ids?api_key=${TMDB_KEY}`;
          const response2 = await GM_xmlHttpRequest_promise({
            method: "GET",
            url: external_url,
          });
          const data2 = JSON.parse(response2.responseText);
          if (data2.imdb_id) {
            imdb_id = data2.imdb_id.replace("tt", "").trim();
          }
          if (data2.tvdb_id) {
            tvdb_id = data2.tvdb_id;
          }
        }

        // Fetch MAL ID for anime
        if (isAnime && tmdb_id) {
          fetch_info.textContent = "Checking MAL...";
          const response3 = await GM_xmlHttpRequest_promise({
            method: "GET",
            url: `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`,
          });
          const data3 = JSON.parse(response3.responseText);
          if (data3.data && data3.data.length > 0) {
            const mal_data = data3.data[0];
            let possible_titles = mal_data.titles.map(t => t.title).join(" ").toLowerCase();
            if (possible_titles.includes(title.toLowerCase())) {
              mal_id = mal_data.mal_id;
            } else {
              mal_id = 0;
            }
          }
        }
      } else {
        fetch_info.textContent = "No results found on TMDB. Please check the title and try again.";
        fetch_button.disabled = false;
      }

      // Set the correct TMDB ID field based on media type
      const tmdbFieldId = type === "movie" ? "tmdb_movie_id" : "tmdb_tv_id";
      const tmdbElement = document.getElementById(tmdbFieldId);
      if (tmdbElement) {
        tmdbElement.value = tmdb_id || 0;
        ['input', 'change', 'blur'].forEach(eventType => {
          tmdbElement.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
      }

      const imdbElement = document.getElementById("autoimdb");
      if (imdbElement) imdbElement.value = imdb_id || 0;

      const tvdbElement = document.getElementById("autotvdb");
      if (tvdbElement) tvdbElement.value = tvdb_id || 0;

      const malElement = document.getElementById("automal");
      if (malElement) {
        malElement.value = mal_id || 0;
        
        // If MAL ID is 0 or null, uncheck the anime_exists_on_mal checkbox
        if (!mal_id || mal_id === 0) {
          const animeExistsCheckbox = document.getElementById("anime_exists_on_mal");
          if (animeExistsCheckbox) {
            animeExistsCheckbox.checked = false;
            ['input', 'change', 'blur'].forEach(eventType => {
              animeExistsCheckbox.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
          }
        }
      }

      // Safely set the keywords field if it exists
      const keywordsElement = document.getElementById("autokeywords");
      if (keywordsElement) keywordsElement.value = keywords.join(', ');

      fetch_info.textContent = "Search complete!";
      fetch_button.disabled = false;

      // Generate and insert the external resource URLs
      insertExternalLinks(tmdb_id, imdb_id, tvdb_id, mal_id, type, title);

    } catch (error) {
      console.error("Error fetching data:", error.message);
    }
  }

  function getGenreName(genreId) {
    const genreMap = {
      28: "Action",
      12: "Adventure",
      16: "Animation",
      35: "Comedy",
      80: "Crime",
      99: "Documentary",
      18: "Drama",
      10751: "Family",
      14: "Fantasy",
      36: "History",
      27: "Horror",
      10402: "Music",
      9648: "Mystery",
      10749: "Romance",
      878: "Science Fiction",
      10770: "TV Movie",
      53: "Thriller",
      10752: "War",
      37: "Western"
    };
    return genreMap[genreId] || "Unknown";
  }

  function insertExternalLinks(tmdb_id, imdb_id, tvdb_id, mal_id, type, title) {
    const panelBody = document.querySelector("aside .panelV2 .panel__body");
    if (panelBody) {
      const externalLinksContainer = document.createElement("div");
      externalLinksContainer.className = "external-links-container";
      const displayTitle = typeof title === 'string' ? title : (title && title.value) ? title.value : '';
      externalLinksContainer.innerHTML = `<strong>External Links: ${displayTitle} </strong><br>`;
      if (tmdb_id) {
        externalLinksContainer.innerHTML += `<a href="https://www.themoviedb.org/${type}/${tmdb_id}" target="_blank"><img src="https://www.google.com/s2/favicons?sz=64&domain=themoviedb.org" alt="TMDB" style="width:16px; vertical-align:middle; margin-right:5px;"> TMDB</a><br>`;
      }
      if (imdb_id) {
        externalLinksContainer.innerHTML += `<a href="https://www.imdb.com/title/tt${imdb_id}" target="_blank"><img src="https://www.google.com/s2/favicons?sz=64&domain=imdb.com" alt="IMDb" style="width:16px; vertical-align:middle; margin-right:5px;"> IMDb</a><br>`;
      }
      if (tvdb_id) {
        externalLinksContainer.innerHTML += `<a href="https://thetvdb.com/?tab=series&id=${tvdb_id}" target="_blank"><img src="https://www.google.com/s2/favicons?sz=64&domain=thetvdb.com" alt="TVDB" style="width:16px; vertical-align:middle; margin-right:5px;"> TVDB</a><br>`;
      }
      if (mal_id) {
        externalLinksContainer.innerHTML += `<a href="https://myanimelist.net/anime/${mal_id}" target="_blank"><img src="https://www.google.com/s2/favicons?sz=64&domain=myanimelist.net" alt="MAL" style="width:16px; vertical-align:middle; margin-right:5px;"> MAL</a><br>`;
      }

      panelBody.appendChild(externalLinksContainer);
    }
  }

  // Add styles for the Fetch button and container
  const fetchStyler = `
        #fetch-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
            padding: 16px;
            margin-bottom: 20px;
            background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
        }

        #parse-buttons-row {
            display: flex;
            gap: 12px;
            width: 100%;
        }

        #parse-buttons-row .fetch {
            flex: 1;
        }
        
        #template-buttons-row {
            display: flex;
            gap: 12px;
            width: 100%;
        }
        
        #template-buttons-row .fetch {
            flex: 1;
        }

        #fetch-info {
            text-align: center;
            color: #f39c12;
            font-size: 13px;
            padding: 8px;
            margin: 0;
            background: rgba(243, 156, 18, 0.1);
            border-radius: 6px;
            border-left: 3px solid #f39c12;
        }

        .fetch {
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            color: #ffffff;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        #fetch {
            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
            margin-bottom: 4px;
        }

        #fetch:hover:not(:disabled) {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3);
        }

        #fetch:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        #parse {
            background: linear-gradient(135deg, #50C6BA 0%, #5ba69f 100%);
        }

        #parse:hover {
            background: linear-gradient(135deg, #50C6BA 0%, #5ba69f 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(230, 126, 34, 0.3);
        }

        #parse-fetch {
            background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
        }

        #parse-fetch:hover:not(:disabled) {
            background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(22, 160, 133, 0.3);
        }

        #parse-fetch:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        #save-template {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        }

        #save-template:hover {
            background: linear-gradient(135deg, #5dade2 0%, #3498db 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
        }

        #load-template {
            background: linear-gradient(135deg, #442b4f 0%, #4e3857 100%);
        }

        #load-template:hover {
            background: linear-gradient(135deg, #442b4f 0%, #4e3857 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(155, 89, 182, 0.3);
        }

        .external-links-container {
            margin-top: 15px;
            padding: 12px;
            background: rgba(255,255,255,0.03);
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .external-links-container strong {
            display: block;
            margin-bottom: 8px;
            color: #ecf0f1;
        }

        .external-links-container a {
            display: inline-flex;
            align-items: center;
            color: #3498db;
            text-decoration: none;
            padding: 4px 0;
            transition: color 0.2s ease;
        }

        .external-links-container a:hover {
            color: #5dade2;
        }
        `;
  GM.addStyle(fetchStyler);

  const form = document.querySelector("#upload-form") || document.querySelector(".panelV2 form");
  if (!form) {
    console.error("Upload form not found. Exiting script.");
    return;
  }

  const fetch_container = document.createElement("div");
  fetch_container.id = "fetch-container";
  const fetch_button = document.createElement("button");
  const fetch_info = document.createElement("p");

  // Set initial message based on API key availability
  if (!TMDB_KEY) {
    fetch_info.textContent = "⚠️ TMDB API key required for fetching. Add your API key to the script.";
    fetch_button.disabled = true;
  } else {
    fetch_info.textContent = "Enter title. Use Parse to auto-fill fields, or Parse & Fetch to auto-fill + get IDs.";
  }

  fetch_info.id = "fetch-info";
  fetch_button.textContent = "Fetch IDs";
  fetch_button.addEventListener("click", on_fetch_click);
  fetch_button.id = "fetch";
  fetch_button.className = "fetch";

  // Only add parse buttons on request pages
  if (isRequestPage) {
    // Create Parse buttons
    const parse_button = document.createElement("button");
    parse_button.textContent = "Parse";
    parse_button.id = "parse";
    parse_button.className = "fetch";
    parse_button.addEventListener("click", on_parse_click);

    const parse_fetch_button = document.createElement("button");
    parse_fetch_button.textContent = "Parse & Fetch";
    parse_fetch_button.id = "parse-fetch";
    parse_fetch_button.className = "fetch";
    parse_fetch_button.addEventListener("click", on_parse_and_fetch_click);

    // Disable Parse & Fetch if no API key
    if (!TMDB_KEY) {
      parse_fetch_button.disabled = true;
    }

    // Create row container for parse buttons
    const parse_buttons_row = document.createElement("div");
    parse_buttons_row.id = "parse-buttons-row";
    parse_buttons_row.append(parse_button);
    parse_buttons_row.append(parse_fetch_button);

    fetch_container.append(parse_buttons_row);
  }

  fetch_container.append(fetch_button);
  fetch_container.append(fetch_info);

  // Only add template buttons on request pages
  // Separate row for better layout
  if (isRequestPage) {
    const save_template_button = document.createElement("button");
    save_template_button.textContent = "Save Template";
    save_template_button.id = "save-template";
    save_template_button.className = "fetch";
    save_template_button.addEventListener("click", saveFormInputs);

    const load_template_button = document.createElement("button");
    load_template_button.textContent = "Load Template";
    load_template_button.id = "load-template";
    load_template_button.className = "fetch";
    load_template_button.addEventListener("click", loadFormInputs);

    // Create row container for template buttons
    const template_buttons_row = document.createElement("div");
    template_buttons_row.id = "template-buttons-row";
    template_buttons_row.append(save_template_button);
    template_buttons_row.append(load_template_button);

    fetch_container.append(template_buttons_row);
  }

  form.prepend(fetch_container);


  // Parse button click handler
  async function on_parse_click(e) {
    e.preventDefault();

    const titleElement = document.querySelector(SELECTORS.TITLE);
    if (!titleElement || !titleElement.value) {
      alert('Please enter a title first.');
      return;
    }

    const title = titleElement.value;
    const parsedData = parseTitle(title);

    fetch_info.textContent = `Parsed: ${parsedData.category} | ${parsedData.type} | ${parsedData.resolution}`;

    await applyParsedData(parsedData);

    fetch_info.textContent = 'Parsing complete!';
  }

  // Parse & Fetch button click handler
  async function on_parse_and_fetch_click(e) {
    e.preventDefault();

    // First parse
    const titleElement = document.querySelector(SELECTORS.TITLE);
    if (!titleElement || !titleElement.value) {
      alert('Please enter a title first.');
      return;
    }

    const title = titleElement.value;
    const parsedData = parseTitle(title);

    fetch_info.textContent = `Parsing: ${parsedData.category} | ${parsedData.type} | ${parsedData.resolution}`;
    await applyParsedData(parsedData);

    // Then fetch
    await new Promise(resolve => setTimeout(resolve, 100));
    await on_fetch_click(e);
  }

  async function on_fetch_click(e) {
    e.preventDefault();

    const titleElement = document.querySelector(SELECTORS.TITLE);
    if (!titleElement) {
      alert('Title element not found.');
      return;
    }

    let title = titleElement.value;
    if (!title) {
      alert('Please enter a title.');
      return;
    }

    const categoryElement = document.querySelector(SELECTORS.CATEGORY) || document.getElementById("autocat");
    if (!categoryElement) {
      alert('Category element not found.');
      return;
    }

    let cat = categoryElement.value;
    let type = cat === "2" ? "tv" : "movie";

    // Extract year if present
    let year = title.match(YEAR_REGEX);
    year = year ? year.at(-1) : "";

    const candidates = cleanTitle(year, title);
    fetch_info.textContent = "Searching TMDB for " + (candidates[0] || title) + "...";
    fetch_button.disabled = true;

    const tmdbResult = await fetch_tmdb_id(year, candidates, type);

    if (!tmdbResult) {
      fetch_info.textContent = "No confident results found on TMDB. Please check the title and try again.";
      fetch_button.disabled = false;
      return;
    }

    // Fetch the IDs and populate the form
    await fetch_ids(tmdbResult, type, candidates[0] || title);
  }

    ///////////////////////
    /* Template Handling */
    ///////////////////////
  async function saveFormInputs (e) {
    e.preventDefault();
    const parentContainer = document.querySelector('.panel__body')
    const inputs = parentContainer.querySelectorAll("input, select, textarea");
    const formData = {};
    inputs.forEach(input => {

        // Determine key with prefix to avoid collisions
        let key = null;
        let prefix = null;

        if (input.id) {
            key = input.id;
            prefix = 'id';
        } else if (input.name) {
            key = input.name;
            prefix = 'name';
        } else if (input.className) {
            key = input.className;
            prefix = 'class';
        }

        if (key && prefix) {
            if (key.includes("_token")) return; // skip csrf tokens

            const prefixedKey = `${prefix}-${key}`;

            if (input.type === "checkbox" || input.type === "radio") {
                formData[prefixedKey] = input.checked;
            } else {
                formData[prefixedKey] = input.value;
            }
        }
    });
    await GM.setValue("formTemplate", JSON.stringify(formData))
  }

  async function loadFormInputs(e) {
    e.preventDefault();
    const savedData = await GM.getValue('formTemplate');

    if (!savedData) return;

    const formData = JSON.parse(savedData);
    const parentContainer = document.querySelector('.panel__body')
    const inputs = parentContainer.querySelectorAll('input, textarea, select');

    // Helper function to set value and trigger events
    const setInputValue = (input, value) => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = value;
        } else {
            input.value = value;
        }

        // Trigger multiple event types to ensure handlers fire
        ['input', 'change', 'blur'].forEach(eventType => {
            input.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
    };

    // Helper function to find and apply value
    const tryApplyValue = (input) => {
        let matchedKey = null;
        let matchedValue = null;

        // Check for id match first (highest priority)
        if (input.id) {
            const idKey = `id-${input.id}`;
            if (formData.hasOwnProperty(idKey)) {
                matchedKey = idKey;
                matchedValue = formData[idKey];
            }
        }

        // Then check for name match
        if (!matchedKey && input.name) {
            const nameKey = `name-${input.name}`;
            if (formData.hasOwnProperty(nameKey)) {
                matchedKey = nameKey;
                matchedValue = formData[nameKey];
            }
        }

        // Finally check for class match
        if (!matchedKey && input.className) {
            const classKey = `class-${input.className}`;
            if (formData.hasOwnProperty(classKey)) {
                matchedKey = classKey;
                matchedValue = formData[classKey];
            }
        }

        // Apply the matched value
        if (matchedKey !== null) {
            setInputValue(input, matchedValue);
            return true;
        }
        return false;
    };

    // Step 1: Load category first (controls conditional visibility)
    const categoryElement = document.getElementById("category_id") || document.getElementById("autocat");
    if (categoryElement) {
        tryApplyValue(categoryElement);
        // Wait for DOM updates after category change
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Step 2: Load all other inputs after conditional fields are visible
    inputs.forEach(input => {
        // Skip if already loaded (category)
        if (input === categoryElement) return;
        tryApplyValue(input);
    });
    }


})();
