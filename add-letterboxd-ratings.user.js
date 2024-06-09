// ==UserScript==
// @name         Add-Letterboxd-Ratings
// @version      0.1
// @description  Add Letterboxd Ratings to the torrent page.
// @match        *://*/torrents/*
// @match        *://*/requests/*
// @match        *://*/torrents/similar/*
// @namespace    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/
// @author       dantayy
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/add-letterboxd-ratings.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/add-letterboxd-ratings.user.js
// @grant        GM.xmlHttpRequest
// @grant        GM.addStyle
// ==/UserScript==

(function () {
  "use strict";

  function getIMDBID() {
    let a = document.querySelector('[href*="://www.imdb.com/title/tt"]');
    if (!a) return;
    let id = a.href.match(/tt\d+/)[0];
    if (id) {
      fetchLetterboxd(id);
    }
  }

  function getElementByInnerText(tag, text) {
    return Array.from(document.querySelectorAll(tag)).find(
      (el) => el.innerText.trim() === text
    );
  }

  function injectLetterboxd(url, lbRating, lbCount) {
    if (!lbCount || !lbRating) return;
    const ratingHeader = getElementByInnerText("h2", "Rating");
    if (!ratingHeader) return;

    const ratingFloat = parseFloat(lbRating);

    // Dynamic shadow color based on ratings.
    const shadowColor =
      ratingFloat < 2.5
        ? "rgba(212, 36, 36, 0.8)"
        : ratingFloat < 3.5
        ? "rgba(212, 195, 36, 0.8)"
        : ratingFloat < 4.5
        ? "rgba(0,224,84, 0.8)"
        : "rgba(113, 251, 255, 0.8)";

    const lbLogo = "https://i.ibb.co/ygXMwn5/letterboxd-mac-icon.png";
    const lbIcon = document.createElement("img");
    lbIcon.className = "letterboxd-chip__icon";
    lbIcon.src = lbLogo;
    
    const iconStyle = `
    .letterboxd-chip__icon{
        grid-area: image;
        text-align: center;
        line-height: 40px;
        font-size: 14px;
        color: var(--meta-chip-icon-fg);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        filter: drop-shadow(0 0 0.4rem ${shadowColor});
    }`;

    const articleElement = ratingHeader.closest("section");
    const ratingName = document.createElement("h2");
    const ratingValue = document.createElement("h3");
    const meta_id_tag = document.createElement("a");
    meta_id_tag.className = "meta-chip";
    ratingName.className = "meta-chip__name";
    ratingValue.className = "meta-chip__value";
    meta_id_tag.href = url;
    meta_id_tag.target = "_blank";
    meta_id_tag.append(lbIcon);
    ratingName.innerText = "Letterboxd";
    ratingValue.innerText = `${lbRating} / ${lbCount} Votes`;
    meta_id_tag.append(ratingName);
    meta_id_tag.append(ratingValue);
    articleElement.prepend(meta_id_tag);
    GM.addStyle(iconStyle);
  }

  function fetchLetterboxd(id) {
    const letterboxdURL = "https://letterboxd.com/imdb/";
    const url = `${letterboxdURL}${id}`;
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: "GET",
        url: url,
        onload: function (response) {
          if (response.status === 200) {
            const responseText = response.responseText;
            // Get the relevant info from the response
            const scriptMatch = responseText.match(
              /<script type="application\/ld\+json">\n\/\* <!\[CDATA\[ \*\/\n([\s\S]*?)\/\* ]]> \*\/\n<\/script>/
            );
            if (scriptMatch && scriptMatch[1]) {
              const jsonData = JSON.parse(scriptMatch[1]);
              const aggregateRating = jsonData.aggregateRating;
              if (aggregateRating) {
                const ratingValue = aggregateRating.ratingValue;
                const ratingCount = aggregateRating.ratingCount;
                injectLetterboxd(response.finalUrl, ratingValue, ratingCount);
              }
            } else {
              console.log("Letterboxd data not found.");
            }
          } else {
            console.log(
              "Failed to fetch the webpage. Status:",
              response.status
            );
            reject(`Failed to fetch the webpage. Status: ${response.status}`);
          }
        },
        onerror: function (error) {
          console.error("Error fetching the webpage:", error);
          reject(error);
        },
      });
    });
  }

  getIMDBID();
})();
