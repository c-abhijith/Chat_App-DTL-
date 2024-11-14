# consumers.py

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, Message

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.room_name = self.scope['url_route']['kwargs']['room_name']
            self.room_group_name = f'room_{self.room_name}'

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            logger.info(f"WebSocket connected for room: {self.room_name}")
        except Exception as e:
            logger.error(f"WebSocket connection error: {str(e)}")
            raise

    async def disconnect(self, close_code):
        try:
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"WebSocket disconnected for room: {self.room_name} with code: {close_code}")
        except Exception as e:
            logger.error(f"WebSocket disconnect error: {str(e)}")

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        sender = text_data_json['sender']

        # Save message to database
        await self.create_message(room_name=self.room_name, sender=sender, message=message)

        # Broadcast message to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_message',
                'message': message,
                'sender': sender
            }
        )

    async def send_message(self, event):
        message = event['message']
        sender = event['sender']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'sender': sender
        }))

    @database_sync_to_async
    def create_message(self, room_name, sender, message):
        room = Room.objects.get(room_name=room_name)
        new_message = Message(room=room, sender=sender, message=message)
        new_message.save()
