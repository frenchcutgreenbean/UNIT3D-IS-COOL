// ==UserScript==
// @name         Extra-Resolution-Buttons
// @version      0.1
// @description  Adds group based resolution buttons to searches for torrents and requests.
// @namespace    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/
// @author       dantayy
// @match        *://*/requests*
// @match        *://*/torrents*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/extra-resolution-buttons.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/extra-resolution-buttons.user.js
// ==/UserScript==

/*jshint esversion: 6 */
(function () {
  "use strict";
  /*
    If you want to add support for other UNIT3D trackers you need to find their corresponding resolutions. you can run the following code
    in your console on the torrents or requests page.
    ---------------------------------------------------------------
    function getResolutionFormGroup() {
        let legends = document.querySelectorAll('.form__legend');
        for (let element of legends) {
            if (element.innerText.trim() === "Resolution") {
                return element.closest('.form__group');
            }
    }
    return null;
    }
    const resGroup = getResolutionFormGroup()
    const checkboxes = resGroup.querySelectorAll(".form__group")
    let resolutionKeys = {}
    checkboxes.forEach(checkbox => {
        const label = checkbox.querySelector(".form__label")
        const input = checkbox.querySelector(".form__checkbox")
        resolutionKeys[input.value] = label.innerText.trim()
    })

    console.log(resolutionKeys)
    ---------------------------------------------------------------
    */

  const current_url = window.location.href;

  const isAither = current_url.includes("aither");
  const isBlu = current_url.includes("blutopia");
  const isRequests = current_url.includes("requests"); // Necessary for styling purposes

  // RESOLUTION KEYS
  // Blu { 1: '2160p', 2: '1080p', 3: '1080i', 5: '720p', 6: '576p', 7: '576i', 8: '480p', 9: '480i', 10: 'Other', 11: '4320p' }
  // Aither { 1: '4320p', 2: '2160p', 3: '1080p', 4: '1080i', 5: '720p', 6: '576p', 7: '576i', 8: '480p', 9: '480i', 10: 'Other/Mixed' }
  const resolutionKeys = {
    blu: {
      hdp: [5, 3, 2, 1, 11],
      ahd: [5, 3, 2],
      asd: [9, 8, 7, 6],
      uhd: [1, 11],
    },
    aither: {
      hdp: [4, 3, 2, 1],
      ahd: [4, 3, 2],
      asd: [9, 8, 7, 6],
      uhd: [1, 2],
    },
  };

  const currentSite = isAither ? "aither" : isBlu ? "blu" : false;

  const resKey = resolutionKeys[currentSite];

  // Get the resolution form group.
  function getResolutionFormGroup() {
    let legends = document.querySelectorAll(".form__legend");
    for (let element of legends) {
      if (element.innerText.trim() === "Resolution") {
        return element.closest(".form__group");
      }
    }
    return null;
  }

  // Add new resolution checkboxes
  function addCheckbox(id, label, storageKey, resolutionKey) {
    let resolutionFormGroup = getResolutionFormGroup();
    if (!resolutionFormGroup) return;
    let container = document.querySelector(".panelV2 form");
    if (!container) return;

    // Create the parent element for the new checkboxes if it doesn't already exist.
    let flexContainer = container.querySelector(".custom-checkbox-container");
    if (!flexContainer) {
      flexContainer = document.createElement("div");
      flexContainer.className = "custom-checkbox-container";
      flexContainer.style.display = "flex";
      flexContainer.style.flexDirection = isRequests ? "column" : "row";
      flexContainer.style.width = isRequests ? "200px" : "500px";
      flexContainer.style.justifyContent = "center";
      flexContainer.style.alignItems = "center";
      flexContainer.style.margin = isRequests ? "0" : "0 auto";
      container.appendChild(flexContainer);
    }
    // Don't add a checkbox if it already exists.
    if (flexContainer.querySelector(`#${id}`)) return;

    const checkboxContainer = document.createElement("p");
    checkboxContainer.classList.add("form__group");

    checkboxContainer.innerHTML = `
            <label class="form__label">
                <input
                    class="form__checkbox"
                    type="checkbox"
                    id="${id}"
                />
                ${label}
            </label>
        `;

    flexContainer.appendChild(checkboxContainer);
    const checkboxElement = document.getElementById(id);
    const isChecked = localStorage.getItem(storageKey) === "true";
    checkboxElement.checked = isChecked;

    toggleResolutions({ target: checkboxElement }, resolutionKey);

    checkboxElement.addEventListener("change", (event) =>
      toggleResolutions(event, resolutionKey, storageKey)
    );
  }

  // Toggle the resolution checkboxes based on the stored state to prevent looping.
  let prevCheckboxState = {};

  function toggleResolutions(event, resolutionKey, storageKey) {
    const isChecked = event.target.checked;
    const checkboxId = event.target.id;

    if (prevCheckboxState[checkboxId] !== isChecked) {
      prevCheckboxState[checkboxId] = isChecked;
      const values = resKey[resolutionKey];
      let container = getResolutionFormGroup().querySelector(
        ".form__fieldset-checkbox-container"
      );
      const checkboxes = container.querySelectorAll(".form__checkbox");

      checkboxes.forEach((checkbox) => {
        if (values.includes(parseInt(checkbox.value))) {
          if (checkbox.checked !== isChecked) {
            checkbox.checked = isChecked;
            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      });

      localStorage.setItem(storageKey, isChecked);
    }
  }

  function observeDOM() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const callback = function (mutationsList) {
      for (let mutation of mutationsList) {
        if (mutation.type === "childList") {
          addCheckbox("anySDCheckbox", "Any SD", "anySDCheckboxChecked", "asd");
          addCheckbox("anyHDCheckbox", "Any HD", "anyHDCheckboxChecked", "ahd");
          addCheckbox("HDPCheckbox", "HD+", "HDPCheckboxChecked", "hdp");
          addCheckbox("anyUHDCheckbox", "UHD", "anyUHDCheckboxChecked", "uhd");
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
  }
  addCheckbox("anySDCheckbox", "Any SD", "anySDCheckboxChecked", "asd");
  addCheckbox("anyHDCheckbox", "Any HD", "anyHDCheckboxChecked", "ahd");
  addCheckbox("HDPCheckbox", "HD+", "HDPCheckboxChecked", "hdp");
  addCheckbox("anyUHDCheckbox", "UHD", "anyUHDCheckboxChecked", "uhd");

  observeDOM();
})();
