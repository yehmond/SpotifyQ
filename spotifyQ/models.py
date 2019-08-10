import os
import uuid
from random import randrange

import requests
from django.core.exceptions import ValidationError
from django.db import models
import datetime
# Create your models here.


# Check for environment variable
if not os.getenv("SPOTIFY_CLIENT_ID"):
    raise RuntimeError("SPOTIFY_CLIENT_ID is not set")
if not os.getenv("SPOTIFY_CLIENT_SECRET"):
    raise RuntimeError("SPOTIFY_CLIENT_SECRET is not set")

CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')


class Owner(models.Model):
    owner_id = models.CharField(max_length=255, primary_key=True)
    last_login = models.DateTimeField(default=datetime.datetime.now)
    current_track = models.CharField(max_length=60, blank=True, null=True, default=None)
    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255)
    expires_at = models.DateTimeField(default=datetime.datetime.now)
    pin = models.CharField(max_length=4)
    country = models.CharField(max_length=2, null=True, blank=True, default='CA')
    playlist_uri = models.CharField(max_length=255)

    def __str__(self):
        return str(self.owner_id)


class Queue(models.Model):
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE)
    _uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pin = models.CharField(max_length=4)
    track_name = models.TextField()
    track_id = models.CharField(max_length=25)
    artists = models.CharField(max_length=255)
    album_name = models.CharField(max_length=255)
    explicit = models.BooleanField()
    duration_ms = models.SmallIntegerField()
    votes = models.SmallIntegerField(default=0)
    add_time = models.DateTimeField()

    def __str__(self):
        return str(str(self.owner) + ' - ' + self.track_name)

    class Meta:
        managed = True
        ordering = ('-votes','add_time')


def generate_random_string(length):
    """
    Generates a random string containing numbers and letters.

    :param length: The length of the string
    :return: The generated string
    """

    text = ''
    possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for i in range(0, length):
        text += possible[randrange(0, len(possible))]

    return text


def generate_pin():
    """
    Generates a 4 digit pin containing random numbers and letters.
    :return: The generated pin
    """
    pin = ''
    possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

    for i in range(0, 4):
        pin += possible[randrange(0, len(possible))]

    return pin


def try_create_owner(owner_id, access_token, refresh_token, expires_at):
    if Owner.objects.filter(owner_id=owner_id).exists():
        o = Owner.objects.get(owner_id=owner_id)
        o.access_token = access_token
        o.refresh_token = refresh_token
        if datetime.datetime.now() > o.last_login + datetime.timedelta(seconds=21600):
            o.pin = generate_pin()
        o.last_login = datetime.datetime.now()
        o.save()
    else:
        create_owner(owner_id, access_token, refresh_token, expires_at)


def create_owner(owner_id, access_token, refresh_token, expires_at):
    """
    Creates an owner in database
    :param owner_id: Unique Spotify user ID
    :param access_token:
    :param refresh_token:
    :param expires_at: Time at which access_token expires
    :return: Returns True if owner exists or has been successfully created, False otherwise
    """
    o = Owner.objects.create(owner_id=owner_id,
                             last_login=datetime.datetime.now(),
                             access_token=access_token,
                             refresh_token=refresh_token,
                             expires_at=expires_at,
                             pin=generate_pin(),
                             playlist_uri=create_playlist(owner_id, access_token, expires_at))
    o.save()


def create_playlist(owner_id, access_token, expires_at):

    if expires_at <= datetime.datetime.now():
        refresh_token = Owner.objects.get(owner_id=owner_id).refresh_token
        access_token = refresh_access_token(refresh_token, owner_id)

    endpoint = f'https://api.spotify.com/v1/users/{owner_id}/playlists'
    headers = {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
    }
    data = {
        'name': 'SpotifyQ Playlist',
        'public': False,
        'description': 'DO NOT DELETE. This playlist is used to maintain the order of the queue used in SpotifyQ.'
    }
    r = requests.post(endpoint, headers=headers, json=data)
    if r.status_code == 200 or r.status_code == 201:
        return r.json()['id']
    else:
        '-1'




def add_song_to_queue(pin, playlist_uri, track_name, track_id, artists, album_name, explicit, duration_ms):
    """
    Adds song to queue in database with the following attributes.
    :param pin: Pin that links to the owner that it belongs to
    :param playlist_uri: Playlist that it will be added to
    :param track_name: Name of the song
    :param track_id: Spotify unique ID of the track
    :param artists: Artist name(s) separated by commas
    :param album_name: Name of the album
    :param explicit: Boolean value that states whether the track is explicit
    :param duration_ms: Duration of the track in milliseconds
    :return: Returns the True if successfully added, otherwise False
    """
    try:
        owner = Owner.objects.get(pin=pin)
        q = Queue.objects.create(owner=owner,
                                 pin=pin,
                                 playlist_uri=playlist_uri,
                                 track_name=track_name,
                                 track_id=track_id,
                                 artists=artists,
                                 album_name=album_name,
                                 explicit=explicit,
                                 duration_ms=duration_ms)
        q.save()
        return True

    except Owner.DoesNotExist:
        return False


def upvote_track(_uuid):
    try:
        q = Queue.objects.get(_uuid=_uuid)
        q.votes += 1
        q.save()
    except Queue.DoesNotExist:
        return False
    except ValidationError:
        return False


def downvote_track(_uuid):
    try:
        q = Queue.objects.get(_uuid=_uuid)
        q.votes -= 1
        q.save()
    except Queue.DoesNotExist:
        return False
    except ValidationError:
        return False


def get_spotify_owner_id(access_token):
    """
    Gets Spotify unique owner ID from Spotify API
    :param access_token: access token required to access owner's ID
    :return: string of the owner ID
    """
    endpoint = 'https://api.spotify.com/v1/me'
    headers = {
        'Authorization': 'Bearer ' + access_token
    }
    r = requests.get(endpoint, headers=headers)

    # If nothing is currently playing or if owner has set their playback in private mode
    if r.status_code != 200:
        return None
    else:
        return r.json()['id']


# def try_get_current_track(owner_id):
#
#     try:
#         o = Owner.objects.get(owner_id=owner_id)
#
#         # If access_token has expired
#         if o.expires_at <= datetime.datetime.now():
#             refresh_token = Owner.objects.get(owner_id=owner_id).refresh_token
#             access_token = refresh_access_token(refresh_token, owner_id)
#             if access_token == '-1':
#                 return '-1'
#             context = get_current_track(access_token)
#             context['pin'] = o.pin
#             return context
#
#         context = get_current_track(o.access_token)
#         context['pin'] = o.pin
#         return context
#     except Owner.DoesNotExist:
#         return '-1'

def add_to_playlist(owner, playlist_uri, access_token):

    if owner.expires_at <= datetime.datetime.now():
        refresh_token = Owner.objects.get(pin=owner.pin).refresh_token
        access_token = refresh_access_token(refresh_token, owner.owner_id)

    endpoint = f'https://api.spotify.com/v1/playlists/{playlist_uri}/tracks'
    headers = {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
    }
    l = [f'spotify:track:{i.track_id}' for i in list(Queue.objects.filter(pin=owner.pin).order_by('-votes'))]
    print(l)
    params = {
        'uris': ','.join(l)
    }
    r = requests.put(endpoint, headers=headers, params=params)
    print(r.text)
    print(r.status_code)
    if r.status_code == 201:
        return True
    else:
        return False


def get_current_track(access_token):
    """
    Returns a dictionary object containing current playing track information.
    Assumes access token is valid
    :param access_token: access token required to access owner's current track
    :return: Returns track dictionary object or None if owner is not currently playing music
    """
    endpoint = 'https://api.spotify.com/v1/me/player/currently-playing'
    headers = {
        'Authorization': 'Bearer ' + access_token
    }
    r = requests.get(endpoint, headers=headers)
    if r.status_code != 200:
        return {}
        # track = {
        #     'track_name': 'Nothing playing at the moment',
        #     'artists': ['Click the button below to get started']
        # }
        # return track
    else:
        track = {
            'track_name': r.json()['item']['name'],
            'album_name': r.json()['item']['album']['name'],
            'artists': [a['name'] for a in r.json()['item']['artists']],
            'cover': r.json()['item']['album']['images'][0]['url']
        }
        return track


def get_homepage_context(**kwargs):
    """
    Returns homepage context to be displayed after owner or guest are successfully authenticated.
    :param pin: owner_id or pin
    :return: Returns context containing track_name, cover, artists, pin, to be displayed on the homepage.
             Returns None if owner has terminated queue session.
    """
    def update_context(access_token):
        context = get_current_track(access_token)
        context['pin'] = o.pin
        get_queue(context, o.owner_id)
        return context

    try:
        if 'pin' in kwargs:
            o = Owner.objects.get(pin=kwargs['pin'])
        else:
            o = Owner.objects.get(owner_id=kwargs['owner_id'])

        # If access_token has expired
        if o.expires_at <= datetime.datetime.now():
            refresh_token = Owner.objects.get(pin=o.pin).refresh_token
            access_token = refresh_access_token(refresh_token, o.owner_id)
            if access_token == '-1':
                return '-1'
            return update_context(access_token)

        return update_context(o.access_token)

    except Owner.DoesNotExist:
        return '-1'


def get_queue(context, owner_id):
    q = Queue.objects.filter(owner_id=owner_id).order_by('-votes')
    context['queue'] = list(q)


def play_next_track(access_token) -> bool:
    headers = {
        'Authorization': 'Bearer ' + access_token
    }

    r = requests.post('https://api.spotify.com/v1/me/player/next', headers=headers)
    return r.status_code == 204


def refresh_access_token(refresh_token, owner_id):
    """
    Request a refreshed access token from POST https://accounts.spotify.com/api/token
    :param refresh_token: refresh token to send to Spotify in order to get a refreshed access token
    :return: a new access_token if successful, otherwise returns -1
    """

    def update_db_after_token_refresh():
        o = Owner.objects.get(owner_id=owner_id)
        o.access_token = access_token
        o.expires_at = expires_at
        o.save()

    data = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    }

    r = requests.post('https://accounts.spotify.com/api/token', data=data, json=True)
    if r.status_code == 200:
        access_token = r.json()['access_token']
        expires_in = r.json()['expires_in']
        expires_at = datetime.datetime.now() + datetime.timedelta(seconds=expires_in - 60)
        print(expires_at)
        update_db_after_token_refresh()
        return access_token
    else:
        return '-1'


# Using Client Credentials Flow to retrieve a non-scoped access token to allow users(owners + guests) to search tracks
def get_search_token():
    endpoint = 'https://accounts.spotify.com/api/token'
    data = {
        'grant_type': 'client_credentials',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    }
    r = requests.post(endpoint, data=data)
    if r.status_code == 200:
        return r.json()['access_token']
    else:
        return '-1'


SEARCH_TOKEN = get_search_token()
