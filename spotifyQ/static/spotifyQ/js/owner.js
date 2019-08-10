$(document).ready(() => {

    // CORS request functions
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    let csrftoken = getCookie('csrftoken');

    function csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    const searchBar = document.getElementById('search-bar');
    const searchForm = document.getElementById('search-form');
    const addBtn = document.getElementById('add-btn');
    const pin = document.getElementById("pin-code").innerText;

    let track_name = '';
    let trackID = '';
    let artists = '';
    let album_name = '';
    let duration_ms = 0;
    let explicit = false;
    let renewed = false;

    let cache = [];
    let my_autoComplete;

    function parseSearchResults(res) {
        var searchResults = [];
        for (var i in res["tracks"]["items"]) {
            var album_cover = res["tracks"]["items"][i]["album"]["images"][2]["url"];
            var album_name = res["tracks"]["items"][i]["album"]["name"];
            var artists = "";
            for (var j in res["tracks"]["items"][i]["artists"]) {
                if (j == 0)
                    artists += (res["tracks"]["items"][i]["artists"][j]["name"]);
                else
                    artists += ", " + (res["tracks"]["items"][i]["artists"][j]["name"]);

            }
            var track_id = res["tracks"]["items"][i]["id"];
            var duration_ms = res["tracks"]["items"][i]["duration_ms"];
            var explicit = res["tracks"]["items"][i]["explicit"];
            var track_name = res["tracks"]["items"][i]["name"];
            searchResults.push({
                track_name: track_name,
                album_cover: album_cover,
                album_name: album_name,
                artists: artists,
                track_id: track_id,
                duration_ms: duration_ms,
                explicit: explicit
            });
        }
        return searchResults;
    }

    // Searches for tracks given the query. Called when input is found at the search bar
    function searchTracks(term, response) {

        if (!/^\s*$/.test(term)) {
            const endpoint = "http://127.0.0.1:8000/search/";
            var data = {
                q: term
            };
            $.ajax({
                type: "GET",
                url: endpoint,
                data: data,
                dataType: 'json',
                success: (res) => {
                    response(parseSearchResults(res));
                },
                statusCode: {
                    500: () => {
                        alert('Server overloaded :( Please try again later')
                    }
                }

            })
        }

    }


    // Called when autocomplete renders each individual track result in the autocomplete drop down
    function renderItem(item, search) {
        search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
        return `<div class="autocomplete-suggestion" data-val="${search}">
                            <img src="${item.album_cover}" class="result-cover" width="50px" height="50px">
                            <div class="result-str">
                                ${item.track_name.replace(re, "<b>$1</b>")} <br>
                                <span class="artist">${item.artists.replace(re, "<b>$1</b>")}</span>
                                <div class="hidden">
                                    <span id="track_id">${item.track_id}</span>
                                    <span id="track_name">${item.track_name}</span>
                                    <span id="artists">${item.artists}</span>
                                    <span id="album_name">${item.album_name}</span>
                                    <span id="duration_ms">${item.duration_ms}</span>
                                    <span id="explicit">${item.explicit}</span>
                                </div>
                            </div>
                        </div>`;

    }


    // Lights up search bar and initiates autocomplete object when search bar is in focus
    searchBar.onfocus = function (e) {
        addBtn.style.backgroundColor = "#007bff";
        addBtn.style.color = "#ffffff";
        searchBar.style.backgroundColor = "#343a40";
        my_autoComplete = new autoComplete({
            selector: 'input[name="search-bar"]',
            minChars: 2,
            delay: 150,
            offsetTop: 10,
            cache: true,
            source: searchTracks,
            renderItem: renderItem,
            onSelect: function (e, term, item) {
                trackID = item.querySelector("#track_id").innerText;
                track_name = item.querySelector("#track_name").innerText;
                artists = item.querySelector("#artists").innerText;
                album_name = item.querySelector("#album_name").innerText;
                duration_ms = item.querySelector("#duration_ms").innerText;
                explicit = item.querySelector("#explicit").innerText === "true";
                renewed = true;
                addBtn.click();
            }
        });
    };

    // Greys out buttons and destroys autocomplete object when search bar is not in focus
    $(searchBar).focusout(() => {
        addBtn.style.backgroundColor = "#343a40";
        addBtn.style.color = "#999999";
        searchBar.style.backgroundColor = "#111111";
        my_autoComplete.destroy();
    });

    // Animation that plays when a queue is added
    function addedAnimation() {
        addBtn.style.backgroundColor = "#1DB954";
        addBtn.style.color = "#ffffff";
        $(addBtn).animate({
            width: "100%",
        }, 200, () => {
            addBtn.innerText = "Added";
            setTimeout(() => {
                $(addBtn).animate({
                    width: "80px",
                }, 200, () => {
                    if (document.activeElement == searchBar)
                        addBtn.style.backgroundColor = "#007bff";
                    else {
                        addBtn.style.backgroundColor = "#343a40";
                        addBtn.style.color = "#999999";
                    }
                    addBtn.innerText = "Add";
                });
            }, 1000);
        });
    }

    // Resets track variables to ensure previous track is not added instead of the selected track due to async
    function resetTrackVars() {
        track_name = '';
        trackID = '';
        artists = '';
        album_name = '';
        duration_ms = 0;
        explicit = null;
        renewed = null;
    }

    // adds selected track to queue on submit
    addBtn.onclick = function (e) {
        e.preventDefault();
        // If searchBar.value doesn't only contain empty string or whitespaces
        if (!/^\s*$/.test(searchBar.value) &&
            track_name != '' &&
            trackID != '' &&
            artists != '' &&
            album_name != '' &&
            duration_ms != 0 &&
            explicit != null &&
            renewed != null) {
            const url = 'http://127.0.0.1:8000/queue/add/';
            let data = {
                pin: pin,
                track_name: track_name,
                track_id: trackID,
                artists: artists,
                album_name: album_name,
                explicit: explicit,
                duration_ms: duration_ms
            };
            resetTrackVars();
            console.log('here');
            // $.ajax({
            //     type: "POST",
            //     url: url,
            //     data: JSON.stringify(data),
            //     processData: false,
            //     contentType: 'application/json; charset=UTF-8',
            //     dataType: 'json',
            //     statusCode: {
            //         204: () => {
            //             // do something
            //         },
            //         404: sessionHasEnded,
            //     }
            // });

            socket.send(JSON.stringify(data));
        } else {
            shakeSearchBar();

        }
    };

    function sessionHasEnded() {
        document.body.getElementsByClassName("row")[0].innerHTML = "<div class = \"d-flex justify-content-center pt-3 px-3 container\" style='text-align: center'>\n" +
            "        <h1>\n" +
            "            The queue has been terminated by the user.\n" +
            "        </h1>\n" +
            "    </div>\n" +
            "\n" +
            "    <div class = \"d-flex justify-content-center pt-3 container\">\n" +
            "        <h5>Thank you for using Spotify Q.</h5>\n" +
            "    </div>\n" +
            "    <div class = \"d-flex justify-content-center container\">\n" +
            "        <a class=\"btn btn-primary\" href=\"http://127.0.0.1:8000/\">Back</a>\n" +
            "    </div>";
    }

    // Shakes and makes the border of the search bar red
    function shakeSearchBar() {
        searchBar.style.border = '2px solid red';
        addBtn.style.borderColor = 'red';
        addBtn.style.color = '#ffffff';
        addBtn.style.backgroundColor = 'red';
        setTimeout(() => {
            searchBar.style.border = "1px solid #343a40";
            addBtn.style.borderColor = 'transparent';
            addBtn.style.background = '#343a40';
            if (document.activeElement === searchBar) {
                addBtn.style.backgroundColor = "#007bff";
                addBtn.style.color = "#ffffff";
            } else
                addBtn.style.color = '#999999';
        }, 820);
        document.querySelector(".anim").className = "anim";
        window.requestAnimationFrame(function (time) {
            window.requestAnimationFrame(function (time) {
                document.querySelector(".anim").className = "d-flex justify-content-center anim changing";
            });
        });
    }

    var testForm = $('#testForm');
    var tbody = $('tbody');
    var loc = window.location;
    var wsStart = 'ws://';
    if (loc.protocol == 'https:')
        wsStart = 'wss://';
    var endpoint = wsStart + loc.host + '/' + pin;
    var socket = new ReconnectingWebSocket(endpoint);
    socket.onmessage = function (e) {
        j = JSON.parse(e.data);
        console.log('message', e);
        if (j.message == 'add_track') {
            addedAnimation();
            searchBar.value = "";
            tbody.append(`<tr>
                    <td>${j.track_name}
                        <div class="artist">${j.artists}</div>
                    </td>
                    <td class="vote">
                        <a href="https://www.google.com"><img src="http://${window.location.host}/static/spotifyQ/img/up.png"
                                                              class="vote-btn"/></a>
                        <div class="vote-count">0</div>
                        <a href="https://www.google.com"><img src="http://${window.location.host}/static/spotifyQ/img/down.png"
                                                              class="vote-btn"/></a>
                    </td>
                </tr>`)
        } else if (j.message == 'vote_update') {

        } else if (j.message == 'wrong_pin') {

        }

    };
    socket.onopen = function (e) {
        console.log('open', e);
    };
    socket.onerror = function (e) {
        console.log('error', e)
    };
    socket.onclose = function (e) {
        console.log('close', e)
    };

});



