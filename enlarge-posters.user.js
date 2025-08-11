// ==UserScript==
// @name         Enlarge-Posters
// @version      0.4
// @description  Enlarge TMDB posters on hover.
// @namespace    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/
// @author       dantayy
// @match        *://*/torrents*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/enlarge-posters.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/enlarge-posters.user.js
// @grant        GM.addStyle
// ==/UserScript==

/*jshint esversion: 6 */
(function () {
  "use strict";
  const current_url = window.location.href;
  const isList = current_url.includes("torrents?");
  if (isList) {
    let enlargedPoster = document.createElement("div");
    enlargedPoster.id = "enlargedPoster";
    enlargedPoster.className = "enlarged-poster";
    enlargedPoster.style.display = "none";
    document.body.appendChild(enlargedPoster);

    function addListener() {
      let listView = document.querySelectorAll(
        ".torrent-search--list__poster-img"
      );
      let posterView = document.querySelectorAll(
        ".torrent-search--poster__poster"
      );
      let cardView = document.querySelectorAll(".torrent-card__image");
      let groupView = document.querySelectorAll(
        ".torrent-search--grouped__poster"
      );

      let allViews = [...listView, ...posterView, ...cardView, ...groupView];

      if (allViews.length === 0) {
        setTimeout(addListener, 100);
        return;
      }

      allViews.forEach((p) => {
        p.addEventListener("mousemove", function (event) {
          let imgElement = this;
          if (this.tagName.toLowerCase() === "a") {
            imgElement = this.querySelector("img");
          }
          if (imgElement) {
            showEnlargedPoster(event, imgElement, imgElement.src);
          }
        });
        p.addEventListener("mouseleave", function () {
          enlargedPoster.style.display = "none";
        });
      });
    }

    addListener();

    function showEnlargedPoster(event, element, src) {
      const enlargedPoster = document.getElementById("enlargedPoster");

      // Extract the start size from the src using regex
      const startSizeMatch = src.match(/\/(w\d+)\//);
      if (startSizeMatch) {
        const startSize = startSizeMatch[1];
        src = src.replace(startSize, "w500");
      }

      enlargedPoster.style.backgroundImage = `url('${src}')`;

      const x = event.clientX;
      const y = event.clientY;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const viewportX = x + scrollX;
      const viewportY = y + scrollY;
      let offsetX = 10;
      let offsetY = -460;
      const winWidth = window.innerWidth;

      let ySpace = viewportY - scrollY;
      let xSpace = winWidth - viewportX;

      // Place the poster so it fits in the viewport.
      if (ySpace <= 450 && ySpace >= 200) {
        offsetY = -200;
      } else if (ySpace <= 200) {
        offsetY = 10;
      }

      if (xSpace <= 400 && xSpace >= 200) {
        offsetX = -150;
      } else if (xSpace <= 200) {
        offsetX = -310;
      }
      enlargedPoster.style.left = viewportX + offsetX + "px";
      enlargedPoster.style.top = viewportY + offsetY + "px";
      enlargedPoster.style.display = "block";
    }

    const posterStyler = `
    .enlarged-poster {
        position: absolute;
        width: 300px;
        height: 450px;
        background-size: cover;
        background-repeat: no-repeat;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        z-index: 9999;
    }
    `;

    GM.addStyle(posterStyler);
  }
})();
