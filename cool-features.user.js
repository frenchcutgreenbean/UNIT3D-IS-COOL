// ==UserScript==
// @name         Cool-UNIT3D-Features
// @version      0.1
// @description  Adds quality of life features to UNIT3D trackers
// @match        https://blutopia.cc/*
// @match        https://aither.cc/*
// @namespace    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/
// @author       dantayy
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=unit3d.dev
// @updateURL    https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/cool-features.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/UNIT3D-IS-COOL/raw/main/cool-features.user.js
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM.notification
// @grant        GM_addStyle
// ==/UserScript==


/* globals GM_config*/
/*jshint esversion: 6 */
(function () {
    'use strict';
    const current_url = window.location.href
    const isRequests = current_url.includes('requests')
    const isCreateReq = current_url.includes('requests/create')
    const isList = current_url.includes('torrents?view')
    // GM_config stuff
    const fields = {
        "auto_fill_ids": { "label": "Auto Fill IDs on Request Creations", "type": "checkbox", "default": false, "tooltip": "TMDB API Key required" },
        "posters": { "label": "Enlarge Posters on Hover", "type": "checkbox", "default": false },
        "search_by_link": { "label": "Search by links", "type": "checkbox", "default": false },
        "resolution_toggle": { "label": "Resolution Toggle", "type": "checkbox", "default": false },
        "tmdb_api_key": { "label": "TMDB API KEY", "type": "text", "default": "", "tooltip": "Only needed for auto_fill_ids", "hidden": true }
    }
    GM_config.init({
        "id": "UNIT3DFeatures",
        "title": "<div>Edit Features</div>",
        "fields": fields,
        "css": `
            #UNIT3DFeatures {background: #333333; width: 85%; margin: 10px 0; padding: 20px 20px}
            #UNIT3DFeatures .field_label {color: #fff; width: 100%;}
            #UNIT3DFeatures .config_header {color: #fff; padding-bottom: 10px; font-weight: 100;}
            #UNIT3DFeatures .reset {color: #f00; text-align: left;}
            #UNIT3DFeatures .config_var {display: flex; flex-direction: row; text-align: left; justify-content: center; align-items: center; width: 75%; margin: 4px auto; padding: 4px 0;}
        `,
        "events": {
            "open": function (doc) {
                const auto_fill_ids = GM_config.fields.auto_fill_ids.node;
                toggleAuthFields(auto_fill_ids.checked);
                auto_fill_ids.addEventListener('change', function () {
                    toggleAuthFields(auto_fill_ids.checked);
                });
                let style = this.frame.style;
                style.width = "300px";
                style.height = "450px";
                style.inset = "";
                style.top = "6%";
                style.right = "6%";
                style.borderRadius = "25px";
                console.log("Config window opened");

                // Add tooltips
                for (const field in fields) {
                    if (fields.hasOwnProperty(field) && fields[field].tooltip) {
                        let label = doc.querySelector(`label[for="UNIT3DFeatures_field_${field}"]`);
                        if (label) {
                            label.title = fields[field].tooltip;
                        }
                    }
                }
            },
            "save": function () {
                alert("Saved Successfully!");
                console.log("Settings saved");
            },
            "close": function () {
                console.log("Config window closed, reloading page");
                if (this.frame) {
                    window.location.reload();
                } else {
                    setTimeout(() => {
                        window.location.reload();
                    }, 250);
                }
            }
        }
    });

    function toggleAuthFields(isChecked) {
        const tmdb_api_field = GM_config.fields.tmdb_api_key.wrapper;

        if (isChecked) {
            tmdb_api_field.style.display = '';
        } else {
            tmdb_api_field.style.display = 'none';
        }
    }

    GM.registerMenuCommand("Settings", () => {
        console.log("Menu command clicked");
        GM_config.open();
    });

    // Auto Fill IDs on Request Page
    if (GM_config.get('auto_fill_ids') && isCreateReq) {
        const tmdb_key = GM_config.get('tmdb_api_key');
        if (!tmdb_key) {
            GM.notification({
                title: 'TMDB API KEY MISSING',
                text: 'You have auto fill ids enabled but you have not added a tmdb api key',
                timeout: 10000
            });
        }
        function GM_xmlHttpRequest_promise(details) {
            return new Promise((resolve, reject) => {
                GM.xmlHttpRequest({
                    ...details,
                    onload: resolve,
                    onerror: reject
                });
            });
        }
        async function fetch_ids(type, url, tmdb_key, title) {
            let tmdb_id, imdb_id, tvdb_id, isAnime, mal_id;

            try {
                const response1 = await GM_xmlHttpRequest_promise({
                    method: 'GET',
                    url: url
                });
                const data1 = JSON.parse(response1.responseText);
                if (data1.results.length > 0) {
                    tmdb_id = data1.results[0].id;
                    let genres = data1.results[0].genre_ids
                    isAnime = genres.includes(16) ? true : false;
                }

                if (tmdb_id) {
                    const external_url = `http://api.themoviedb.org/3/${type}/${tmdb_id}/external_ids?api_key=${tmdb_key}`;
                    const response2 = await GM_xmlHttpRequest_promise({
                        method: 'GET',
                        url: external_url
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
                        method: 'GET',
                        url: `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`
                    });
                    const data3 = JSON.parse(response3.responseText);
                    if (data3.data[0]) {
                        const mal_data = data3.data[0]
                        let titles = mal_data.titles
                        let possible_titles = ""

                        for (const x of titles) {
                            possible_titles += " " + x.title
                        }
                        const isMatch = possible_titles.toLowerCase().includes(title.toLowerCase());
                        mal_id = isMatch ? mal_data.mal_id : 0;
                    }
                }
                // Set the ids
                document.getElementById('autotmdb').value = tmdb_id ? tmdb_id : 0;
                document.getElementById('autoimdb').value = imdb_id ? imdb_id : 0;
                document.getElementById('autotvdb').value = tvdb_id ? tvdb_id : 0;
                document.getElementById('automal').value = mal_id ? mal_id : 0;

                // Append matched links to the sidebar for easy verification.
                const sidebar = document.querySelector('aside .panelV2');
                let match_links = document.createElement('div');
                match_links.setAttribute('id', 'link-container');
                let links_html = `
                <a target="_blank" rel="noopener noreferrer" href="https://www.themoviedb.org/${type}/${tmdb_id}">TMDB</a>
                <a target="_blank" rel="noopener noreferrer" href="https://www.imdb.com/title/tt${imdb_id}">IMDB</a>
                <a target="_blank" rel="noopener noreferrer" href="https://thetvdb.com/?tab=series&id=${tvdb_id}">TVDB</a>
                <a target="_blank" rel="noopener noreferrer" href="https://myanimelist.net/anime/${mal_id}">MAL</a>
                `
                const linkStyler = `
                #link-container {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    width: 80%;
                    margin: 0 auto;
                }
                `
                GM_addStyle(linkStyler)
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
    }`
        GM_addStyle(fetchStyler)
        const form = document.querySelector('.panelV2 form')
        const fetch_container = document.createElement('div');
        fetch_container.id = 'fetch-container'
        const fetch_button = document.createElement('button')
        const fetch_info = document.createElement('p')
        fetch_info.textContent = 'Add a title (Title + Year). Select a category and then click fetch.'
        fetch_info.id = 'fetch-info'
        fetch_button.textContent = 'Fetch IDs'
        fetch_button.addEventListener('click', on_fetch_click)
        fetch_button.id = 'fetch'
        fetch_button.className = "fetch"
        fetch_container.append(fetch_button)
        fetch_container.append(fetch_info)
        form.prepend(fetch_container)
        const year_re = /\b\d{4}\b/
        const res_re = /\b\d*[p|i]\b/

        function on_fetch_click(e) {
            e.preventDefault()
            let title = document.getElementById("title").value
            if (!title) return;
            let cat = document.getElementById("category_id").value
            let type = cat === '2' ? 'tv' : 'movie'
            let year = year_re.exec(title)
            let res = res_re.exec(title)
            title = year ? title.replace(year_re, '') : title
            title = res ? title.replace(res_re, '') : title
            title = title.trim()
            let year_url = year ? `&year="${year}"` : ""
            let url = `https://api.themoviedb.org/3/search/${type}?api_key=${tmdb_key}&language=en-US&query=${encodeURIComponent(title)}&page=1&include_adult=false${year_url}`
            fetch_ids(type, url, tmdb_key, title)
        }
    }

    // Enlarge Posters on hover.
    if (GM_config.get('posters') && isList) {
        let enlargedPoster = document.createElement('div');
        enlargedPoster.id = 'enlargedPoster';
        enlargedPoster.className = 'enlarged-poster';
        enlargedPoster.style.display = 'none';
        document.body.appendChild(enlargedPoster);

        function addListener() {
            let listView = document.querySelectorAll('.torrent-search--list__poster-img');
            let posterView = document.querySelectorAll('.torrent-search--poster__poster');
            let cardView = document.querySelectorAll('.torrent-card__image');
            let groupView = document.querySelectorAll('.torrent-search--grouped__poster');

            let allViews = [...listView, ...posterView, ...cardView, ...groupView];

            if (allViews.length === 0) {
                setTimeout(addListener, 100);
                return;
            }

            allViews.forEach(p => {
                p.addEventListener('mousemove', function (event) {
                    let imgElement = this;
                    if (this.tagName.toLowerCase() === 'a') {
                        imgElement = this.querySelector('img');
                    }
                    if (imgElement) {
                        showEnlargedPoster(event, imgElement, imgElement.src);
                    }
                });
                p.addEventListener('mouseleave', function () {
                    enlargedPoster.style.display = 'none';
                });
            });
        }

        addListener();

        function showEnlargedPoster(event, element, src) {
            const enlargedPoster = document.getElementById('enlargedPoster');

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
            const winWidth = window.innerWidth

            let ySpace = viewportY - scrollY;
            let xSpace = winWidth - viewportX;

            // Place the poster so it fits in the viewport.
            if (ySpace <= 450 && ySpace >= 200) {
                offsetY = -200;
            } else if (ySpace <= 200) {
                offsetY = 10;
            }

            if (xSpace <= 400 && xSpace >= 200) {
                offsetX = -150
            } else if (xSpace <= 200) {
                offsetX = -310
            }
            enlargedPoster.style.left = viewportX + offsetX + 'px';
            enlargedPoster.style.top = viewportY + offsetY + 'px';
            enlargedPoster.style.display = 'block';
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

        GM_addStyle(posterStyler);
    }

    // Add resolution toggles to request and torrent pages
    if (GM_config.get('resolution_toggle') && (isList || isRequests)) {
        /*
        If you want to add support for other UNIT3D trackers you need to find their corresponding resolutions. you can run the following code
        in your console on the torrent or request page.
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

        const isAither = current_url.includes("aither")
        const isBlu = current_url.includes("blutopia")

        // RESOLUTION KEYS
        // Blu { 1: '2160p', 2: '1080p', 3: '1080i', 5: '720p', 6: '576p', 7: '576i', 8: '480p', 9: '480i', 10: 'Other', 11: '4320p' }
        // Aither { 1: '4320p', 2: '2160p', 3: '1080p', 4: '1080i', 5: '720p', 6: '576p', 7: '576i', 8: '480p', 9: '480i', 10: 'Other/Mixed' }
        const resolutionKeys = {
            "blu": {
                "hdp": [5, 3, 2, 1, 11],
                "ahd": [5, 3, 2],
                "asd": [9, 8, 7, 6],
                "uhd": [1, 11]
            },
            "aither": {
                "hdp": [4, 3, 2, 1],
                "ahd": [4, 3, 2],
                "asd": [9, 8, 7, 6],
                "uhd": [1, 2]
            }
        };

        const currentSite = isAither ? "aither" : isBlu ? "blu" : false;

        const resKey = resolutionKeys[currentSite];

        // Get the resolution form group.
        function getResolutionFormGroup() {
            let legends = document.querySelectorAll('.form__legend');
            for (let element of legends) {
                if (element.innerText.trim() === "Resolution") {
                    return element.closest('.form__group');
                }
            }
            return null;
        }

        // Add new resolution checkboxes
        function addCheckbox(id, label, storageKey, resolutionKey) {
            let resolutionFormGroup = getResolutionFormGroup();
            if (!resolutionFormGroup) return;
            let container = document.querySelector('.panelV2 form');
            if (!container) return;

            // Create the parent element for the new checkboxes if it doesn't already exist.
            let flexContainer = container.querySelector('.custom-checkbox-container');
            if (!flexContainer) {
                flexContainer = document.createElement('div');
                flexContainer.className = 'custom-checkbox-container';
                flexContainer.style.display = "flex"
                flexContainer.style.flexDirection = isRequests ? "column" : "row"
                flexContainer.style.width = isRequests ? "200px" : "500px"
                flexContainer.style.justifyContent = "center"
                flexContainer.style.alignItems = "center"
                flexContainer.style.margin = isRequests ? "0" : "0 auto"
                container.appendChild(flexContainer);
            }
            // Don't add a checkbox if it already exists.
            if (flexContainer.querySelector(`#${id}`)) return;

            const checkboxContainer = document.createElement('p');
            checkboxContainer.classList.add('form__group');

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
            const isChecked = localStorage.getItem(storageKey) === 'true';
            checkboxElement.checked = isChecked;

            toggleResolutions({ target: checkboxElement }, resolutionKey);

            checkboxElement.addEventListener('change', (event) => toggleResolutions(event, resolutionKey, storageKey));
        }

        // Toggle the resolution checkboxes based on the stored state to prevent looping.
        let prevCheckboxState = {};

        function toggleResolutions(event, resolutionKey, storageKey) {
            const isChecked = event.target.checked;
            const checkboxId = event.target.id;

            if (prevCheckboxState[checkboxId] !== isChecked) {
                prevCheckboxState[checkboxId] = isChecked;
                const values = resKey[resolutionKey];
                let container = getResolutionFormGroup().querySelector('.form__fieldset-checkbox-container');
                const checkboxes = container.querySelectorAll('.form__checkbox');

                checkboxes.forEach(checkbox => {
                    if (values.includes(parseInt(checkbox.value))) {
                        if (checkbox.checked !== isChecked) {
                            checkbox.checked = isChecked;
                            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
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
                    if (mutation.type === 'childList') {
                        addCheckbox('anySDCheckbox', 'Any SD', 'anySDCheckboxChecked', 'asd');
                        addCheckbox('anyHDCheckbox', 'Any HD', 'anyHDCheckboxChecked', 'ahd');
                        addCheckbox('HDPCheckbox', 'HD+', 'HDPCheckboxChecked', 'hdp');
                        addCheckbox('anyUHDCheckbox', 'UHD', 'anyUHDCheckboxChecked', 'uhd');
                    }
                }
            };
            const observer = new MutationObserver(callback);
            observer.observe(targetNode, config);
        }
        addCheckbox('anySDCheckbox', 'Any SD', 'anySDCheckboxChecked', 'asd');
        addCheckbox('anyHDCheckbox', 'Any HD', 'anyHDCheckboxChecked', 'ahd');
        addCheckbox('HDPCheckbox', 'HD+', 'HDPCheckboxChecked', 'hdp');
        addCheckbox('anyUHDCheckbox', 'UHD', 'anyUHDCheckboxChecked', 'uhd');

        observeDOM();
    }

    // Search torrents by meta links
    if (GM_config.get("search_by_link") && isList) {
        const searchForm = document.getElementById("name");
        const tmdbForm = document.getElementById("tmdbId");
        const imdbForm = document.getElementById("imdbId");
        const tvdbForm = document.getElementById("tvdbId");
        const malForm = document.getElementById("malId");

        const siteFormMap = {
            imdb: imdbForm,
            tmdb: tmdbForm,
            tvdb: tvdbForm,
            mal: malForm
        };

        const regexMap = {
            imdb: /.*\/title\/tt(\d+)/,
            tmdb: /.*[movie|tv]\/(\d+)/,
            tvdb: /.*\/series\/(\d+)/,
            mal: /.*\/anime\/(\d+)/
        }

        function fetchAndParseTVDB(url) {
            return new Promise((resolve, reject) => {
                GM.xmlHttpRequest({
                    method: "GET",
                    url: url,
                    onload: function (response) {
                        if (response.status === 200) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(response.responseText, 'text/html');
                            // Example: Extracting the series ID from the page
                            const basic_info = doc.getElementById("series_basic_info");
                            const lists = basic_info.querySelectorAll("li");
                            if (lists) {
                                const span = lists[0].querySelector("span");
                                let id = span.innerText;
                                resolve(id); // Resolve the promise with the extracted ID
                            } else {
                                console.log('Series ID meta tag not found');
                                reject('Series ID meta tag not found'); // Reject the promise with an error message
                            }
                        } else {
                            console.log('Failed to fetch the webpage. Status:', response.status);
                            reject(`Failed to fetch the webpage. Status: ${response.status}`); // Reject the promise with an error message
                        }
                    },
                    onerror: function (error) {
                        console.error('Error fetching the webpage:', error);
                        reject(error); // Reject the promise with the error
                    }
                });
            });
        }

        async function parseInputs(site, link) {
            const match = link.match(regexMap[site]);

            if (site === 'tvdb' && !match) {
                let tvdbid = await fetchAndParseTVDB(link)
                if (tvdbid) {
                    return { id: tvdbid.trim(), type: 'tv' };
                }
            }
            if (match) {
                if (site === 'tmdb' && link.includes('tv')) {
                    return { id: match[1], type: 'tv' };
                } else if (site === 'tmdb' && link.includes('movie')) {
                    return { id: match[1], type: 'movie' };
                }
                return { id: match[1], type: 'movie' };
            }
            return { id: null, type: null }; // Ensure return even if no match
        }

        async function setFields(site, title) {
            searchForm.value = "";
            const { id, type } = await parseInputs(site, title);
            const tvCheckbox = document.querySelector('input[value="2"][wire\\:model\\.live="categories"]');
            const movieCheckbox = document.querySelector('input[value="1"][wire\\:model\\.live="categories"]');

            if (type === 'tv') {
                tvCheckbox.checked = true;
                movieCheckbox.checked = false;
                tvCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                movieCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (type === 'movie') {
                tvCheckbox.checked = false;
                movieCheckbox.checked = true;
                tvCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                movieCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.log('Error: Something went wrong')
                return
            }

            // Reset all form fields
            for (const key in siteFormMap) {
                if (key !== site) {
                    siteFormMap[key].value = "";
                    siteFormMap[key].dispatchEvent(new Event('input', { bubbles: true }))
                }
            }

            // Set the value for the specific site
            if (id) {
                siteFormMap[site].value = id;
                searchForm.dispatchEvent(new Event('input', { bubbles: true }));
                siteFormMap[site].dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        function handleInputChange(e) {
            const title = e.target.value;
            const isIMDB = title.includes("imdb.com");
            const isTMDB = title.includes("themoviedb");
            const isTVDB = title.includes("thetvdb.com");
            const isMAL = title.includes("myanimelist.net");
            if (isIMDB || isTMDB || isTVDB || isMAL) {
                const site = isIMDB ? "imdb" : isTMDB ? "tmdb" : isTVDB ? "tvdb" : isMAL ? "mal" : false;
                setFields(site, title);
            }
        }

        searchForm.addEventListener('input', handleInputChange);
    }

}());