$(document).ready(() => {

    class Track {

        constructor(queue_id, track_id, votes, track_name, artists, add_time, newly_added, vote_limit) {
            this._queue_id = queue_id;
            this._track_id = track_id;
            this._votes = votes;
            this._track_name = track_name;
            this._artists = artists;
            this._add_time = add_time;
            this._newly_added = newly_added;
            this._vote_limit = vote_limit;
        }

        get queue_id() {
            return this._queue_id;
        }

        set queue_id(id) {
            this._queue_id = id;
        }

        get track_id() {
            return this._track_id;
        }

        set track_id(id) {
            this._track_id = id;
        }

        get votes() {
            return this._votes;
        }

        set votes(v) {
            this._votes = v;
        }

        get track_name() {
            return this._track_name;
        }

        set track_name(track_name) {
            this._track_name = track_name;
        }

        get artists() {
            return this._artists;
        }

        set artists(a) {
            this._artists = a;
        }

        get add_time() {
            return this._add_time;
        }

        set add_time(t) {
            this._add_time = t;
        }

        get newly_added() {
            return this._newly_added
        }

        set newly_added(b) {
            this._newly_added = b;
        }

        get vote_limit() {
            return this._vote_limit;
        }

        set vote_limit(v) {
            this._vote_limit = v;
        }


    }

    class PriorityQueue {
        constructor() {
            this.tracks = []
        }

        enqueue(track) {
            let added = false;
            for (let i = this.tracks.length - 1; i >= 0; i--) {
                if (this.tracks[i].votes === track.votes && this.tracks[i].add_time <= track.add_time) {
                    this.tracks.splice(i + 1, 0, track);
                    added = true;
                    break;
                }
                if (this.tracks[i].votes > track.votes && !added) {
                    this.tracks.splice(i + 1, 0, track);
                    added = true;
                    break;
                }
            }

            if (!added) {
                this.tracks.unshift(track);
            }
        }

        dequeue() {
            if (this.tracks.length > 0)
                return this.tracks.shift();
            else
                return -1;
        }

        front() {
            if (this.tracks.length > 0)
                return this.tracks[0];
            else
                return -1;
        }

        sort() {
            this.tracks.sort((a, b) => {
                if (a.votes < b.votes) return 1;
                if (a.votes > b.votes) return -1;
                if (a.add_time > b.add_time) return 1;
                if (a.add_time < b.add_time) return -1;
            });
        }

        render() {
            this.sort();
            var tRow = '';
            this.tracks.forEach((elem) => {
                if (elem.newly_added) {
                    tRow += `<tr id="newly_added" class="${elem.queue_id}" >`;
                    elem._newly_added = false;
                } else {
                    tRow += `<tr class="${elem.queue_id}">`;
                }
                tRow += `<td>
                            ${elem.track_name}
                            <div class="artist">${elem.artists}</div>
                        </td>
                        <td class="vote">`;
                if (elem.vote_limit === 1)
                    tRow += `<a href="" class="vote-up disabled">`;
                else
                    tRow += `<a href="" class="vote-up">`;

                tRow += `<img src="/static/spotifyQ/img/up.png" class="vote-btn vote-up"/>
                        </a>
                        <div class="vote-count">${elem.votes}</div> `;
                if (elem.vote_limit === -1)
                    tRow += `<a href="" class="vote-down disabled">`;
                else
                    tRow += `<a href="" class="vote-down">`;
                tRow += `<img src="/static/spotifyQ/img/down.png" class="vote-btn vote-down"/>
                        </a>
                    </td>
                    </tr>`;
            });
            $("tbody").html(tRow);
            setTimeout(() => {
                $("#newly_added").effect("highlight", 1200);
                $("#newly_added").attr('id', '');
            }, 200);
            $(".vote-up").hover((v) => {
                $(v.currentTarget).attr('src', '/static/spotifyQ/img/up-hover.png')
            }, (v) => {
                $(v.currentTarget).attr('src', '/static/spotifyQ/img/up.png')
            });

            $(".vote-down").hover((v) => {
                $(v.currentTarget).attr('src', '/static/spotifyQ/img/down-hover.png')
            }, (v) => {
                $(v.currentTarget).attr('src', '/static/spotifyQ/img/down.png')
            });
        }
    }

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
    const playPauseBtn = document.getElementById("play-pause-btn");
    const playBtn = document.getElementById("play-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const nextBtn = document.getElementById("next-btn");
    const loc = window.location;
    let token = $('#access_token').text();
    let track_name = '';
    let track_id = '';
    let artists = '';
    let album_name = '';
    let duration_ms = 0;
    let explicit = false;
    let renewed = false;
    let progress_ms = 0;
    let prev_track_id = '';
    let prev_duration = 0;
    let device_id_ = '';
    let paused = true;
    let nothingPlaying = true;
    let cache = [];
    let my_autoComplete;
    let addedAnimationIsRunning = false;
    let q = new PriorityQueue();
    let current_track_duration = 0;
    let current_track_position = 0;
    let progressBarTimer;

    function parseExistingQueue() {
        existing_queue.forEach((elem) => {
            let queue_id = elem.fields.queue_id;
            let track_id = elem.fields.track_id;
            let votes = elem.fields.votes;
            let track_name = elem.fields.track_name;
            let artists = elem.fields.artists;
            let add_time = new Date(elem.fields.add_time).getTime();
            let limit = vote_limit[queue_id];
            if (limit == undefined)
                limit = 0;
            let t = new Track(queue_id, track_id, votes, track_name, artists, add_time, false, limit);
            q.enqueue(t);
        });
        q.render();
    }

    parseExistingQueue();


    function parseSearchResults(res) {
        var searchResults = [];
        for (var i in res["tracks"]["items"]) {
            var album_cover = res["tracks"]["items"][i]["album"]["images"][2]["url"];
            var album_name = res["tracks"]["items"][i]["album"]["name"];
            var artists = "";
            for (var j in res["tracks"]["items"][i]["artists"]) {
                if (j === "0")
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
            const endpoint = loc.protocol + "//" + loc.host + "/search/";
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
                        // needs to refresh search token;
                    }
                }

            })
        }

    }

    function displayMessage(msg, refresh) {
        if (refresh) {
            document.body.getElementsByClassName("row")[0].innerHTML =
                `<div id="wrapper">
                <div>
                    <h3>${msg}</h3>
                </div>
                <div>
                    <h5>Thank you for using Spotify Q.</h5>
                    <a class="btn btn-primary" href="">Refresh</a>
                </div>
            </div>`;
        } else {
            document.body.getElementsByClassName("row")[0].innerHTML =
                `<div id="wrapper">
                <div>
                    <h3>${msg}</h3>
                </div>
                <div>
                    <h5>Thank you for using Spotify Q.</h5>
                    <a class="btn btn-primary" href="${loc.protocol}//${loc.host}/logout/">Back</a>
                </div>
            </div>`;
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
        if (!addedAnimationIsRunning) {
            addBtn.style.backgroundColor = "#007bff";
            addBtn.style.color = "#ffffff";
            searchBar.style.backgroundColor = "#343a40";
        }
        $('html, body').animate({
            scrollTop: $('#queue').offset().top
        }, 400);
    };
    my_autoComplete = new autoComplete({
        selector: 'input[name="search-bar"]',
        minChars: 2,
        delay: 200,
        offsetTop: 10,
        cache: false,
        source: searchTracks,
        renderItem: renderItem,
        onSelect: function (e, term, item) {
            track_id = item.querySelector("#track_id").innerText;
            track_name = item.querySelector("#track_name").innerText;
            artists = item.querySelector("#artists").innerText;
            album_name = item.querySelector("#album_name").innerText;
            duration_ms = item.querySelector("#duration_ms").innerText;
            explicit = item.querySelector("#explicit").innerText === "true";
            renewed = true;
            addBtn.click();
        }
    });

    // Greys out buttons and destroys autocomplete object when search bar is not in focus
    $(searchBar).focusout(() => {
        if (!addedAnimationIsRunning) {
            addBtn.style.backgroundColor = "#343a40";
            addBtn.style.color = "#999999";
            searchBar.style.backgroundColor = "#111111";
        }
    });

    // Animation that plays when a queue is added
    function addedAnimation() {
        addedAnimationIsRunning = true;
        $('#add-btn').css('background-color', "#1DB954");
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
                        addBtn.style.background = "#007bff";
                    else {
                        addBtn.style.background = "#343a40";
                        addBtn.style.color = "#999999";
                        searchBar.style.backgroundColor = "#111111";
                    }
                    addBtn.innerText = "Add";
                });
            }, 1000);
        });
        setTimeout(() => {
            addedAnimationIsRunning = false;
        }, 1200);

    }

    // Resets track variables to ensure previous track is not added instead of the selected track due to async
    function resetTrackVars() {
        track_name = '';
        track_id = '';
        artists = '';
        album_name = '';
        duration_ms = 0;
        explicit = null;
        renewed = null;
    }

    function generateRanString(len) {
        // Generates a random string containing numbers and letters.
        var text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text
    }

    // adds selected track to queue on submit
    addBtn.onclick = function (e) {
        e.preventDefault();
        searchBar.focus();
        // If searchBar.value doesn't only contain empty string or whitespaces
        if (!/^\s*$/.test(searchBar.value) &&
            track_name != '' &&
            track_id != '' &&
            artists != '' &&
            album_name != '' &&
            duration_ms != 0 &&
            explicit != null &&
            renewed != null) {
            const url = loc.protocol + "//" + loc.host + "/queue/add/";
            let queue_id = generateRanString(32);
            let data = {
                message: 'add_track_to_queue',
                pin: pin,
                track_name: track_name,
                track_id: track_id,
                artists: artists,
                album_name: album_name,
                explicit: explicit,
                duration_ms: duration_ms,
                curr_track_id: $('#track_name').attr('class'),
                queue_id: queue_id,
                add_time: Date.now(),
            };
            let t = new Track(queue_id, track_id, 0, track_name, artists, Date.now(), true, 0);
            q.enqueue(t);
            q.render();
            resetTrackVars();
            socket.send(JSON.stringify(data));
            addedAnimation();
            searchBar.value = "";
        } else {
            shakeSearchBar();

        }
    };

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
        document.querySelector(".anim").className = "d-flex justify-content-center anim mx-3";
        window.requestAnimationFrame(function (time) {
            window.requestAnimationFrame(function (time) {
                document.querySelector(".anim").className = "d-flex justify-content-center anim changing mx-3";
            });
        });
    }

    var testForm = $('#testForm');
    var tbody = $('tbody');
    var wsStart = 'ws://';
    if (loc.protocol == 'https:')
        wsStart = 'wss://';
    var endpoint = wsStart + loc.host + '/' + pin;
    var socket = new ReconnectingWebSocket(endpoint);
    socket.onmessage = function (e) {
        let j = JSON.parse(e.data);
        // console.log('message', e);
        if (j.message == "add_track_to_queue") {
            console.log("added track to queue");
            if (!q.tracks.some(elem => elem.queue_id == j.queue_id)) {
                let t = new Track(j.queue_id, j.track_id, 0, j.track_name, j.artists, j.add_time, true, 0);
                q.enqueue(t);
                q.render();
            }
        } else if (j.message == "update_vote") {
            let t = q.tracks.find((e) => {
                return e.queue_id == j.queue_id
            });
            t.votes = j.votes;
            q.render();
            $(`.${j.queue_id}`).find(".vote-count").text(j.votes);
            $(`.${j.queue_id}`).find(".vote-count").effect("highlight", 800);
            // $(`.${j.queue_id}`).effect("highlight", 800);

        } else if (j.message === "update_current_playback") {
            $('#cover').attr("src", j.cover);
            $('#artists').text(j.artists);
            $('#track_name').text(j.track_name);
            $('#track_name').attr('class', j.track_id);
            current_track_duration = j.duration_ms;
            current_track_position = j.progress_ms;
            clearInterval(progressBarTimer);
            if (!j.paused) {
                progressBarTimer = setInterval(() => {
                    updateProgressBar();
                }, 500);
            }

            console.log("updating playback");
        } else if (j.message == "next_song") {
            q.dequeue();
            q.render();
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

    $("#add-a-song-to-queue-btn").on('click', function (e) {

        $('html, body').animate({
            scrollTop: $('#queue').offset().top
        }, 400);
        searchBar.focus();
    });

    function updateProgressBar() {
        current_track_position += 500;
        $(".progress-bar")[0].style.width = (current_track_position / current_track_duration * 100).toString() + "%";
    }

    $("table").on('click', (event) => {
        if (event.target.className.includes("vote-up")) {
            event.preventDefault();
            let vote_element = event.target.parentElement.parentElement.parentElement;
            let queue_id = vote_element.className;
            for (let i = 0; i < q.tracks.length; i++) {
                if (q.tracks[i].queue_id == queue_id && q.tracks[i].vote_limit < 1) {
                    q.tracks[i].votes += 1;
                    var votes = q.tracks[i].votes;
                    q.tracks[i].vote_limit += 1;
                    q.tracks[i].newly_added = true;
                    q.render();
                    console.log(votes);
                    $.ajax({
                        type: "POST",
                        url: loc.protocol + "//" + loc.host + "/queue/upvote/",
                        data: JSON.stringify({'queue_id': queue_id}),
                        dataType: 'json',
                        statusCode: {
                            200: () => {

                            },
                            403: () => {

                            }
                        }
                    });
                    break;
                }
            }

            let data = {
                message: 'update_vote',
                queue_id: queue_id,
                votes: votes,
            };
            socket.send(JSON.stringify(data));

        }
        if (event.target.className.includes("vote-down")) {
            event.preventDefault();
            let vote_element = event.target.parentElement.parentElement.parentElement;
            let queue_id = vote_element.className;
            for (let i = 0; i < q.tracks.length; i++) {
                if (q.tracks[i].queue_id === queue_id && q.tracks[i].vote_limit > -1) {
                    q.tracks[i].votes -= 1;
                    var votes = q.tracks[i].votes;
                    q.tracks[i].vote_limit -= 1;
                    q.tracks[i].newly_added = true;
                    q.render();
                    $.ajax({
                        type: "POST",
                        url: loc.protocol + "//" + loc.host + "/queue/downvote/",
                        data: JSON.stringify({queue_id: queue_id}),
                        dataType: 'json',
                        statusCode: {
                            200: () => {

                            },
                            403: () => {

                            }
                        }

                    });
                    break;
                }
            }
            console.log(votes);
            let data = {
                message: 'update_vote',
                queue_id: queue_id,
                votes: votes,
            };
            socket.send(JSON.stringify(data));
        }

    });

    // AJAX call to server to refresh access token
    function getRefreshedAccessToken() {
        $.ajax({
            type: "GET",
            url: loc.protocol + "//" + loc.host + "/token/refresh/",
            data: {pin: pin},
            statusCode: {
                200: (e) => {
                    token = e.access_token;
                }
            }
        });

    }

    // Automatically refreshes access token for Spotify Web Player
    function setRefreshTokenInterval() {
        var expires_at = $('#expires_at').text();
        setTimeout(() => {
            getRefreshedAccessToken();
            setInterval(() => {
                getRefreshedAccessToken();
            }, 3600000)
        }, expires_at - Date.now() - 10000);
    }


    window.onSpotifyWebPlaybackSDKReady = () => {
        setRefreshTokenInterval();
        const player = new Spotify.Player({
            name: 'SpotifyQ Web Player',
            getOAuthToken: cb => {
                cb(token);
            }
        });

        // Error handling
        player.addListener('initialization_error', ({message}) => {
            console.error(message);
        });
        player.addListener('authentication_error', ({message}) => {
            console.error(message);
        });
        player.addListener('account_error', ({message}) => {
            console.error(message);
        });
        player.addListener('playback_error', ({message}) => {
            console.error(message);
            // if no next tracks in queue
            if (message === "Cannot perform operation; no list was loaded.") {
                nothingPlaying = true;
            }
        });

        function flush(current_track) {
            nothingPlaying = true;
            $('#track_name').text("Nothing playing at the moment");
            $('#artists').text("Add a song to queue then press play to get started");
            $('#cover').attr('src', `${loc.protocol}//${loc.host}/static/spotifyQ/img/cover_placeholder.png`);
            console.log('updating other devices when nothing is playing');
            let data = {
                message: 'update_current_playback',
                track_id: current_track['id'],
                track_name: "Nothing playing at the moment",
                artists: "Add a song to queue then press play to get started",
                album_name: 'N/A',
                cover: `${loc.protocol}//${loc.host}/static/spotifyQ/img/cover_placeholder.png`,
                progress_ms: 0,
                duration_ms: 0,
            };
            socket.send(JSON.stringify(data));
        }

        function updateCurrentPlayback(current_track, state) {
            prev_track_id = current_track['id'];
            var artists = [];
            for (let i in current_track['artists'])
                artists.push(current_track['artists'][i]['name']);
            let data = {
                message: 'update_current_playback',
                track_id: current_track['id'],
                track_name: current_track['name'],
                artists: artists.join(", "),
                album_name: current_track['album']['name'],
                cover: current_track['album']['images'][0]['url'],
                progress_ms: state.position,
                duration_ms: state.duration,
                paused: state.paused,
            };
            socket.send(JSON.stringify(data));
        }

        function hasTrackInQueue() {
            return document.getElementsByTagName("tr").length > 0;
        }

        function playNothing() {
            $.ajax({
                type: "POST",
                url: loc.protocol + "//" + loc.host + "/queue/flush/",
                data: JSON.stringify({pin: pin, device_id: device_id_}),
                dataType: 'json'
            });
        }


        function playNextSong() {
            nothingPlaying = false;
            // q.dequeue();
            // q.render();
            $.ajax({
                type: "POST",
                url: loc.protocol + "//" + loc.host + "/queue/next/",
                data: JSON.stringify({pin: pin, device_id: device_id_}),
                dataType: 'json',
                statusCode: {
                    200: (e) => {
                        // signal server that song has started playing and delete currently playing song from db
                        $.ajax({
                            type: "POST",
                            url: loc.protocol + "//" + loc.host + "/queue/played/",
                            data: JSON.stringify({queue_id: e.queue_id}),
                            dataType: 'json',
                            error: (e) => {
                                console.log(e);
                            },
                            statusCode: {
                                204: () => {
                                    // if ($("tr").get(0))
                                    //     document.getElementsByTagName("tr")[0].remove();
                                    // q.remove();
                                    // q.render();

                                }
                            }
                        });
                    },
                    500: () => {
                        alert('Server overloaded :( Please try again later')
                    },
                    404: (e) => {
                        displayMessage("The queue has been terminated by the user.", false)
                    }
                }

            });
            let data = {
                message: 'next_song',
            };
            socket.send(JSON.stringify(data));
        }

        // Playback status updates
        player.addListener('player_state_changed', (state) => {
            // console.log('Currently Playing', current_track);
            if (state) {
                var current_track = state.track_window.current_track;

                // change playPause btn
                if (state.paused) {
                    paused = true;
                    pauseBtn.style.display = 'none';
                    playBtn.style.display = 'inline';
                    // clearInterval(progressBarTimer);
                } else {
                    paused = false;
                    pauseBtn.style.display = 'inline';
                    playBtn.style.display = 'none';
                    nothingPlaying = false;
                    // clearInterval(progressBarTimer);
                    // progressBarTimer = setInterval(() => {
                    //     updateProgressBar();
                    // }, 500);
                }
                // Update current playback on other devices on ws

                // Current song has ended
                if (state.paused === true && state.position === 0 && state.duration > 0) {
                    if (hasTrackInQueue()) {
                        playNextSong();
                    } else {
                        // playNothing();
                        // flush(current_track);
                    }
                }

                // start of new song -> consider putting updateCurrentPlayback inside or outside depending on
                // how often I want to update the devices
                // if (state && state.paused === false && state.duration > 0 && state.position === 0) {
                //     // console.log('Started new song');
                //     updateCurrentPlayback(current_track, state);
                // }

                current_track_duration = parseInt(current_track['duration_ms']);
                current_track_position = parseInt(state.position);
                updateCurrentPlayback(current_track, state);

            }
        });

        // Ready
        player.addListener('ready', ({device_id}) => {
            console.log('Ready with Device ID', device_id);
            device_id_ = device_id;
            $.ajax({
                type: "POST",
                url: loc.protocol + "//" + loc.host + "/queue/device_id/",
                data: JSON.stringify({pin: pin, device_id: device_id}),
                dataType: 'json',
                success: (res) => {
                },
                statusCode: {
                    500: () => {

                    },
                    404: () => {

                    }
                }
            });

        });

        // Not Ready
        player.addListener('not_ready', ({device_id}) => {
            console.log('Device ID has gone offline', device_id);
            displayMessage("Connection lost. Please reconnect to the internet to continue", true);

        });

        // Connect to the player!
        player.connect();

        playPauseBtn.onclick = function (e) {

            if (nothingPlaying && hasTrackInQueue()) {
                playNextSong();
            }
            // paused
            if (paused && !nothingPlaying) {
                player.resume();
            }
            // playing
            else {
                player.pause();
            }
        };

        nextBtn.onclick = function (e) {
            if (hasTrackInQueue()) {
                playNextSong();
            } else {
                player.nextTrack();
            }
        };
    };

});

