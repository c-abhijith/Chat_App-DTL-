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

            logger.info(f"Attempting to connect to room: {self.room_name}")
            
            try:
                room = await self.get_room()
                if not room:
                    logger.error(f"Room {self.room_name} does not exist")
                    await self.close()
                    return
            except Exception as e:
                logger.error(f"Error checking room: {str(e)}")
                await self.close()
                return

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            logger.info(f"Successfully connected to room: {self.room_name}")
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        try:
            logger.info(f"Disconnecting from room: {self.room_name} with code: {close_code}")
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        except Exception as e:
            logger.error(f"Disconnect error: {str(e)}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                return

            message = data.get('message')
            sender = data.get('sender')

            if not message or not sender:
                logger.warning("Received message with missing data")
                return

            await self.create_message(
                room_name=self.room_name,
                sender=sender,
                message=message
            )

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender': sender
                }
            )
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}")

    async def chat_message(self, event):
        try:
            await self.send(text_data=json.dumps({
                'message': event['message'],
                'sender': event['sender']
            }))
        except Exception as e:
            logger.error(f"Error in chat_message: {str(e)}")

    @database_sync_to_async
    def create_message(self, room_name, sender, message):
        try:
            room = Room.objects.get(room_name=room_name)
            Message.objects.create(room=room, sender=sender, message=message)
        except Room.DoesNotExist:
            logger.error(f"Room {room_name} not found")
        except Exception as e:
            logger.error(f"Error creating message: {str(e)}")

    @database_sync_to_async
    def get_room(self):
        try:
            return Room.objects.get(room_name=self.room_name)
        except Room.DoesNotExist:
            return None
