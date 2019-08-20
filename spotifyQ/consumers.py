import datetime
import json

from channels.consumer import AsyncConsumer
from channels.db import database_sync_to_async

from .models import Queue, Owner


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
        print('ws received ', event)
        raw = event.get('text')
        if raw is not None:
            d = json.loads(raw)
            # Add track to queue
            if d['message'] == 'add_track_to_queue':
                await self.add_track_to_queue(
                    pin=d['pin'],
                    track_name=d['track_name'],
                    track_id=d['track_id'],
                    artists=d['artists'],
                    album_name=d['album_name'],
                    explicit=d['explicit'],
                    duration_ms=d['duration_ms'],
                    queue_id=d['queue_id'],
                )
                data = {
                    'type': 'pin.add_track_to_queue',
                    'message': 'add_track_to_queue',
                    'track_name': d['track_name'],
                    'track_id': d['track_id'],
                    'album_name': d['album_name'],
                    'explicit': d['explicit'],
                    'duration_ms': d['duration_ms'],
                    'artists': d['artists'],
                    'queue_id': d['queue_id'],
                    'add_time': d['add_time']
                }
            elif d['message'] == 'update_current_playback':
                data = {
                    'type': 'pin.update_current_playback',
                    'message': 'update_current_playback',
                    'track_id': d['track_id'],
                    'track_name': d['track_name'],
                    'artists': d['artists'],
                    'album_name': d['album_name'],
                    'cover': d['cover'],
                    'progress_ms': d['progress_ms'],
                    'duration_ms': d['duration_ms'],
                    'paused': d['paused'],
                }
            elif d['message'] == 'update_vote':
                data = {
                    'type': 'pin.update_vote',
                    'message': 'update_vote',
                    'queue_id': d['queue_id'],
                    'votes': d['votes'],
                }
            else:
                # d['message'] == 'next_song':
                data = {
                    'type': 'pin.next_song',
                    'message': 'next_song',
                }

            # Broadcasts the message event to be sent
            await self.channel_layer.group_send(self.pin, data)

    # Handling function that broadcasts whenever someone adds a track to queue
    async def pin_add_track_to_queue(self, event):
        print('ws message', event)
        await self.send({
            'type': 'websocket.send',
            'text': json.dumps({
                'message': event['message'],
                'track_name': event['track_name'],
                'artists': event['artists'],
                'queue_id': event['queue_id'],
                'add_time': event['add_time']
            })
        })

    # Handle function that broadcasts updating current playing track
    async def pin_update_current_playback(self, event):
        print('update_current_playback', event)
        await self.send({
            'type': 'websocket.send',
            'text': json.dumps({
                'message': event['message'],
                'track_id': event['track_id'],
                'track_name': event['track_name'],
                'artists': event['artists'],
                'album_name': event['album_name'],
                'cover': event['cover'],
                'progress_ms': event['progress_ms'],
                'duration_ms': event['duration_ms'],
                'paused': event['paused']
            })
        })

    async def pin_update_vote(self, event):
        await self.send({
            'type': 'websocket.send',
            'text': json.dumps({
                'message': event['message'],
                'queue_id': event['queue_id'],
                'votes': event['votes'],
            })
        })

    async def pin_next_song(self, event):
        await self.send({
            'type': 'websocket.send',
            'text': json.dumps({
                'message': event['message'],
            })
        })

    async def websocket_disconnect(self, event):
        print('ws disconnected', event)

    @database_sync_to_async
    def get_queue(self, pin):
        return Queue.objects.filter(pin=pin)

    @database_sync_to_async
    def add_track_to_queue(self, pin, track_name, track_id, artists, album_name, explicit, duration_ms, queue_id):
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
                                     add_time=datetime.datetime.now(),
                                     queue_id=queue_id)
            q.save()
            return q

        except Owner.DoesNotExist:
            return '-1'
