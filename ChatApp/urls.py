from . import views
from django.urls import path

urlpatterns = [
    path('', views.CreateRoom, name='create-room'),
    path('ws/<str:room_name>/<str:username>/', views.MessageView, name='room'),
]