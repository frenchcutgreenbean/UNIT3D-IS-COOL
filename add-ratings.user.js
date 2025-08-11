// ==UserScript==
// @name         Add-Meta-Ratings
// @version      0.3
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
        border-radius: 50%;
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

  const imdbLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAAAAAAAAQCEeRdzAAAFXElEQVR4nO2bX0xbVRzH720L/XP/lLbQlhYGZPMvbmwSBAMif0xcfVAkJnMPGhclTOMLWbJs0ZChzidMiGRhqIk8mcwHmdvD+BcYMigK/o1Z9uSDycaIC7CxwZgjX+/vNgUutKVF6Jl4m3zTe/78zv2dT88595wfXE6wpHCNh9L2zFx0dc6NZN6+M+zFdtZcMHNmdsjzZaBMyOboQ53H5bwJpfPMnUuW7o76cWvI81ugVPBxU4Oes/+nzoe1MOrDzUuez7n5oHfbD/tomh/xznCsnWAtHQBrB1hLB8DaAdbSAbB2gLV0AKwdYC0dAGsHWEsHwNoB1tIBsHaAtXQArB1grXUB3B1dq1hlpLmRUDl9R6uzXhtLCsbhU4Q6mwLg9iUPrnV7cLXLvSRKU36kMlVK3s3vPKA448xghPJ42lihG/0e3B/zYj6YGdWnyT7P5gOYH/VjskeE3ytBsnFIkwzqN6Vv9NlVrSwj2UUeopVDxwkJuPwY2o5LsJk5NT9cZ702lqTY2EUOO7MMOFEvUxQXC99nYbJb6xO1v79UwuyQGxsJ7kYFQKHj68rNrDYRHMctidJ/9cqqVpeFdfyQCFzJx5HXIpfH08ZqNdWLWPwxVwWw2ubpAjEEIOjbXAB0M1HU3ozSYedXl4V1MCDh/ngODjwvRSyP1YbJyCPFtNYmxy9i5qIrok3ZvgcMQEmBjOkBJ0r3yQkDeK5EQv/pNOT6rZp8IYYNAbgz7AZ+9gO/+ICfMrEwyhCA1y3jz3Mp2OG3JwygpkrC4rgPgTI5bpuKIhkT3enoaHLg/TdtaD0q44/zbvw9tv6I2BIANpuArhYOspz4CHipUlLvXVMpxW3zcI4ZRflmTV6e34RghwP3fshODgCj0aiuzHSdmpqKY68TCJuadtmVuW0yJQagKn4A0VRdLKh9ifV02DQAVqsVe3aFrnmeR3F+CASlCx9dhrEVIyAvy4r290Q8vlO7btjtovoop/a2HAB1sKY81HlK00pO16Taiq0FUFGk7Dt+zUJdrXbK0cJJj/KkADCbzWh4lYPFYtHUV/MPavM3G8AzT4rqJunwK2ttJpMFICUlBa1HaNhpV35JktHSsDwdthJAPUsAtAieOWlE3g6Xpr4v04kzH/Fbugg+EAAMBgM6m62oKtECKNnrwrfNFhVQIgBerPiPTQECcKHVgbdqtQAO7HfhwqeyWh5PZ16ulrGonP6qi+PfCJUX0tabAKy1SRoAWu37Trtx8l0tgKNvONHfnh43gKpiEWc/kZHh1C6msbbCT+1WOtrrXrNuCAI9BYTkAehtS8dXH2sBnDrmxMBnGXEDMBp4pe7aTU1ulnIYGox8GOJ5A7I99Og1aPLpADXV78B8jEPSJh6HeXQpUyDY4QTHLy9451uc6GtzqeXrtxFdTYeXj8Om1FU/iroDNUa0uTe2wa1wIgERWeDgkI3oOZWG6z0u+D0CBAunDGMzfv9aGQHtDrWc6iUaENmVbUDT23bluBsKiJDNC+V2PFtoQmVRKkoLODQ3pKHjgwzsfcSo2HF4KJvHh++EbGL9+jEBkBIKiS2FwryY6PGsqOtV86+uqPtvQmKkWaXN2aGwQvdcHM/E9KA3qs2GAISmQvwBzXAwdHXdSMHRWO2vF/CcH6HOLSt8X7pONEiqh8VZO8BaOgDWDrCWDoC1A6ylA2DtAGvpAFg7wFo6ANYOsJYOgLUDrKUDYO0Aa+kA6OVB1k6wEr00yt0adn9Br5GydibZov8ZmBrwdnKBMsFHLxLH+uPBdhN1HldyrzXWWZ/g6BMoFbLolXKlYNtPB6WPs9MDrm8a6yy7BZuR+wdSiFjJXMpWtgAAAABJRU5ErkJggg=='
  const letterboxdLogo = 'data:image/png;base64,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'


  getIMDBID();
})();
