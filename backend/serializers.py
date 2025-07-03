from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, 
    Technician, 
    OrdreImputation, 
    Task, 
    AdvancementNote, 
    Notification, 
    AdvancementNoteImage, 
    PreventiveTaskTemplate,
    generate_task_id_display
)
from django.utils import timezone
from django.db import transaction

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'name', 'role']

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.role = validated_data.get('role', instance.role)
        instance.save() 
        return instance

class TechnicianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Technician
        fields = ['id_technician', 'name']

class OrdreImputationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdreImputation
        fields = [
            'id_ordre', 
            'value', 
            'date_prochain_cycle_visite', 
            'date_derniere_visite_effectuee', 
            'dernier_cycle_visite_resultat',
            'total_hours_of_work', # This field can now be written
            'last_notified_threshold' 
        ]
        # Removed 'total_hours_of_work' from read_only_fields to allow updates
        read_only_fields = ('last_notified_threshold',)

class PreventiveTaskTemplateSerializer(serializers.ModelSerializer):
    ordre_imputation_value = serializers.CharField(source='ordre_imputation.value', read_only=True)
    class Meta:
        model = PreventiveTaskTemplate
        fields = [
            'id', 
            'title', 
            'description', 
            'trigger_hours', 
            'ordre_imputation', 
            'ordre_imputation_value' 
        ]
        extra_kwargs = {
            'ordre_imputation': {'write_only': True, 'required': True} 
        }

    def validate_trigger_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError("Trigger hours must be a positive integer.")
        return value

class CycleVisiteUpdateSerializer(serializers.Serializer):
    visite_acceptee = serializers.BooleanField(required=True, allow_null=False)
    date_prochaine_visite = serializers.DateField(required=True, format="%Y-%m-%d")
    date_visite_effectuee = serializers.DateField(required=True, format="%Y-%m-%d", help_text="Date when the current visit was actually performed/attempted.")

    def validate_date_prochaine_visite(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("La date de la prochaine visite ne peut pas être dans le passé.")
        return value

    def validate_date_visite_effectuee(self, value):
        if value > timezone.now().date():
             raise serializers.ValidationError("La date de la visite effectuée ne peut pas être dans le futur.")
        return value


class AdvancementNoteImageSerializer(serializers.ModelSerializer):
    image_url = serializers.ImageField(source='image', read_only=True)

    class Meta:
        model = AdvancementNoteImage
        fields = ['id', 'image_url', 'uploaded_at']

class AdvancementNoteSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField() 
    task_display_id = serializers.CharField(source='task.task_id_display', read_only=True)
    images = AdvancementNoteImageSerializer(many=True, read_only=True)

    class Meta:
        model = AdvancementNote
        fields = ['id', 'task', 'task_display_id', 'date', 'note', 'images', 'created_by', 'created_by_username', 'created_at']
        read_only_fields = ['created_by', 'created_at', 'created_by_username', 'task_display_id', 'images']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, "user") and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class TaskSerializer(serializers.ModelSerializer):
    advancement_notes = AdvancementNoteSerializer(many=True, read_only=True)
    assignedTo = serializers.CharField(source='assigned_to_profile.name', read_only=True, allow_null=True)
    assigned_to_profile_id = serializers.PrimaryKeyRelatedField(
        queryset=UserProfile.objects.filter(role='Chef de Parc'), 
        source='assigned_to_profile', 
        allow_null=True,
        required=False
    )
    technicien_ids = serializers.PrimaryKeyRelatedField(
        queryset=Technician.objects.all(), 
        source='techniciens',
        many=True, 
        write_only=True, 
        allow_null=True, 
        required=False 
    )
    technicien_names = serializers.SerializerMethodField(read_only=True)
    ordre_value = serializers.SlugRelatedField(
        slug_field='value', 
        queryset=OrdreImputation.objects.all(), 
        source='ordre', 
        allow_null=False, 
        required=True 
    )
    ordre = OrdreImputationSerializer(read_only=True) 
    status = serializers.CharField(read_only=True) 
    task_id_display = serializers.CharField(read_only=True)
    hours_of_work = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    
    # --- NEW & MODIFIED FIELDS ---
    start_time = serializers.TimeField(required=False, allow_null=True, format='%H:%M:%S', input_formats=['%H:%M:%S', '%H:%M'])
    estimated_hours = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    closed_at = serializers.DateTimeField(read_only=True, format='%Y-%m-%d %H:%M:%S')

    class Meta:
        model = Task
        fields = [
            'id', 'task_id_display', 'ordre', 'ordre_value', 'type', 'tasks', 
            'technicien_ids', 'technicien_names', 
            'epi', 'pdr', 'status', 
            'assigned_to_profile_id', 'assignedTo',
            'start_date', 'end_date', 'start_time',
            'estimated_hours', 'hours_of_work', 'closed_at',
            'advancement_notes', 
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'ordre', 
            'technicien_names', 'task_id_display', 'closed_at'
        ]

    def get_technicien_names(self, obj):
        return [technician.name for technician in obj.techniciens.all()]

    def validate(self, data):
        request = self.context.get('request')
        user_profile = request.user.profile if request and hasattr(request.user, 'profile') else None
        is_update = self.instance is not None
        
        start_date = data.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = data.get('end_date', getattr(self.instance, 'end_date', None))
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})

        if not user_profile:
             raise serializers.ValidationError("User profile not found.")

        if not is_update: 
            if user_profile.role == 'Admin':
                if not data.get('assigned_to_profile'): 
                    raise serializers.ValidationError({"assigned_to_profile_id": "Admin must assign the task to a Chef de Parc."})
            elif user_profile.role == 'Chef de Parc':
                if data.get('type') != 'preventif': # For non-preventive tasks created by Chef
                    if not data.get('techniciens'): 
                        raise serializers.ValidationError({"technicien_ids": "At least one technician is required."})
                    if not data.get('epi', '').strip(): 
                        raise serializers.ValidationError({"epi": "EPI details are required."})
                    if not data.get('pdr', '').strip():
                        raise serializers.ValidationError({"pdr": "PDR details are required."})
                    if data.get('hours_of_work') is None: # This is the new total OI hours
                        raise serializers.ValidationError({"hours_of_work": "New Total Operating Hours for OI is required."})
                    if data.get('estimated_hours') is None:
                        raise serializers.ValidationError({"estimated_hours": "Estimated hours are required when creating a task."})
        
        if is_update and self.instance and user_profile.role == 'Chef de Parc': 
            if self.instance.status == 'assigned': 
                techniciens_list = data.get('techniciens', None) 
                epi_value = data.get('epi', self.instance.epi or '').strip()
                pdr_value = data.get('pdr', self.instance.pdr or '').strip()
                hours_value = data.get('hours_of_work', self.instance.hours_of_work)
                estimated_hours_value = data.get('estimated_hours', self.instance.estimated_hours)
                has_techniciens_payload = 'techniciens' in data 
                
                if not ( (has_techniciens_payload and techniciens_list) or (not has_techniciens_payload and self.instance.techniciens.exists()) ):
                    raise serializers.ValidationError({"technicien_ids": "Technicians are required to move the task to 'In Progress'."})
                if not epi_value:
                    raise serializers.ValidationError({"epi": "EPI details are required to move the task to 'In Progress'."})
                if not pdr_value:
                    raise serializers.ValidationError({"pdr": "PDR details are required to move the task to 'In Progress'."})
                if hours_value is None: 
                    raise serializers.ValidationError({"hours_of_work": "New Total Operating Hours for OI is required to move the task to 'In Progress'."})
                elif isinstance(hours_value, (int, float)) and hours_value <= 0: 
                    raise serializers.ValidationError({"hours_of_work": "New Total Operating Hours for OI must be a positive number."})
                if estimated_hours_value is None:
                    raise serializers.ValidationError({"estimated_hours": "Estimated hours are required to move the task to 'In Progress'."})
        return data

    def create(self, validated_data):
        techniciens_data = validated_data.pop('techniciens', None)
        task = Task.objects.create(**validated_data)
        if techniciens_data:
            task.techniciens.set(techniciens_data)
        generate_task_id_display(task) 
        task.refresh_from_db() 
        return task

    def update(self, instance, validated_data):
        techniciens_data = validated_data.pop('techniciens', None)
        instance = super().update(instance, validated_data)
        if techniciens_data is not None: 
            instance.techniciens.set(techniciens_data)
        return instance

class NotificationSerializer(serializers.ModelSerializer):
    recipient_user_username = serializers.ReadOnlyField(source='recipient_user.username', allow_null=True)
    task_related_identifier = serializers.SerializerMethodField()
    ordre_imputation_related_value = serializers.ReadOnlyField(source='ordre_imputation_related.value', allow_null=True)
    notification_category_display = serializers.CharField(source='get_notification_category_display', read_only=True)


    class Meta:
        model = Notification
        fields = [
            'id', 'message', 'timestamp', 'read', 
            'recipient_type', 'recipient_role', 
            'recipient_user', 'recipient_user_username', 
            'task_related', 'task_related_identifier',
            'ordre_imputation_related', 'ordre_imputation_related_value', 
            'notification_category', 'notification_category_display'
        ]
        read_only_fields = ['timestamp', 'recipient_user_username', 'task_related_identifier', 'ordre_imputation_related_value', 'notification_category_display']


    def get_task_related_identifier(self, obj):
        if obj.task_related:
            return obj.task_related.task_id_display or obj.task_related.id
        return None

# --- Updated Serializer for Checklist Item ---
class ChecklistItemSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=500)
    is_completed = serializers.BooleanField()


class PreventiveChecklistSubmissionSerializer(serializers.Serializer):
    ordre_imputation_id = serializers.PrimaryKeyRelatedField(
        queryset=OrdreImputation.objects.all(),
        source='ordre_imputation_instance', # Renamed source for clarity
        help_text="ID de l'Ordre d'Imputation pour lequel la maintenance préventive a été effectuée."
    )
    checklist_items = serializers.ListField(
        child=ChecklistItemSerializer(), # Use the new item serializer
        min_length=1,
        help_text="Liste des tâches de la checklist avec leur statut de complétion."
    )
    notes = serializers.CharField(required=False, allow_blank=True, help_text="Notes additionnelles sur l'intervention.")
    # The new total hours for the OI will be submitted via a standard Task update if needed,
    # or when the Chef creates a regular task that updates the OI's hours.
    # This submission is purely for the checklist items.

    def validate_ordre_imputation_id(self, value):
        if not value:
            raise serializers.ValidationError("Ordre d'Imputation est requis.")
        return value # value is the OrdreImputation instance

    def create(self, validated_data):
        request = self.context.get('request')
        current_user = request.user
        current_user_profile = getattr(current_user, 'profile', None)

        ordre_imputation = validated_data['ordre_imputation_instance']
        checklist_items_data = validated_data['checklist_items']
        
        formatted_task_descriptions = []
        for item in checklist_items_data:
            prefix = "[X]" if item['is_completed'] else "[ ]"
            formatted_task_descriptions.append(f"{prefix} {item['description']}")
        
        task_description_summary = "Maintenance Préventive Effectuée (Checklist):\n" + "\n".join(formatted_task_descriptions)
        
        if validated_data.get('notes'):
            task_description_summary += f"\n\nNotes: {validated_data['notes']}"

        new_preventive_task_data = {
            'ordre': ordre_imputation,
            'type': 'preventif',
            'tasks': task_description_summary,
            'status': 'closed', # Submitted preventive checklists create a closed task
            'closed_at': timezone.now(), # Set closed_at automatically
            # hours_of_work for this specific preventive task is not set here.
            # The OI's total_hours_of_work is updated by other regular tasks.
        }
        
        if current_user_profile and current_user_profile.role == 'Chef de Parc':
            new_preventive_task_data['assigned_to_profile'] = current_user_profile
        # If Admin submits, assigned_to_profile can be null or they can assign it if the payload allows
        # For now, if Admin submits, it's just recorded without specific assignment via this flow.

        task = Task.objects.create(**new_preventive_task_data)
        generate_task_id_display(task)
        task.refresh_from_db()

        # Notify Admins that preventive task was submitted
        admin_profiles = UserProfile.objects.filter(role='Admin')
        submitter_name = current_user_profile.name if current_user_profile else current_user.username
        
        for admin_profile in admin_profiles:
            # Avoid notifying the admin if they are the one submitting
            if admin_profile.user != current_user: 
                Notification.objects.create(
                    message=f"Checklist préventive pour OI '{ordre_imputation.value}' soumise par {submitter_name}. Tâche: {task.task_id_display}",
                    recipient_type='UserInRole',
                    recipient_role='Admin',
                    recipient_user=admin_profile.user,
                    notification_category='TASK', # This notification is about the newly created task
                    task_related=task # Link to the new task
                )
        return task


# --- Admin User Management Serializers ---
class AdminUserListSerializer(serializers.ModelSerializer):
    profile_name = serializers.CharField(source='profile.name', read_only=True, default=None)
    profile_role = serializers.CharField(source='profile.role', read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'profile_name', 'profile_role', 'is_active', 'date_joined', 'last_login'
        ]
        extra_kwargs = {
            'profile_name': {'allow_null': True}, 
            'profile_role': {'allow_null': True}
        }


class AdminUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    
    profile_name = serializers.CharField(max_length=255, help_text="Full name for the user's profile.")
    profile_role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, help_text="Role for the user's profile.")
    is_active = serializers.BooleanField(default=True, required=False)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_active=validated_data.get('is_active', True)
        )
        UserProfile.objects.create(
            user=user,
            name=validated_data['profile_name'],
            role=validated_data['profile_role']
        )
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8, style={'input_type': 'password'})
    is_active = serializers.BooleanField(required=False)

    profile_name = serializers.CharField(source='profile.name', max_length=255, required=False)
    profile_role = serializers.ChoiceField(source='profile.role', choices=UserProfile.ROLE_CHOICES, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'password', 
            'profile_name', 'profile_role', 'is_active'
        ]
        read_only_fields = ['id', 'username'] 

    def validate_email(self, value):
        if self.instance and User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("This email address is already in use by another user.")
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
             if hasattr(instance, attr):
                setattr(instance, attr, value)

        if password:
            instance.set_password(password)
        instance.save()

        if profile_data and hasattr(instance, 'profile'): 
            profile = instance.profile
            profile.name = profile_data.get('name', profile.name)
            profile.role = profile_data.get('role', profile.role)
            profile.save()
        elif profile_data and not hasattr(instance, 'profile'): 
             UserProfile.objects.create(
                user=instance,
                name=profile_data.get('name'),
                role=profile_data.get('role')
            )
            
        return instance