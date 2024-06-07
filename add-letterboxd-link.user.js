// ==UserScript==
// @name         Add-Letterboxd-Link
// @version      0.1
// @description  Add Letterboxd Link to the meta link box.
// @match        *://*/torrents/*
// @match        *://*/requests/*
// @match        *://*/torrents/similar/*
// @namespace    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/
// @author       dantayy
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/add-letterboxd-link.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/add-letterboxd-link.user.js
// @grant        GM.xmlHttpRequest
// @grant        GM.addStyle
// ==/UserScript==

(function () {
  "use strict";

  const logo = "https://i.ibb.co/ygXMwn5/letterboxd-mac-icon.png";

  function getIMDBID() {
    let a = document.querySelector('[href*="://www.imdb.com/title/tt"]');
    let id = a.href.match(/tt\d+/)[0];
    let metaDiv = document.querySelector(".meta__ids");
    if (id) {
      fetchLetterboxd(id, metaDiv);
    }
  }

  function injectLetterboxd(div, id, url) {
    const button = document.createElement("img");
    button.id = id;
    button.className = "letterboxd-button";
    button.src = logo;
    const singleStyler = ` 
    img.letterboxd-button {
        width: 23px;
        position: relative;
        top: 2px;
    }
    `;
    const meta__letterboxd = document.createElement("li");
    meta__letterboxd.className = "meta__letterboxd";
    const meta_id_tag = document.createElement("a");
    meta_id_tag.className = "meta-id-tag";
    meta_id_tag.href = url;
    meta_id_tag.target = "_blank";
    meta_id_tag.append(button);
    meta__letterboxd.append(meta_id_tag);
    div.append(meta__letterboxd);
    GM.addStyle(singleStyler);
  }

  function fetchLetterboxd(id, div) {
    const letterboxdURL = "https://letterboxd.com/imdb/";
    const url = `${letterboxdURL}${id}`;
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: "GET",
        url: url,
        onload: function (response) {
          if (response.status === 200) {
            if (response.finalUrl.includes("imdb")) return; // not found on letterboxd
            injectLetterboxd(div, id, response.finalUrl);
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

  const catSelector = document.querySelector(
    '[href*="/torrents?categories%5B0%5D="]'
  );
  let category = false;
  if (catSelector) {
    category = catSelector.href.match(/=(\d+)/)[1];
  }
  const isTv = document.querySelector(
    '[href*="://www.thetvdb.com/?tab=series&id="]'
  );

  /* Use the category selector for torrents page and tvdb for others.
     So we don't fetch letterboxd for non movies.
     Unfortunately, this won't work for mini-series. */

  if (category === "1" || !isTv) {
    getIMDBID();
  }
})();
