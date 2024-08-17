// ==UserScript==
// @name         Search-by-Links
// @version      0.4
// @description  SFA LESS CLICKING | Search by meta provider links.
// @namespace    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/
// @author       dantayy
// @match        *://*/torrents*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/search-by-links.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/search-by-links.user.js
// @grant        GM.xmlHttpRequest
// ==/UserScript==

/* Tested on Blu and Aither. Sites with categories different from 1 = Movie 2 = TV will probably not work properly */

// 0.4 fixed checkbox selectors.

/*jshint esversion: 6 */
(function () {
  "use strict";
  const searchForm = document.getElementById("name");
  const tmdbForm = document.getElementById("tmdbId");
  const imdbForm = document.getElementById("imdbId");
  const tvdbForm = document.getElementById("tvdbId");
  const malForm = document.getElementById("malId");

  const siteFormMap = {
    imdb: imdbForm,
    tmdb: tmdbForm,
    tvdb: tvdbForm,
    mal: malForm,
  };

  const regexMap = {
    imdb: /.*\/title\/tt(\d+)/,
    tmdb: /.*[movie|tv]\/(\d+)/,
    tvdb: /.*\/series\/(\d+)/,
    mal: /.*\/anime\/(\d+)/,
  };

  function fetchAndParseTVDB(url) {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: "GET",
        url: url,
        onload: function (response) {
          if (response.status === 200) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(
              response.responseText,
              "text/html"
            );
            // Example: Extracting the series ID from the page
            const basic_info = doc.getElementById("series_basic_info");
            const lists = basic_info.querySelectorAll("li");
            if (lists) {
              const span = lists[0].querySelector("span");
              let id = span.innerText;
              resolve(id); // Resolve the promise with the extracted ID
            } else {
              console.log("Series ID meta tag not found");
              reject("Series ID meta tag not found"); // Reject the promise with an error message
            }
          } else {
            console.log(
              "Failed to fetch the webpage. Status:",
              response.status
            );
            reject(`Failed to fetch the webpage. Status: ${response.status}`); // Reject the promise with an error message
          }
        },
        onerror: function (error) {
          console.error("Error fetching the webpage:", error);
          reject(error); // Reject the promise with the error
        },
      });
    });
  }

  async function parseInputs(site, link) {
    const match = link.match(regexMap[site]);

    if (site === "tvdb" && !match) {
      let tvdbid = await fetchAndParseTVDB(link);
      if (tvdbid) {
        return { id: tvdbid.trim(), type: "tv" };
      }
    }
    if (match) {
      if (site === "tmdb" && link.includes("tv")) {
        return { id: match[1], type: "tv" };
      } else if (site === "tmdb" && link.includes("movie")) {
        return { id: match[1], type: "movie" };
      }
      return { id: match[1], type: false };
    }
    return { id: null, type: null }; // Ensure return even if no match
  }

  async function setFields(site, title) {
    searchForm.value = "";
    const { id, type } = await parseInputs(site, title);
    const tvCheckbox = document.querySelector(
      'input[value="2"][wire\\:model\\.live="categoryIds"]'
    );
    const movieCheckbox = document.querySelector(
      'input[value="1"][wire\\:model\\.live="categoryIds"]'
    );

    if (type === "tv") {
      tvCheckbox.checked = true;
      movieCheckbox.checked = false;
      tvCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
      movieCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (type === "movie") {
      tvCheckbox.checked = false;
      movieCheckbox.checked = true;
      tvCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
      movieCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (type === false) {
      tvCheckbox.checked = false;
      movieCheckbox.checked = false;
      tvCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
      movieCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      console.log("Error: Something went wrong");
      return;
    }

    // Reset all form fields
    for (const key in siteFormMap) {
      if (key !== site) {
        siteFormMap[key].value = "";
        siteFormMap[key].dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    // Set the value for the specific site
    if (id) {
      siteFormMap[site].value = id;
      searchForm.dispatchEvent(new Event("input", { bubbles: true }));
      siteFormMap[site].dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function handleInputChange(e) {
    const title = e.target.value;
    const isIMDB = title.includes("imdb.com");
    const isTMDB = title.includes("themoviedb");
    const isTVDB = title.includes("thetvdb.com");
    const isMAL = title.includes("myanimelist.net");
    if (isIMDB || isTMDB || isTVDB || isMAL) {
      const site = isIMDB
        ? "imdb"
        : isTMDB
        ? "tmdb"
        : isTVDB
        ? "tvdb"
        : isMAL
        ? "mal"
        : false;
      setFields(site, title);
    }
  }
  if (searchForm) {
    searchForm.addEventListener("input", handleInputChange);
  }
})();
