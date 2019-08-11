import json
import datetime
from channels.consumer import AsyncConsumer
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from .models import Queue, Owner, update_spotify_playlist, get_current_track


class QueueConsumer(AsyncConsumer):
    async def websocket_connect(self, event):
        print('ws connected', event)
        # gets pin from the url parameter
        self.pin = self.scope['url_route']['kwargs']['pin']
        # add group uniquely identified by the pin
        await self.channel_layer.group_add(self.pin, self.channel_name)
        await self.send({
            'type': 'websocket.accept'
        })

    async def websocket_receive(self, event):
        # db_queue = await self.get_queue(pin)
        print('ws received ', event)
        raw = event.get('text')
        if raw is not None:
            d = json.loads(raw)
            if d['message'] == 'add_to_queue':
                played_tracks = await self.update_db(pin=self.pin, curr_track_id=d['curr_track_id'])
                await self.create_queue(
                    pin=d['pin'],
                    track_name=d['track_name'],
                    track_id=d['track_id'],
                    artists=d['artists'],
                    album_name=d['album_name'],
                    explicit=d['explicit'],
                    duration_ms=d['duration_ms'],
                )
                data = {
                    'type': 'pin.message',
                    'message': 'add_to_queue',
                    'track_name': d['track_name'],
                    'track_id': d['track_id'],
                    'album_name': d['album_name'],
                    'explicit': d['explicit'],
                    'duration_ms': d['duration_ms'],
                    'artists': d['artists'],
                    'played_tracks': played_tracks
                }
                # Broadcasts the message event to be sent
                await self.channel_layer.group_send(self.pin, data)

            elif d['message'] == 'update_current_playback':
                print('trying to update_current_playback')
                can_update = await self.check_last_playback_update(self.pin)
                if can_update:
                    print('actually updating')
                    o = Owner.objects.get(pin=self.pin)
                    data = get_current_track(o.access_token)
                    data['type'] = 'pin.update_current_playback'
                    data['message'] = 'update_current_playback'
                    await self.channel_layer.group_send(self.pin, data)

    # Handling function that receives events and actually sends them as websocket messages
    async def pin_message(self, event):
        print('ws message', event)
        await self.send({
            'type': 'websocket.send',
            'text': json.dumps({
                'message': event['message'],
                'track_name': event['track_name'],
                'artists': event['artists'],
            })
        })

    async def pin_update_current_playback(self, event):
        print('update_current_playback', event)
        await self.send({
            'type': 'websocket.send',
            'text': json.dumps({
                'message': event['message'],
                'track_name': event['track_name'],
                'artists': event['artists'],
                'album_name': event['album_name'],
                'cover': event['cover'],
                'progress_ms': event['progress_ms'],
                'is_playing': event['is_playing'],
                'timestamp': event['timestamp'],
                'track_id': event['track_id'],
            })
        })

    async def websocket_disconnect(self, event):
        print('ws disconnected', event)

    @database_sync_to_async
    def get_queue(self, pin):
        return Queue.objects.filter(pin=pin)

    @database_sync_to_async
    def create_queue(self, pin, track_name, track_id, artists, album_name, explicit, duration_ms):
        try:
            owner = Owner.objects.get(pin=pin)
            q = Queue.objects.create(owner=owner,
                                     pin=pin,
                                     track_name=track_name,
                                     track_id=track_id,
                                     artists=artists,
                                     album_name=album_name,
                                     explicit=explicit,
                                     duration_ms=duration_ms,
                                     add_time=datetime.datetime.now())
            q.save()
            update_spotify_playlist(owner, owner.playlist_uri, owner.access_token)
            return q

        except Owner.DoesNotExist:
            return None

    @database_sync_to_async
    def update_db(self, pin, curr_track_id):
        try:
            owner = Owner.objects.get(pin=pin)
            try:
                curr_track = Queue.objects.filter(pin=pin).filter(track_id=curr_track_id)[0]
                added_older_and_more_votes = Queue.objects.filter(add_time__lt=curr_track.add_time).filter(votes__gte=curr_track.votes)
                tmp = list(added_older_and_more_votes)
                added_older_and_more_votes.delete()
                return tmp
            except IndexError:
                return None
        except Queue.DoesNotExist:
            return None


    @database_sync_to_async
    def check_last_playback_update(self, pin):
        try:
            owner = Owner.objects.get(pin=pin)
            if owner.last_update + datetime.timedelta(seconds=60) < datetime.datetime.now():
                owner.last_update = datetime.datetime.now()
                owner.save()
                return True
            else:
                return False
        except Owner.DoesNotExist:
            return False

