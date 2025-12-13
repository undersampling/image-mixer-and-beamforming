from django.urls import path
from ImageMixer import views

urlpatterns = [
    path('upload-image/', views.upload_image, name='upload_image'),
    path('image/<int:image_index>/', views.get_image, name='get_image'),
    path('image/<int:image_index>/component/<str:component_type>/', views.get_image_component, name='get_image_component'),
    path('mix/', views.mix_images, name='mix_images'),
    path('adjust-brightness-contrast/', views.adjust_brightness_contrast, name='adjust_brightness_contrast'),
    path('reset-brightness-contrast/', views.reset_brightness_contrast, name='reset_brightness_contrast'),
    path('set-image-mode/', views.set_image_mode, name='set_image_mode'),
    path('set-mixing-mode/', views.set_mixing_mode, name='set_mixing_mode'),
]

