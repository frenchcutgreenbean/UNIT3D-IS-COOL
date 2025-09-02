// ==UserScript==
// @name         Autofill-Request-ids
// @version      0.4
// @description  Ability to fetch meta ids on the request page.
// @match        *://*/torrents/create*
// @match        *://*/upload/create*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/autofill-request-ids.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/autofill-request-ids.user.js
// @grant        GM.xmlHttpRequest
// @grant        GM.addStyle
// ==/UserScript==


// Thanks to Droky for major improvements!

/*jshint esversion: 6 */
(function () {
  "use strict";

  const tmdb_key = "YOUR_TMDB_API_KEY"; // Add your TMDB API key here

  if (!tmdb_key) {
    console.log("Add a TMDB key to your script");
    return;
  }

  function GM_xmlHttpRequest_promise(details) {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        ...details,
        onload: resolve,
        onerror: reject,
      });
    });
  }

  async function fetch_ids(type, url, tmdb_key, title) {
    let tmdb_id = null, imdb_id = null, tvdb_id = null, mal_id = null;
    let keywords = [];
    try {
      const response1 = await GM_xmlHttpRequest_promise({
        method: "GET",
        url: url,
      });
      const data1 = JSON.parse(response1.responseText);
      if (data1.results && data1.results.length > 0) {
        const result = data1.results[0];
        tmdb_id = result.id;
        let genres = result.genre_ids.map(genreId => getGenreName(genreId));
        keywords = genres;
        const isAnime = genres.includes("Animation");

        // Fetch external IDs (IMDb, TVDB)
        if (tmdb_id) {
          const external_url = `https://api.themoviedb.org/3/${type}/${tmdb_id}/external_ids?api_key=${tmdb_key}`;
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
        alert("No results found on TMDB. Please check the title and try again.");
      }

      // All possible ids for the tmdb id input elements
      const tmdbSelectors = ["tmdb_tv_id", "auto_tmdb_movie", "auto_tmdb_tv", "tmdb_movie_id"];
      let tmdbElement = null;
      for (const s of tmdbSelectors) {
        const element = document.getElementById(s);
        if (element) {
          // Safely set the IDs in the form fields if they exist
          tmdbElement = element;
          if (tmdbElement) tmdbElement.value = tmdb_id || 0;
        }
      }

      const imdbElement = document.getElementById("autoimdb");
      if (imdbElement) imdbElement.value = imdb_id || 0;

      const tvdbElement = document.getElementById("autotvdb");
      if (tvdbElement) tvdbElement.value = tvdb_id || 0;

      const malElement = document.getElementById("automal");
      if (malElement) malElement.value = mal_id || 0;

      // Safely set the keywords field if it exists
      const keywordsElement = document.getElementById("autokeywords");
      if (keywordsElement) keywordsElement.value = keywords.join(', ');

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
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            width: 100%;
        }
        #fetch-info {
            margin-left: 10px;
            color: #f39c12;
        }
        #fetch.fetch {
            padding: 8px 12px;
            font-size: 13px;
            display: inline-flex;
            font-weight: 600;
            color: hsl(0, 0%, 100%);
            border-radius: 9999px;
            background-color: hsl(120, 20%, 40%);
            border: none;
            text-decoration: none;
            cursor: pointer;
        }
        .external-links-container {
            margin-top: 15px;
            padding: 10px;
            border-top: 1px solid #ccc;
        }
        .external-links-container a {
            color: #3498db;
            text-decoration: none;
        }
        .external-links-container a:hover {
            text-decoration: underline;
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
  fetch_info.textContent = "Add a title (Title + Year). Select a category and then click fetch.";
  fetch_info.id = "fetch-info";
  fetch_button.textContent = "Fetch IDs";
  fetch_button.addEventListener("click", on_fetch_click);
  fetch_button.id = "fetch";
  fetch_button.className = "fetch";
  fetch_container.append(fetch_button);
  fetch_container.append(fetch_info);
  form.prepend(fetch_container);

  const year_re = /\b\d{4}\b/;

  function on_fetch_click(e) {
    e.preventDefault();

    const titleElement = document.getElementById("title");
    if (!titleElement) {
      alert('Title element not found.');
      return;
    }

    let title = titleElement.value;
    if (!title) {
      alert('Please enter a title.');
      return;
    }

    // Dynamically target the category element based on the page structure
    const categoryElement = document.getElementById("autocat") || document.getElementById("category_id");
    if (!categoryElement) {
      alert('Category element not found.');
      return;
    }

    let cat = categoryElement.value;
    let type = cat === "2" ? "tv" : "movie";

    // Extract year if present
    let year = title.match(year_re);
    year = year ? year.at(-1) : "";

    title = year ? title.split(year)[0].trim() : title.trim();

    // Construct the URL for the TMDB API search
    let year_url = year ? `&year=${year}` : "";
    let url = `https://api.themoviedb.org/3/search/${type}?api_key=${tmdb_key}&language=en-US&query=${encodeURIComponent(title)}&page=1&include_adult=false${year_url}`;

    // Fetch the IDs and populate the form
    fetch_ids(type, url, tmdb_key, title);
  }
})();
