// ==UserScript==
// @name         Add-Meta-Ratings
// @version      0.1
// @description  Add Ratings from various meta providers to the torrent page.
// @match        *://*/torrents/*
// @match        *://*/requests/*
// @match        *://*/torrents/similar/*
// @namespace    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/
// @author       dantayy
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/add-letterboxd-ratings.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/add-letterboxd-ratings.user.js
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
            handleIMDB(id);
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

        let ratingFloat = parseFloat(rating); // fixed: was const
        if (siteName === "IMDb") ratingFloat = ratingFloat / 2;

        const shadowColor =
            ratingFloat < 2.5
                ? "rgba(212, 36, 36, 0.8)"
                : ratingFloat < 3.5
                    ? "rgba(212, 195, 36, 0.8)"
                    : ratingFloat < 4.5
                        ? "rgba(0,224,84, 0.8)"
                        : "rgba(113, 251, 255, 0.8)";

        const img = document.createElement("img");
        img.className = `${siteName.toLowerCase()}-chip__icon`;
        img.src = logo;

        const iconStyle = `
        .${siteName.toLowerCase()}-chip__icon {
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
        const logoURL = "https://i.ibb.co/ygXMwn5/letterboxd-mac-icon.png";
        const url = `${letterboxdURL}${id}`;
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: "GET",
                url: url,
                onload: function (response) {
                    if (response.status === 200) {
                        const responseText = response.responseText;
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
                                buildElement(siteName, response.finalUrl, logoURL, ratingValue, ratingCount);
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
        const logoURL = "https://ptpimg.me/y060ct.png";
        const imdbURL = `https://www.imdb.com/title/${id}`;
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: "GET",
                url: apiUrl,
                onload: function (response) {
                    if (response.status === 200) {
                        const jsonData = JSON.parse(response.responseText);
                        if (jsonData && jsonData.rating) {
                            const ratingValue = jsonData.rating.aggregateRating;
                            const ratingCount = jsonData.rating.voteCount || "N/A";
                            buildElement(siteName, imdbURL, logoURL, ratingValue, ratingCount);
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

    getIMDBID();
})();
