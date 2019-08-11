window.onSpotifyWebPlaybackSDKReady = () => {
    const token = '[My Spotify Web API access token]';
    const player = new Spotify.Player({
        name: 'SpotifyQ Web Player',
        getOAuthToken: cb => {
            cb('BQCXKXNsu0xXqwsn8iYSWN7W2TRCDopK8t8Uj-bIvShllG3G-Y01sdOBukRuTjUyatIpCivF4G_H4eDites8OOB-ly9oxokfirz6ZMTJnGj-py3h3jM78wZRr22N7WnCEl_9CEwK95Nei3LSLYL6QZJBv_GJc2Q6hbpsGRgjFHpm-s4zL53JejGRrvZInB4M_V4LsLoykxR9gRY-BAjpDR6Le9m61BNQBMaLb-llAN3QLnOjk7I3EIa5GmpF');
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
    });

    // Playback status updates
    player.addListener('player_state_changed', state => {
        console.log(state);
    });

    // Ready
    player.addListener('ready', ({device_id}) => {
        console.log('Ready with Device ID', device_id);
    });

    // Not Ready
    player.addListener('not_ready', ({device_id}) => {
        console.log('Device ID has gone offline', device_id);
    });

    // Connect to the player!
    player.connect();
};

$(document).ready(() => {

    window.mobileAndTabletCheck = function () {
        var check = false;
        (function (a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
        })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    };

    console.log(`Mobile Device: ${mobileAndTabletCheck()}`);

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
    let progress_ms = 0;

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
            // const endpoint = "http://127.0.0.1:8000/search/";
            const endpoint = "http://192.168.86.222:8000/search/";
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
    var addedAnimationIsRunning = false;
    // Greys out buttons and destroys autocomplete object when search bar is not in focus
    $(searchBar).focusout(() => {
        if (!addedAnimationIsRunning) {
            addBtn.style.backgroundColor = "#343a40";
            addBtn.style.color = "#999999";
            searchBar.style.backgroundColor = "#111111";
        }
        my_autoComplete.destroy();
    });

    // Animation that plays when a queue is added
    function addedAnimation() {
        addedAnimationIsRunning = true;
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
        searchBar.focus();
        // If searchBar.value doesn't only contain empty string or whitespaces
        if (!/^\s*$/.test(searchBar.value) &&
            track_name != '' &&
            trackID != '' &&
            artists != '' &&
            album_name != '' &&
            duration_ms != 0 &&
            explicit != null &&
            renewed != null) {
            // const url = 'http://127.0.0.1:8000/queue/add/';
            const url = 'http://192.168.86.222:8000/queue/add/';
            let data = {
                message: 'add_to_queue',
                pin: pin,
                track_name: track_name,
                track_id: trackID,
                artists: artists,
                album_name: album_name,
                explicit: explicit,
                duration_ms: duration_ms,
                curr_track_id: $('#track_name').attr('class'),
            };
            resetTrackVars();
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
            addedAnimation();
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
            // "        <a class=\"btn btn-primary\" href=\"http://127.0.0.1:8000/\">Back</a>\n" +
            "        <a class=\"btn btn-primary\" href=\"http://192.168.86.222:8000/\">Back</a>\n" +
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
        if (j.message == 'add_to_queue') {
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

        } else if (j.message == 'update_current_playback') {
            $('#cover').attr("src", j.cover);
            $('#artists').text(j.artists);
            $('#track_name').text(j.track_name);
            $('#track_name').attr('class', j.track_id);
            duration_ms = j.duration_ms;
            progress_ms = j.progress_ms;
            console.log('updated current plaback');
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
        console.log('in jquery');

        $('html, body').animate({
            scrollTop: $('#queue').offset().top
        }, 400);
        searchBar.focus();
    });

    // Update Homepage every 90 seconds
    // setInterval(updateHomepageContext, 60);
    //
    // function updateHomepageContext() {
    //     let data = {
    //         message: 'update_current_playback',
    //     };
    //     socket.send(JSON.stringify(data));
    // }

    console.log($('#track_name').attr('class'));
});



