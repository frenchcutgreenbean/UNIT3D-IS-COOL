// ==UserScript==
// @name         Autofill-Request-ids
// @version      0.2
// @description  Ability to fetch meta ids on the request page.
// @match        *://*/requests/create*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/autofill-request-ids.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/autofill-request-ids.user.js
// @grant        GM.xmlHttpRequest
// @grant        GM.addStyle
// ==/UserScript==

/*jshint esversion: 6 */
(function () {
  "use strict";
  const tmdb_key = ""; // add your own key
  if (!tmdb_key) {
    console.log("add a tmdb key to your script");
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
    let tmdb_id, imdb_id, tvdb_id, isAnime, mal_id;
    try {
      const response1 = await GM_xmlHttpRequest_promise({
        method: "GET",
        url: url,
      });
      const data1 = JSON.parse(response1.responseText);
      if (data1.results.length > 0) {
        tmdb_id = data1.results[0].id;
        let genres = data1.results[0].genre_ids;
        isAnime = genres.includes(16) ? true : false;
      }

      if (tmdb_id) {
        const external_url = `http://api.themoviedb.org/3/${type}/${tmdb_id}/external_ids?api_key=${tmdb_key}`;
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

      if (isAnime && tmdb_id) {
        const response3 = await GM_xmlHttpRequest_promise({
          method: "GET",
          url: `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(
            title
          )}&limit=1`,
        });
        const data3 = JSON.parse(response3.responseText);
        if (data3.data[0]) {
          const mal_data = data3.data[0];
          let titles = mal_data.titles;
          let possible_titles = "";

          for (const x of titles) {
            possible_titles += " " + x.title;
          }
          const isMatch = possible_titles
            .toLowerCase()
            .includes(title.toLowerCase());
          mal_id = isMatch ? mal_data.mal_id : 0;
        }
      }
      // Set the ids
      document.getElementById("autotmdb").value = tmdb_id ? tmdb_id : 0;
      document.getElementById("autoimdb").value = imdb_id ? imdb_id : 0;
      document.getElementById("autotvdb").value = tvdb_id ? tvdb_id : 0;
      document.getElementById("automal").value = mal_id ? mal_id : 0;

      // Append matched links to the sidebar for easy verification.
      const sidebar = document.querySelector("aside .panelV2");
      let match_links = document.createElement("div");
      match_links.setAttribute("id", "link-container");
      let links_html = `
                <a target="_blank" rel="noopener noreferrer" href="https://www.themoviedb.org/${type}/${tmdb_id}">TMDB</a>
                <a target="_blank" rel="noopener noreferrer" href="https://www.imdb.com/title/tt${imdb_id}">IMDB</a>
                <a target="_blank" rel="noopener noreferrer" href="https://thetvdb.com/?tab=series&id=${tvdb_id}">TVDB</a>
                <a target="_blank" rel="noopener noreferrer" href="https://myanimelist.net/anime/${mal_id}">MAL</a>
                `;
      const linkStyler = `
                #link-container {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    width: 80%;
                    margin: 0 auto;
                }
                `;
      GM.addStyle(linkStyler);
      match_links.innerHTML = links_html;
      sidebar.append(match_links);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  }
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
    }`;
  GM.addStyle(fetchStyler);
  const form = document.querySelector(".panelV2 form");
  const fetch_container = document.createElement("div");
  fetch_container.id = "fetch-container";
  const fetch_button = document.createElement("button");
  const fetch_info = document.createElement("p");
  fetch_info.textContent =
    "Add a title (Title + Year). Select a category and then click fetch.";
  fetch_info.id = "fetch-info";
  fetch_button.textContent = "Fetch IDs";
  fetch_button.addEventListener("click", on_fetch_click);
  fetch_button.id = "fetch";
  fetch_button.className = "fetch";
  fetch_container.append(fetch_button);
  fetch_container.append(fetch_info);
  form.prepend(fetch_container);
  const year_re = /\b\d{4}\b/;
  const res_re = /\b\d*[p|i]\b/;

  function on_fetch_click(e) {
    e.preventDefault();
    let title = document.getElementById("title").value;
    if (!title) return;
    let cat = document.getElementById("category_id").value;
    let type = cat === "2" ? "tv" : "movie";
    let year = year_re.exec(title);
    let res = res_re.exec(title);
    title = year ? title.replace(year_re, "") : title;
    title = res ? title.replace(res_re, "") : title;
    title = title.trim();
    let year_url = year ? `&year="${year}"` : "";
    let url = `https://api.themoviedb.org/3/search/${type}?api_key=${tmdb_key}&language=en-US&query=${encodeURIComponent(
      title
    )}&page=1&include_adult=false${year_url}`;
    fetch_ids(type, url, tmdb_key, title);
  }
})();
