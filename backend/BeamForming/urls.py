from django.urls import path
from . import views, mixer_views

urlpatterns = [
    # Existing beamforming endpoints
    path('calculate/', views.calculate, name='calculate'),
    path('scenarios/', views.scenario_list, name='scenario_list'),
    path('scenarios/<str:scenario_id>/', views.scenario_detail, name='scenario_detail'),
    path('scenarios/<str:scenario_id>/reset/', views.reset_scenario, name='reset_scenario'),
    path('scenarios/reset-all/', views.reset_all_scenarios, name='reset_all_scenarios'),
    path('media/', views.media_list, name='media_list'),

    # NEW Mixer endpoints
    path('mixer/upload/', mixer_views.upload_image, name='mixer_upload'),
    path('mixer/images/', mixer_views.list_images, name='mixer_list_images'),
    path('mixer/image/component/', mixer_views.get_image_component, name='mixer_get_component'),
    path('mixer/image/adjust/', mixer_views.adjust_image, name='mixer_adjust'),
    path('mixer/image/remove/', mixer_views.remove_image, name='mixer_remove'),
    path('mixer/mix/start/', mixer_views.start_mixing, name='mixer_start'),
    path('mixer/mix/progress/', mixer_views.get_mixing_progress, name='mixer_progress'),
    path('mixer/mix/cancel/', mixer_views.cancel_mixing, name='mixer_cancel'),
    path('mixer/session/clear/', mixer_views.clear_session, name='mixer_clear_session'),
]