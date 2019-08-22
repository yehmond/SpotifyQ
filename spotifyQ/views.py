import datetime
import json
from urllib.parse import urlencode

import requests
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect, reverse, get_object_or_404

from .forms import PINForm
from .models import CLIENT_ID, CLIENT_SECRET, generate_random_string, Owner, get_spotify_owner_id, \
    get_homepage_context, try_create_owner, add_song_to_queue, upvote_track, downvote_track, \
    get_search_token, play_next_track, delete_current_track, play_nothing, refresh_access_token

# Create your views here.

STATE_KEY = 'spotify_auth_state'
# REDIRECT_URI = 'https://what-it-do-baby.herokuapp.com/callback'
SEARCH_TOKEN = get_search_token()

# REDIRECT_URI = 'http://192.168.86.222:8000/callback'
REDIRECT_URI = 'http://127.0.0.1:8000/callback'



# BUG
# When guest remains on guest page after 3 hours and owner has not exited session or modified it

# TODO
# - Add last login check for every api (queue/add)
# - Every time guest refreshes, check for last login, potentially use request session?
# - change get_home_context method


def index(request):
    """
    Renders the home landing page
    :param request: contains metadata about the http request
    :return: view of home landing page
    """
    request.session.set_expiry(21600)
    if 'pin' in request.session:
        return redirect(reverse('guest'))
    if 'owner_id' in request.session:
        return redirect(reverse('owner'))
    if request.method == 'POST':
        form = PINForm(request.POST)
        if form.is_valid():
            request.session['pin'] = form.cleaned_data['pin']
            return redirect(reverse('verify_pin'))
    else:
        form = PINForm()
        request.session['votes'] = {'queue_id': 'queue_id'}
    return render(request, 'spotifyQ/index.html', {'form': form})


def guest(request):
    if request.method == 'GET':
        try:
            pin = request.session['pin']
        except KeyError:
            return redirect(reverse('index'))
    elif request.method == 'POST':
        pin = request.POST['pin'].upper()
        request.session['pin'] = pin
    else:
        return redirect(reverse('index'))
    context = get_homepage_context(pin=pin)

    # When owner has terminated queue session but guest remains on guest homepage
    if context == '-1':
        del request.session['pin']
        return render(request, 'spotifyQ/session_has_ended.html')
    context['vote_limit'] = request.session['votes']
    print(request.session.session_key)
    return render(request, 'spotifyQ/guest.html', context=context)


def owner(request):
    """
    Redirect to home landing page if not logged in, otherwise renders the owner home page of the website
    that contains additional features such as:
        - Guest PIN Code
        - Music player control
        - Veto queue
        - Terminate Spotify queue
    :param request: contains metadata about the http request
    :return: view of home page, redirects to home page otherwise
    """
    if request.session.__contains__('owner_id'):
        owner_id = request.session['owner_id']
        context = get_homepage_context(owner_id=owner_id)

        # Occurs when Owner has been deleted from db (ie. one logs in on two devices and exits session on one of them)
        if context == '-1':
            del request.session['owner_id']
            return render(request, 'spotifyQ/session_has_ended.html')
        context['vote_limit'] = request.session['votes']
        return render(request, 'spotifyQ/owner.html', context=context)

    else:
        return redirect(reverse('index'))


def login(request):
    """
    Requests authorization from Spotify and redirects owner to Spotify to log in.
    """

    # the set of scopes determines the access permissions that the owner is required to grant
    scope = 'user-read-private ' \
            'user-read-email ' \
            'user-modify-playback-state ' \
            'user-read-playback-state ' \
            'user-read-currently-playing ' \
            'playlist-modify-public ' \
            'playlist-modify-private ' \
            'streaming '
    # state ensures that incoming connection is result of an authentication request, since redirect_uri can be guessed
    state = generate_random_string(16)
    # store state in session
    request.session[STATE_KEY] = state
    params = {
        'response_type': 'code',
        'client_id': CLIENT_ID,
        'scope': scope,
        'redirect_uri': REDIRECT_URI,
        'state': state,
        'show_dialog': True
    }

    return redirect('https://accounts.spotify.com/authorize/?' + urlencode(params))


def callback(request):
    """
    This function is called when Spotify authentication is complete, whether access is granted or not.
    If access was granted, access token and refresh token are stored.
    Else, show error message.
    """

    # if the owner accepts request, then response query string will contain 'code' and 'state' query params
    # code: an authorization code that can be exchanged for an access token
    code = request.GET.get('code')
    # state: value of state parameter supplied in the request
    state = request.GET.get('state')
    # retrieve stored state from session, None otherwise
    stored_state = None if STATE_KEY not in request.session.keys() else request.session[STATE_KEY]

    # check state parameter to ensure incoming connection is the result of an authentication request
    if (state is None) or (state != stored_state):
        return redirect(reverse('error', args=['state_mismatch']))
    # if owner doesn't accept request or an error has occurred, the response query will not contain 'code'
    # and will be redirected back to home page
    elif code is None:
        return redirect(reverse('index'))
    else:
        # delete state once client state and server state match
        del request.session[STATE_KEY]

        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': REDIRECT_URI,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET
        }

        try:
            # request for refresh and access tokens
            r = requests.post('https://accounts.spotify.com/api/token', data=data, json=True)
        except requests.exceptions.HTTPError as e:
            return redirect(reverse('error', args=['invalid_token']))

        if r.status_code != 200:
            return redirect(reverse('error', args=['invalid_token']))

        else:
            access_token = r.json()['access_token']
            refresh_token = r.json()['refresh_token']
            owner_id = get_spotify_owner_id(access_token)
            expires_in = r.json()['expires_in']
            expires_at = datetime.datetime.now() + datetime.timedelta(seconds=expires_in - 60)
            print('refreshed expire_at right after login', expires_at)
            try_create_owner(owner_id, access_token, refresh_token, expires_at)

            request.session['owner_id'] = owner_id
            # request.session['expires_at'] = expires_at.strftime('%Y/%m/%d, %H:%M:%S')
            return redirect(reverse('owner'))


def error(request, error_message):
    error_messages = ['invalid_token', 'state_mismatch', 'access_denied', 'database_error']

    if error_message in error_messages:
        context = {
            'error_message': 'ERROR: ' + error_message
        }
        return render(request, 'spotifyQ/error.html', context)
    else:
        return HttpResponse(f'HTTP 404: The requested URL/{error_message} cannot be found on this server', status=404)


def logout(request):
    owner_id = request.session.get('owner_id')
    if Owner.objects.filter(owner_id=owner_id).exists():
        Owner.objects.get(owner_id=owner_id).delete()

    request.session.flush()
    return redirect('index')


def queue_add(request):
    """
    API to allow a track to be added to the queue associated with the PIN
    :param request: contains the pin, track_name, track_id, artist names, album name,
     explicit boolean value, duration of the song, in the POST content body
    :return: Returns response with status code 204 if successful, 404 response if no owner can be found with
             provided pin, 400 response if received malformed JSON syntax
    """
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse({'error': 'incorrect request method'}, status=403)

    try:
        j = json.loads(request.body)
        pin = j['pin']
        track_name = j['track_name']
        track_id = j['track_id']
        artists = j['artists']
        album_name = j['album_name']
        explicit = j['explicit']
        duration_ms = j['duration_ms']
        res = add_song_to_queue(pin=pin,
                                track_name=track_name,
                                track_id=track_id,
                                artists=artists,
                                album_name=album_name,
                                explicit=explicit,
                                duration_ms=duration_ms)

        # If no owner can be found with the provided pin
        if res is False:
            return JsonResponse({'error': 'no queue associated with provided PIN'}, status=404)

        return HttpResponse(status=204)

    # if JSON cannot be parsed due to malformed syntax
    except KeyError:
        return JsonResponse({'error': 'malformed syntax'}, status=400)


def queue_upvote(request):
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse({'error': 'incorrect request method'}, status=403)
    try:
        j = json.loads(request.body)
        queue_id = j['queue_id']

        # if the user has never voted on this track before
        if request.session['votes'].get(queue_id) is None:
            votes = request.session['votes']
            votes[queue_id] = 1
            request.session['votes'] = votes
            res = upvote_track(queue_id)
            return JsonResponse({'votes': request.session['votes']}, status=200)
        else:
            if request.session['votes'][queue_id] < 1:
                votes = request.session['votes']
                votes[queue_id] += 1
                request.session['votes'] = votes
                res = upvote_track(queue_id)
                return JsonResponse({'votes': request.session['votes']}, status=200)
            else:
                return JsonResponse({'votes': request.session['votes']}, status=403)

    except KeyError:
        return JsonResponse({'error': 'malformed syntax'}, status=400)


def queue_downvote(request):
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse({'error': 'incorrect request method'}, status=403)
    try:
        j = json.loads(request.body)
        queue_id = j['queue_id']

        # if the user has never voted on this track before
        if request.session['votes'].get(queue_id) is None:
            votes = request.session['votes']
            votes[queue_id] = -1
            request.session['votes'] = votes
            res = downvote_track(queue_id)
            return JsonResponse({'votes': request.session['votes']}, status=200)
        else:
            if request.session['votes'][queue_id] > -1:
                votes = request.session['votes']
                votes[queue_id] -= 1
                request.session['votes'] = votes
                res = downvote_track(queue_id)
                return JsonResponse({'votes': request.session['votes']}, status=200)
            else:
                return JsonResponse({'votes': request.session['votes']}, status=403)

    except KeyError:
        return JsonResponse({'error': 'malformed syntax'}, status=400)


def queue_flush(request):
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse({'error': 'incorrect request method'}, status=403)
    try:
        j = json.loads(request.body)
        pin = j['pin']
        device_id = j['device_id']
        res = play_nothing(pin, device_id)
        if res == '-1':
            return JsonResponse({'error': 'no tracks currently in queue'}, status=404)
        return JsonResponse({'queue_id': res}, status=200)

    except KeyError:
        return JsonResponse({'error': 'malformed syntax'}, status=400)



def queue_next(request):
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse({'error': 'incorrect request method'}, status=403)
    try:
        j = json.loads(request.body)
        pin = j['pin']
        device_id = j['device_id']
        res = play_next_track(pin, device_id)
        if res == '-1':
            return JsonResponse({'error': 'no tracks currently in queue'}, status=404)
        return JsonResponse({'queue_id': res}, status=200)

    except KeyError:
        return JsonResponse({'error': 'malformed syntax'}, status=400)


def queue_played(request):
    """Called by the user when the next song on the queue has been played and the database needs to be updated"""
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse({'error': 'incorrect request method'}, status=403)
    try:
        j = json.loads(request.body)
        queue_id = j['queue_id']
        res = delete_current_track(queue_id)
        if res is False:
            return JsonResponse({'error': 'no user associated with this pin'}, status=404)
        return HttpResponse(status=204)

    except KeyError:
        return JsonResponse({'error': 'malformed syntax'}, status=400)


def queue_device_id(request):
    """Called by the user when the Spotify Webplayer is ready"""
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse({'error': 'incorrect request method'}, status=403)
    try:
        j = json.loads(request.body)
        pin = j['pin']
        device_id = j['device_id']
        o = Owner.objects.get(pin=pin)
        o.device_id = device_id
        o.save()
        return HttpResponse(status=204)

    except KeyError:
        return JsonResponse({'error': 'malformed syntax'}, status=400)


def search_token(request):
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse({'error': 'incorrect request method'}, status=403)
    else:
        try:
            j = json.loads(request.body)
            pin = j['pin']
            if Owner.objects.filter(pin=pin).exists():
                access_token = get_search_token()
                if access_token != '-1':
                    return JsonResponse({'access_token': access_token}, status=200)
                else:
                    # TODO
                    # Add testing to catch errors
                    return JsonResponse({'error': 'cannot refresh token'}, status=500)
            else:
                return JsonResponse({'error': 'no queue associated with provided PIN'}, status=400)
        except KeyError:
            return JsonResponse({'error': 'malformed syntax'}, status=400)


def verify(request):
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse({'error': 'incorrect request method'}, status=403)

    pin = request.POST['pin'].upper()
    get_object_or_404(Owner, pin=pin)

    return HttpResponse(status=204)
    # if Owner.objects.filter(pin=pin).exists():
    #     o = get_object_or_404(Owner, pin=pin)
    #     return HttpResponse(status=204)
    # else:
    #     return JsonResponse({'error': 'invalid pin'}, status=404)


def test(request):
    return render(request, 'spotifyQ/test_button_inside_input.html')


def search_tracks(request):
    global SEARCH_TOKEN
    if not request.is_ajax() or request.method != 'GET':
        return JsonResponse({'error': 'incorrect request method'}, status=403)

    try:
        endpoint = 'https://api.spotify.com/v1/search'
        headers = {
            'Authorization': 'Bearer ' + SEARCH_TOKEN
        }
        params = {
            'q': request.GET.get('q') + '*',
            'type': 'track',
            'limit': 10,
        }
        r = requests.get(endpoint, headers=headers, params=params)
        if r.status_code == 200:
            return JsonResponse(r.json())
        elif r.status_code == 401:
            SEARCH_TOKEN = get_search_token()
        else:
            return JsonResponse({'error': 'Spotify server not responding'}, status=500)

    except ConnectionResetError:
        pass


def get_refreshed_access_token(request):
    if not request.is_ajax() or request.method != 'GET':
        return JsonResponse({'error': 'incorrect request method'}, status=403)
    try:
        pin = request.GET['pin']
        o = Owner.objects.get(pin=pin)
        access_token = refresh_access_token(o.refresh_token, o.owner_id)
        expires_at = Owner.objects.get(pin=pin).expires_at
        return JsonResponse({'access_token': access_token}, status=200)
    except KeyError:
        return JsonResponse({'error': 'malformed syntax'}, status=400)




