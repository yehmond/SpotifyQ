from django.contrib import admin
from .models import Owner,Queue
# Register your models here.


class QueueAdmin(admin.ModelAdmin):
    readonly_fields = ('queue_id',)


admin.site.register(Owner)
admin.site.register(Queue, QueueAdmin)
