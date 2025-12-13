"""config URL Configuration"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('BeamForming.urls')),
    path('api/mixer/', include('ImageMixer.urls')),
]

