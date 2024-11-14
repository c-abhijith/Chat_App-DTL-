# consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.room_name = self.scope['url_route']['kwargs']['room_name']
            self.room_group_name = f'chat_{self.room_name}'
            print(f"Attempting to connect to room: {self.room_name}")

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            print(f"Successfully connected to room: {self.room_name}")
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Connected to chat room',
                'room': self.room_name
            }))
            
        except Exception as e:
            print(f"Connection error: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        try:
            print(f"Disconnecting from room: {self.room_name}")
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        except Exception as e:
            print(f"Disconnect error: {str(e)}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                return
                
            message = data.get('message', '')
            sender = data.get('sender', '')

            if message and sender:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                        'sender': sender
                    }
                )
                print(f"Message sent to room {self.room_name} from {sender}")
        except Exception as e:
            print(f"Error in receive: {str(e)}")

    async def chat_message(self, event):
        try:
            await self.send(text_data=json.dumps({
                'message': event['message'],
                'sender': event['sender']
            }))
        except Exception as e:
            print(f"Error in chat_message: {str(e)}")
