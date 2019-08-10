from django.contrib import admin
from .models import Owner,Queue
# Register your models here.


class QueueAdmin(admin.ModelAdmin):
    readonly_fields = ('_uuid',)


admin.site.register(Owner)
admin.site.register(Queue, QueueAdmin)
