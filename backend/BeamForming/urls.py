from django.urls import path
from . import views

urlpatterns = [
    path('calculate/', views.calculate, name='calculate'),
    path('scenarios/', views.scenario_list, name='scenario_list'),
    path('scenarios/<str:scenario_id>/', views.scenario_detail, name='scenario_detail'),
    path('scenarios/<str:scenario_id>/reset/', views.reset_scenario, name='reset_scenario'),
    path('scenarios/reset-all/', views.reset_all_scenarios, name='reset_all_scenarios'),
    path('media/', views.media_list, name='media_list'),
]

