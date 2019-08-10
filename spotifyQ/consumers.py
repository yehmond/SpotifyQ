import json
import datetime
from channels.consumer import AsyncConsumer
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from .models import Queue, Owner, add_to_playlist


class QueueConsumer(AsyncConsumer):
    async def websocket_connect(self, event):
        print('connected', event)
        # gets pin from the url parameter
        self.pin = self.scope['url_route']['kwargs']['pin']
        # add group uniquely identified by the pin
        await self.channel_layer.group_add(self.pin, self.channel_name)
        await self.send({
            'type': 'websocket.accept'
        })

    async def websocket_receive(self, event):
        # db_queue = await self.get_queue(pin)
        print('received ', event)
        raw = event.get('text')
        if raw is not None:
            d = json.loads(raw)
            await self.create_queue(
                pin=d['pin'],
                track_name=d['track_name'],
                track_id=d['track_id'],
                artists=d['artists'],
                album_name=d['album_name'],
                explicit=d['explicit'],
                duration_ms=d['duration_ms']
            )
            data = {
                'type': 'pin.message',
                'message': 'add_track',
                'track_name': d['track_name'],
                'track_id': d['track_id'],
                'album_name': d['album_name'],
                'explicit': d['explicit'],
                'duration_ms': d['duration_ms'],
                'artists': d['artists'],
            }

            # Broadcasts the message event to be sent
            await self.channel_layer.group_send(self.pin, data)

    # Handling function that receives events and actually sends them as websocket messages
    async def pin_message(self, event):
        print('message', event)
        await self.send({
            'type': 'websocket.send',
            'text': json.dumps({
                'message': event['message'],
                'track_name': event['track_name'],
                'artists': event['artists'],
            })
        })

    async def websocket_disconnect(self, event):
        print('disconnected', event)

    @database_sync_to_async
    def get_queue(self, pin):
        return Queue.objects.filter(pin=pin)

    @database_sync_to_async
    def create_queue(self, pin, track_name, track_id, artists, album_name, explicit, duration_ms ):
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
            add_to_playlist(owner, owner.playlist_uri, owner.access_token)
            return q

        except Owner.DoesNotExist:
            return None

