from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path('<str:pin>', consumers.QueueConsumer),
]