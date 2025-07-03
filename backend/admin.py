from django.contrib import admin
from .models import (
    UserProfile, 
    Technician, 
    OrdreImputation, 
    Task, 
    AdvancementNote, 
    Notification, 
    AdvancementNoteImage,
    PreventiveTaskTemplate # New import
)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'role')
    search_fields = ('user__username', 'name', 'role')
    list_filter = ('role',)

@admin.register(Technician)
class TechnicianAdmin(admin.ModelAdmin):
    list_display = ('id_technician', 'name')
    search_fields = ('id_technician', 'name')

@admin.register(OrdreImputation)
class OrdreImputationAdmin(admin.ModelAdmin):
    list_display = (
        'id_ordre', 
        'value', 
        'total_hours_of_work', # New field
        'last_notified_threshold', # New field
        'date_prochain_cycle_visite', 
        'date_derniere_visite_effectuee', 
        'dernier_cycle_visite_resultat'
    )
    search_fields = ('id_ordre', 'value')
    list_filter = ('date_prochain_cycle_visite', 'dernier_cycle_visite_resultat', 'last_notified_threshold')
    readonly_fields = (
        'date_derniere_visite_effectuee', 
        'total_hours_of_work', # Make it read-only as it's calculated
        'last_notified_threshold' # Make it read-only as it's system-set
    ) 

@admin.register(PreventiveTaskTemplate)
class PreventiveTaskTemplateAdmin(admin.ModelAdmin):
    list_display = ('title', 'ordre_imputation', 'trigger_hours', 'description_preview')
    search_fields = ('title', 'description', 'ordre_imputation__value')
    list_filter = ('ordre_imputation', 'trigger_hours')
    autocomplete_fields = ['ordre_imputation']

    def description_preview(self, obj):
        return (obj.description[:75] + '...') if len(obj.description) > 75 else obj.description
    description_preview.short_description = 'Description Preview'


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'task_id_display', 
        'id', 
        'ordre', 'type', 'status', 
        'assigned_to_profile_name', 'display_techniciens', 
        'start_date', 'start_time', 'end_date',
        'estimated_hours', 'hours_of_work', 'closed_at',
        'created_at', 'updated_at'
    )
    search_fields = ('task_id_display', 'id', 'ordre__value', 'tasks', 'assigned_to_profile__name', 'techniciens__name')
    list_filter = (
        'status', 'type', 'assigned_to_profile', 
        'start_date', 'closed_at',
        'created_at'
    )
    autocomplete_fields = ['ordre', 'assigned_to_profile']
    filter_horizontal = ('techniciens',) 
    readonly_fields = ('task_id_display', 'created_at', 'updated_at', 'closed_at')

    def assigned_to_profile_name(self, obj):
        return obj.assigned_to_profile.name if obj.assigned_to_profile else None
    assigned_to_profile_name.short_description = 'Assigned To (Chef)'

    def display_techniciens(self, obj):
        return ", ".join([tech.name for tech in obj.techniciens.all()])
    display_techniciens.short_description = 'Technicians'

class AdvancementNoteImageInline(admin.TabularInline):
    model = AdvancementNoteImage
    extra = 1 
    readonly_fields = ('uploaded_at',)

@admin.register(AdvancementNote)
class AdvancementNoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'task_identifier_display', 'date', 'created_by_username_display', 'note_preview', 'image_count') 
    search_fields = ('task__task_id_display', 'task__id', 'note', 'created_by__username')
    list_filter = ('date', 'created_by')
    autocomplete_fields = ['task', 'created_by']
    readonly_fields = ('created_at',)
    inlines = [AdvancementNoteImageInline]

    def task_identifier_display(self, obj):
        return obj.task.task_id_display if obj.task and obj.task.task_id_display else obj.task.id
    task_identifier_display.short_description = 'Task Identifier' 
    
    def created_by_username_display(self, obj):
        return obj.created_by.username if obj.created_by else obj.created_by_username 
    created_by_username_display.short_description = 'Created By'

    def note_preview(self, obj):
        return (obj.note[:75] + '...') if len(obj.note) > 75 else obj.note
    note_preview.short_description = 'Note Preview'

    def image_count(self, obj):
        return obj.images.count()
    image_count.short_description = 'Images'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'message_preview', 
        'notification_category', 
        'recipient_type', 'recipient_role', 'recipient_user_username', 
        'task_related_identifier_display', 
        'ordre_imputation_related_value_display', 
        'read', 'timestamp'
    )
    search_fields = (
        'message', 'recipient_role', 'recipient_user__username', 
        'task_related__task_id_display', 'task_related__id',
        'ordre_imputation_related__value' 
    )
    list_filter = ('read', 'notification_category', 'recipient_type', 'recipient_role', 'timestamp') 
    autocomplete_fields = ['recipient_user', 'task_related', 'ordre_imputation_related'] 
    readonly_fields = ('timestamp',)

    def message_preview(self, obj):
        return (obj.message[:75] + '...') if len(obj.message) > 75 else obj.message
    message_preview.short_description = 'Message'
    
    def recipient_user_username(self, obj):
        return obj.recipient_user.username if obj.recipient_user else None
    recipient_user_username.short_description = 'Recipient User'

    def task_related_identifier_display(self, obj):
        if obj.task_related:
            return obj.task_related.task_id_display or obj.task_related.id
        return None
    task_related_identifier_display.short_description = 'Task Identifier'

    def ordre_imputation_related_value_display(self, obj):
        if obj.ordre_imputation_related:
            return obj.ordre_imputation_related.value
        return None
    ordre_imputation_related_value_display.short_description = 'OI Related'