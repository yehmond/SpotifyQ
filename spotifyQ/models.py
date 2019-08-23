import os
import uuid
from random import randrange
import json

import requests
from django.core.exceptions import ValidationError
from django.core.serializers import serialize
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
    last_update = models.DateTimeField(default=datetime.datetime.now)
    device_id = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return str(self.owner_id)


class Queue(models.Model):
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE)
    queue_id = models.CharField(max_length=255, primary_key=False)
    pin = models.CharField(max_length=4)
    track_name = models.TextField()
    track_id = models.CharField(max_length=25)
    artists = models.CharField(max_length=255)
    album_name = models.CharField(max_length=255)
    explicit = models.BooleanField()
    duration_ms = models.IntegerField()
    votes = models.IntegerField(default=0, primary_key=False)
    add_time = models.DateTimeField()

    def __str__(self):
        return str(str(self.owner) + ' - ' + self.track_name)

    class Meta:
        ordering = ('-votes', 'add_time')


# class PreviouslyPlayed(models.Model):
#     owner = models.ForeignKey(Owner, on_delete=models.CASCADE)


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
    possible = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'

    for i in range(0, 4):
        pin += possible[randrange(0, len(possible))]

    return pin


def try_create_owner(owner_id, access_token, refresh_token, expires_at):
    # if Owner.objects.filter(owner_id=owner_id).exists():
    #     o = Owner.objects.get(owner_id=owner_id)
    #     o.access_token = access_token
    #     o.refresh_token = refresh_token
    #     if datetime.datetime.now() > o.last_login + datetime.timedelta(seconds=21600):
    #         o.pin = generate_pin()
    #     o.last_login = datetime.datetime.now()
    #     o.save()
    #     return False
    # else:
    #     create_owner(owner_id, access_token, refresh_token, expires_at)
    #     return True
    if Owner.objects.filter(owner_id=owner_id).exists():
        Owner.objects.get(owner_id=owner_id).delete()

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
                             pin=generate_pin(),)
    o.save()


def create_playlist(owner_id, access_token, expires_at):
    """Creates a playlist on the owner's Spotify Account to be used for queueing"""
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


def add_song_to_queue(pin, track_name, track_id, artists, album_name, explicit, duration_ms):
    """
    Adds song to queue in database with the following attributes.
    :param pin: Pin that links to the owner that it belongs to
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


def upvote_track(queue_id):
    try:
        q = Queue.objects.get(queue_id=queue_id)
        q.votes = models.F('votes') + 1
        q.save()
    except Queue.DoesNotExist:
        return False
    except ValidationError:
        return False


def downvote_track(queue_id):
    try:
        q = Queue.objects.get(queue_id=queue_id)
        q.votes = models.F('votes') - 1
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
    else:
        j = r.json()
        track = {
            'track_name': j['item']['name'],
            'album_name': j['item']['album']['name'],
            'duration_ms': j['item']['duration_ms'],
            'artists': ', '.join([a['name'] for a in j['item']['artists']]),
            'cover': j['item']['album']['images'][0]['url'],
            'progress_ms': j['progress_ms'],
            'is_playing': j['is_playing'],
            'timestamp': j['timestamp'],
            'track_id': j['item']['id'],
        }
        return track


def get_homepage_context(**kwargs):
    """
    Returns homepage context to be displayed after owner or guest are successfully authenticated.
    :param kwargs: owner_id or pin
    :return: Returns context containing track_name, cover, artists, pin, to be displayed on the homepage.
             Returns None if owner has terminated queue session.
    """
    def update_context(access_token, expires_at):
        context = get_current_track(access_token)
        context['pin'] = o.pin
        get_queue(context, o.owner_id)
        # adds access token to owner.html so Spotify WebPlayer can be initiated with it
        if 'owner_id' in kwargs:
            context['access_token'] = access_token
            context['expires_at'] = expires_at.timestamp() * 1000
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
            o = Owner.objects.get(refresh_token=refresh_token)
            if access_token == '-1':
                return '-1'
        return update_context(o.access_token, o.expires_at)

    except Owner.DoesNotExist:
        return '-1'


def get_queue(context, owner_id):
    q = Queue.objects.filter(owner_id=owner_id).order_by('-votes', 'add_time')
    context['queue'] = list(q)
    context['existing_queue'] = serialize('json', q)


def play_next_track(pin, device_id):
    try:
        o = Owner.objects.get(pin=pin)
        if o.expires_at <= datetime.datetime.now():
            refresh_token = Owner.objects.get(pin=o.pin).refresh_token
            o.access_token = refresh_access_token(refresh_token, o.owner_id)

        headers = {
            'Authorization': 'Bearer ' + o.access_token
        }
        params = {
            'device_id': device_id
        }
        queue = o.queue_set.all()
        if len(queue) > 0:
            data = {
                'uris': [f'spotify:track:{queue.first().track_id}']
            }
            r = requests.put('https://api.spotify.com/v1/me/player/play', headers=headers, json=data, params=params)
            queue_id = queue.first().queue_id
            return queue_id
        else:
            return '-1'
    except Owner.DoesNotExist:
        return '-1'


def play_nothing(pin, device_id):
    try:
        o = Owner.objects.get(pin=pin)
        if o.expires_at <= datetime.datetime.now():
            refresh_token = Owner.objects.get(pin=o.pin).refresh_token
            o.access_token = refresh_access_token(refresh_token, o.owner_id)

        headers = {
            'Authorization': 'Bearer ' + o.access_token
        }
        params = {
            'device_id': device_id
        }
        data = {
            'context_uri': 'spotify:playlist:5FFBlewlMqE88NrZxMpTgT'
        }
        r = requests.put('https://api.spotify.com/v1/me/player/play', headers=headers, json=data, params=params)
        print(r.content)
    except Owner.DoesNotExist:
        return '-1'


def delete_current_track(queue_id):
    try:
        Queue.objects.filter(queue_id=queue_id).delete()
        return True
    except Owner.DoesNotExist:
        return False


def transfer_playback(access_token, device_id):
    device_id = '140f60fa0edd019c127f1578bbc06af5043e07fb'
    endpoint = 'https://api.spotify.com/v1/me/player'
    headers = {
        'Authorization': 'Bearer ' + access_token
    }
    data = {
        'device_ids': [device_id],
        'play': True
    }
    r = requests.put(endpoint, headers=headers, json=data)
    print(r.text)
    if r.status_code == 204:
        print('ok')
        return True
    else:
        return False


def fetch_devices(access_token):
    endpoint = 'https://api.spotify.com/v1/me/player/devices'
    headers = {
        'Authorization': 'Bearer ' + access_token
    }
    r = requests.get(endpoint, headers=headers)
    return r.json()


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




