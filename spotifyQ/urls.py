from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login, name='login'),
    path('callback/', views.callback, name='callback'),
    path('error/<str:error_message>', views.error, name='error'),
    path('logout/', views.logout, name='logout'),
    path('owner/', views.owner, name='owner'),
    path('guest/', views.guest, name='guest'),
    path('test/', views.test, name='test'),
    path('verify/', views.verify, name='verify'),
    path('queue/add/', views.queue_add, name='queue_add'),
    path('queue/upvote/', views.queue_upvote, name='queue_upvote'),
    path('queue/downvote/', views.queue_downvote, name='queue_downvote'),
    path('queue/next/', views.queue_next, name='queue_next'),
    path('queue/played/', views.queue_played, name='queue_played'),
    path('token/', views.search_token, name='search_token'),
    path('search/', views.search_tracks, name='search_track'),

]
