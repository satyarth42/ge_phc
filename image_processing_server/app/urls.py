from django.urls import path
from . import views


urlpatterns = [
    path('image_process', views.process, name = 'img_pro')
]
