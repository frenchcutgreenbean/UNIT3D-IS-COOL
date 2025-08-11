// ==UserScript==
// @name         Add-Meta-Ratings
// @version      0.4
// @description  Add Ratings from various meta providers to the torrent page.
// @match        *://*/torrents/*
// @match        *://*/requests/*
// @match        *://*/torrents/similar/*
// @namespace    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/
// @author       dantayy
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/add-ratings.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/add-ratings.user.js
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function () {
  "use strict";

  function addStyle(css) {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function getIMDBID() {
    let a = document.querySelector('[href*="://www.imdb.com/title/tt"]');
    if (!a) return;
    let id = a.href.match(/tt\d+/)[0];
    if (id) {
      handleIMDB(id)
      handleLetterboxd(id);
    }
  }

  function getElementByInnerText(tag, text) {
    return Array.from(document.querySelectorAll(tag)).find(
      (el) => el.innerText.trim().toLowerCase() === text
    );
  }


  function buildElement(siteName, url, logo, rating, count) {
    if (!rating) return;
    const extraHeader = getElementByInnerText("h2", "extra information");
    if (!extraHeader) return;
    let ratingFloat = parseFloat(rating);

    let shadowColor;

    if (siteName === "IMDb") {
      // Breakpoints for IMDb, which has a higher average and more generous ratings.
      // A 7.0 is considered "good," not great. A 6.0 is often seen as "bad."
      if (ratingFloat < 6.0) {
        shadowColor = "rgba(212, 36, 36, 0.8)"; // Red for low ratings (< 6.0)
      } else if (ratingFloat < 7.5) {
        shadowColor = "rgba(212, 195, 36, 0.8)"; // Yellow for decent but not great ratings (6.0 - 7.4)
      } else if (ratingFloat < 8.1) {
        shadowColor = "rgba(0,224,84, 0.8)"; // Green for very good ratings (7.5 - 8.1)
      } else {
        shadowColor = "rgba(113, 251, 255, 0.8)"; // Light blue for exceptional ratings (8.2+)
      }
    } else {
      // Assumes Letterboxd or a similar 5-point scale
      // Breakpoints for Letterboxd, which has a lower average and more critical ratings.
      // A 3.0 is a typical average, while a 2.5 is often considered "bad."
      if (ratingFloat < 2.5) {
        shadowColor = "rgba(212, 36, 36, 0.8)"; // Red for bad ratings (< 2.5)
      } else if (ratingFloat < 3.5) {
        shadowColor = "rgba(212, 195, 36, 0.8)"; // Yellow for average ratings (2.5 - 3.4)
      } else if (ratingFloat < 4.3) {
        shadowColor = "rgba(0,224,84, 0.8)"; // Green for great ratings (3.5 - 4.3)
      } else {
        shadowColor = "rgba(113, 251, 255, 0.8)"; // Light blue for exceptional ratings (4.3+)
      }
    }

    const img = document.createElement("img");
    const logoLink = logo || "https://www.google.com/s2/favicons?sz=64&domain=" + siteName.toLowerCase() + ".com";
    img.className = `${siteName.toLowerCase()}-chip__icon`;
    img.src = logoLink;

    const iconStyle = `
    .${siteName.toLowerCase()}-chip__icon{
        grid-area: image;
        text-align: center;
        line-height: 40px;
        font-size: 14px;
        color: var(--meta-chip-icon-fg);
        width: 40px;
        height: 40px;
        border-radius: 5%;
        filter: drop-shadow(0 0 0.4rem ${shadowColor});
    }`;
    const articleElement = extraHeader.closest("section");
    const ratingName = document.createElement("h2");
    const ratingValue = document.createElement("h3");
    const meta_id_tag = document.createElement("a");
    meta_id_tag.className = "meta-chip";
    ratingName.className = "meta-chip__name";
    ratingValue.className = "meta-chip__value";
    meta_id_tag.href = url;
    meta_id_tag.target = "_blank";
    meta_id_tag.append(img);
    ratingName.innerText = siteName;
    ratingValue.innerText = `${rating} / ${count} Votes`;
    meta_id_tag.append(ratingName);
    meta_id_tag.append(ratingValue);
    articleElement.prepend(meta_id_tag);
    addStyle(iconStyle);
    console.log(`Added ${siteName} rating: ${rating} / ${count} Votes`);
  }

  function handleLetterboxd(id) {
    const letterboxdURL = "https://letterboxd.com/imdb/";
    const siteName = "Letterboxd";
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
                console.log("Letterboxd data found.");
                const ratingValue = aggregateRating.ratingValue;
                const ratingCount = aggregateRating.ratingCount;
                buildElement(siteName, response.finalUrl, letterboxdLogo, ratingValue, ratingCount);
              }
            } else {
              console.log("Letterboxd data not found.");
              return;
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

  function handleIMDB(id) {
    const apiUrl = `https://api.imdbapi.dev/titles/${id}`;
    const siteName = "IMDb";
    const imdbURL = `https://www.imdb.com/title/${id}`;
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: "GET",
        url: apiUrl,
        onload: function (response) {
          if (response.status === 200) {
            const responseText = response.responseText;
            const jsonData = JSON.parse(responseText);
            if (jsonData && jsonData.rating) {
              const ratingValue = jsonData.rating.aggregateRating;
              const ratingCount = jsonData.rating.voteCount || "N/A";
              buildElement(siteName, imdbURL, imdbLogo, ratingValue, ratingCount);
            } else {
              console.log("IMDb data not found.");
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

  const imdbLogo =
    `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAw1BMVE
X1xRj1xRgAAAD1xRj1xRj1xRj1xRj0xRn2xRn1xRj1xRj1xRj1xRj1xRj1xRj1xRgAAAAaFALdsR
X3xhjasBX2xhjzxBhURAgOCwELCQEFBADluBZENgYzKAUcFwPithaAZwxGOAYwJwXnuhbfsxYlHg
PpvBawjRH7yRiVeA5aSQnrvRe5lRKnhxCdfg9qVQpkUAkqIQQSDgLvwBd2XwtPPwc9MQbOphTHoB
SfgA+McA2Gaw1oVAouJQTTqRWefxA5LgUyAYrZAAAAD3RSTlPxtQDtwqM+LyzU06inQD+MpKrAAA
ABvklEQVRYw+2X6XKCMBSFo3XrSgIEISICigIudd9t+/5P1RtsCx0BHfjTznCYucm5k3yQDLkMqP
xcQkJGocd6Gb3cCzlUaaCSkEtVhPIB7pCQUwWgABSAAnABkLigCUQFKkUTXN+DaDxAEWVZFhVouI
Z0CDFMgDoKhUFBJw4giW1CSLvX4w0xdq5nkDDBU7bZOg/y+zQOIBOMMRFFaEBLdwkxTHAxUwgG6d
0bAP7QjwKYyo3dEW8G6LIeBVhjB6JxNnrfdV3pCsDZzqKAZmsVGn3zbnpvNB1AduQ3oBka54PBck
ZSMoBpWD3O8ZzFAr60GtJEgDbDzNbwSU14gv0p2BApEaBaDMNlzeMBVnfKjZwCmKo4iPEAvft6DW
AGfTM7wJvxpXqZAdrEgv56kh0w5rvkjyOAjhXdxOM1wMDk52mghTedGOGrvN6suEkFTBjG+wiAaZ
HDxBwtMDQFMFJhHQCIPc5zLTBKckFxRrJNZtuRc1FQOr5l6QdvbdiHFk0paQuIorKIKWl90IK2uE
krqpRHgYaJn1pKQRAl+ie/CwWgABSAfw+4yzkfVfMBSqhRyTP/oYbK9afsv/+lWvkTae8KqwL3wr
EAAAAASUVORK5CYII=`
  const letterboxdLogo =
    `data:image/png;base64,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
==`


  getIMDBID();
})();
