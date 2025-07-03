from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
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
    generate_task_id_display,
    check_and_trigger_preventive_tasks
)
from .serializers import (
    UserProfileSerializer, 
    TechnicianSerializer, 
    OrdreImputationSerializer,
    TaskSerializer, 
    AdvancementNoteSerializer, 
    NotificationSerializer,
    AdminUserListSerializer, 
    AdminUserCreateSerializer, 
    AdminUserUpdateSerializer,
    CycleVisiteUpdateSerializer,
    PreventiveTaskTemplateSerializer, 
    PreventiveChecklistSubmissionSerializer
)
from rest_framework import serializers as drf_serializers_module 
from rest_framework import exceptions as drf_exceptions
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, OR # Ensure OR is imported
from django.utils import timezone
from django.db.models import Q
from django.db import transaction
import traceback 

from django.http import HttpResponse
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import inch
import io
import os

# --- Custom Renderer for PDF (to help DRF content negotiation) ---
from rest_framework.renderers import BaseRenderer, JSONRenderer

class PassthroughPDFRenderer(BaseRenderer):
    media_type = 'application/pdf'
    format = 'pdf'
    charset = None 
    def render(self, data, media_type=None, renderer_context=None):
        if isinstance(data, HttpResponse):
            return data
        if renderer_context and 'response' in renderer_context and renderer_context['response'].status_code == 204:
             return b'' 
        return b"Error: PDF content was not a direct HttpResponse."


# --- Helper function to create notifications ---
def create_notification(message, recipient_type, recipient_role, notification_category, 
                        recipient_user_id=None, task_id=None, ordre_imputation_id=None):
    try:
        notif_data = {
            'message': message,
            'recipient_type': recipient_type,
            'recipient_role': recipient_role,
            'notification_category': notification_category,
        }
        
        if recipient_user_id:
            user_instance = User.objects.get(id=recipient_user_id)
            notif_data['recipient_user'] = user_instance
        
        if task_id:
            task_instance = Task.objects.get(id=task_id)
            notif_data['task_related'] = task_instance
        
        if ordre_imputation_id:
            oi_instance = OrdreImputation.objects.get(id_ordre=ordre_imputation_id)
            notif_data['ordre_imputation_related'] = oi_instance
            
        Notification.objects.create(**notif_data)
    except User.DoesNotExist:
        print(f"Error creating notification: User with ID {recipient_user_id} does not exist.")
    except Task.DoesNotExist:
        print(f"Error creating notification: Task with ID {task_id} does not exist.")
    except OrdreImputation.DoesNotExist:
        print(f"Error creating notification: OrdreImputation with ID {ordre_imputation_id} does not exist.")
    except Exception as e:
        print(f"Error creating notification: {e}")

# --- Custom Permissions ---
class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'Admin'

class IsChefDeParcUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'Chef de Parc'

class IsOwnerOrAdminForTask(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated or not hasattr(request.user, 'profile'):
            return False
        if request.user.profile.role == 'Admin':
            return True
        if request.user.profile.role == 'Chef de Parc':
            if isinstance(obj, Task) and obj.assigned_to_profile:
                 return obj.assigned_to_profile == request.user.profile
            return False
        return False

class IsOwnerOrAdminForAdvancementNote(permissions.BasePermission):
    def has_object_permission(self, request, view, obj): 
        if not request.user or not request.user.is_authenticated or not hasattr(request.user, 'profile'):
            return False
        if request.user.profile.role == 'Admin':
            return True
        if request.user.profile.role == 'Chef de Parc':
            return obj.task and obj.task.assigned_to_profile == request.user.profile
        return False

# --- ViewSets ---
class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all().select_related('user')
    serializer_class = UserProfileSerializer 
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        if not hasattr(request.user, 'profile'):
            return Response({"detail": "User profile not found."}, status=status.HTTP_404_NOT_FOUND)
        profile = request.user.profile
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='by-role/(?P<role_name>[^/.]+)', permission_classes=[IsAdminUser])
    def by_role(self, request, role_name=None):
        valid_roles = [r[0] for r in UserProfile.ROLE_CHOICES]
        if role_name not in valid_roles:
            return Response({"error": "Invalid role specified. Valid roles are: " + ", ".join(valid_roles)}, status=status.HTTP_400_BAD_REQUEST)
        
        profiles = UserProfile.objects.filter(role=role_name).select_related('user')
        serializer = self.get_serializer(profiles, many=True)
        return Response(serializer.data)

class TechnicianViewSet(viewsets.ModelViewSet):
    queryset = Technician.objects.all()
    serializer_class = TechnicianSerializer 
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class OrdreImputationViewSet(viewsets.ModelViewSet):
    queryset = OrdreImputation.objects.all()
    serializer_class = OrdreImputationSerializer 
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'destroy']:
            return [IsAdminUser()]
        if self.action == 'partial_update':
            return [OR(IsAdminUser(), IsChefDeParcUser())]
        if self.action == 'update_cycle_visite': 
            return [IsChefDeParcUser()]
        return [IsAuthenticated()]

    def partial_update(self, request, *args, **kwargs):
        if hasattr(request.user, 'profile') and request.user.profile.role == 'Chef de Parc':
            allowed_fields = {'total_hours_of_work'}
            if not set(request.data.keys()).issubset(allowed_fields):
                return Response(
                    {'error': "As a Chef de Parc, you can only update the 'total_hours_of_work' field."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        response = super().partial_update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK and 'total_hours_of_work' in request.data:
            instance = self.get_object()
            check_and_trigger_preventive_tasks(instance)

        return response

    @action(detail=True, methods=['post'], url_path='update-cycle-visite', permission_classes=[IsChefDeParcUser])
    def update_cycle_visite(self, request, pk=None):
        try:
            ordre_imputation = self.get_object() 
        except OrdreImputation.DoesNotExist:
            return Response({"error": "Ordre d'Imputation non trouvé."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CycleVisiteUpdateSerializer(data=request.data)
        if serializer.is_valid():
            validated_data = serializer.validated_data
            
            ordre_imputation.dernier_cycle_visite_resultat = validated_data['visite_acceptee']
            ordre_imputation.date_prochain_cycle_visite = validated_data['date_prochaine_visite']
            ordre_imputation.date_derniere_visite_effectuee = validated_data['date_visite_effectuee']
            ordre_imputation.save()

            admin_profiles = UserProfile.objects.filter(role='Admin')
            result_text = "acceptée" if validated_data['visite_acceptee'] else "échouée"
            for admin_profile in admin_profiles:
                if admin_profile.user:
                    create_notification(
                        message=f"La visite de cycle pour l'OI '{ordre_imputation.value}' a été enregistrée comme {result_text} par {request.user.profile.name}. Prochaine visite le {validated_data['date_prochaine_visite']}.",
                        recipient_type='UserInRole',
                        recipient_role='Admin',
                        recipient_user_id=admin_profile.user.id,
                        notification_category='CYCLE_VISIT',
                        ordre_imputation_id=ordre_imputation.id_ordre
                    )
            
            return Response(OrdreImputationSerializer(ordre_imputation).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PreventiveTaskTemplateViewSet(viewsets.ModelViewSet):
    queryset = PreventiveTaskTemplate.objects.select_related('ordre_imputation').all().order_by('ordre_imputation__value', 'trigger_hours')
    serializer_class = PreventiveTaskTemplateSerializer
    permission_classes = [IsAdminUser]

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('-created_at')
    serializer_class = TaskSerializer 

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), OR(IsAdminUser(), IsChefDeParcUser())] 
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrAdminForTask()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'profile'):
            return Task.objects.none() 

        qs = Task.objects.select_related('ordre', 'assigned_to_profile__user') \
                         .prefetch_related('techniciens', 'advancement_notes__images', 'task_notifications') 
        
        if user.profile.role == 'Admin':
            return qs.all().order_by('-created_at')
        elif user.profile.role == 'Chef de Parc':
            return qs.filter(assigned_to_profile=user.profile).order_by('-created_at')
        
        return Task.objects.none()

    def perform_create(self, serializer):
        current_user_profile = self.request.user.profile
        task_status = 'assigned' 
        
        if current_user_profile.role == 'Admin':
            if not serializer.validated_data.get('assigned_to_profile'):
                 raise drf_exceptions.ValidationError({"assigned_to_profile_id": "Admin must assign the task to a Chef de Parc."})
            task_status = 'assigned'
            task = serializer.save(status=task_status)
            task_identifier = task.task_id_display or task.id
            if task.assigned_to_profile and task.assigned_to_profile.user:
                create_notification(
                    message=f"Nouveau OT '{task_identifier}' vous a été assigné par l'Admin.",
                    recipient_type='UserInRole',
                    recipient_role='Chef de Parc',
                    recipient_user_id=task.assigned_to_profile.user.id,
                    task_id=task.id,
                    notification_category='TASK'
                )
        elif current_user_profile.role == 'Chef de Parc':
            task_status = 'in progress' 
            task = serializer.save(assigned_to_profile=current_user_profile, status=task_status)
            task_identifier = task.task_id_display or task.id
            admin_profiles = UserProfile.objects.filter(role='Admin')
            for admin_profile in admin_profiles:
                if admin_profile.user:
                    create_notification(
                        message=f"Nouveau OT '{task_identifier}' créé par {current_user_profile.name} est maintenant '{task.get_status_display()}'.",
                        recipient_type='UserInRole', 
                        recipient_role='Admin',
                        recipient_user_id=admin_profile.user.id, 
                        task_id=task.id,
                        notification_category='TASK'
                    )
        else:
            raise permissions.PermissionDenied("Vous n'avez pas la permission de créer des ordres de travail.")
        
        if task and not task.task_id_display: 
            generate_task_id_display(task)
            task.refresh_from_db()


    def perform_update(self, serializer):
        instance = serializer.instance
        original_status = instance.status
        current_user_profile = self.request.user.profile
        request_data = self.request.data
        
        updated_status = original_status
        status_changed = False

        if current_user_profile.role == 'Admin':
            new_status_from_payload = request_data.get('status')
            if new_status_from_payload and new_status_from_payload != original_status:
                if new_status_from_payload in [s[0] for s in Task.STATUS_CHOICES]:
                    updated_status = new_status_from_payload
                    status_changed = True

        elif current_user_profile.role == 'Chef de Parc':
            if original_status == 'assigned': 
                updated_status = 'in progress' 
                status_changed = True
            elif original_status == 'in progress':
                status_update_for_chef = request_data.get('status_update_for_chef')
                if status_update_for_chef == 'closed':
                    updated_status = 'closed'
                    status_changed = True
        
        # Save other field updates first
        instance = serializer.save()

        # If status has changed, update status and closed_at field
        if status_changed:
            instance.status = updated_status
            if updated_status == 'closed' and original_status != 'closed':
                instance.closed_at = timezone.now()
            elif original_status == 'closed' and updated_status != 'closed':
                instance.closed_at = None
            instance.save(update_fields=['status', 'closed_at', 'updated_at'])

            # Notification Logic
            task_identifier = instance.task_id_display or instance.id
            message = ""
            if current_user_profile.role == 'Chef de Parc':
                if updated_status == 'in progress':
                    message = f"L'OT '{task_identifier}' assigné à {current_user_profile.name} est maintenant '{instance.get_status_display()}'."
                elif updated_status == 'closed':
                    message = f"L'OT '{task_identifier}' a été clôturé par {current_user_profile.name}."
                
                if message:
                    admin_profiles = UserProfile.objects.filter(role='Admin')
                    for admin_profile in admin_profiles:
                        if admin_profile.user:
                            create_notification(message=message, recipient_type='UserInRole', recipient_role='Admin',
                                                recipient_user_id=admin_profile.user.id, task_id=instance.id,
                                                notification_category='TASK')
            elif current_user_profile.role == 'Admin':
                if instance.assigned_to_profile and instance.assigned_to_profile.user:
                    create_notification(
                        message=f"Le statut de l'OT '{task_identifier}' a été changé à '{instance.get_status_display()}' par l'Admin.",
                        recipient_type='UserInRole', recipient_role='Chef de Parc',
                        recipient_user_id=instance.assigned_to_profile.user.id, task_id=instance.id,
                        notification_category='TASK'
                    )

class AdvancementNoteViewSet(viewsets.ModelViewSet):
    queryset = AdvancementNote.objects.all().order_by('-created_at')
    serializer_class = AdvancementNoteSerializer
    
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrAdminForAdvancementNote()]
        if self.action == 'create':
             return [IsAuthenticated(), OR(IsAdminUser(), IsChefDeParcUser())]
        return [IsAuthenticated()] 

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'profile'):
            return AdvancementNote.objects.none()
        
        qs = AdvancementNote.objects.select_related('task', 'created_by').prefetch_related('images')

        if user.profile.role == 'Admin':
            return qs.all().order_by('-created_at') 
        elif user.profile.role == 'Chef de Parc':
            task_ids = Task.objects.filter(assigned_to_profile=user.profile).values_list('id', flat=True)
            return qs.filter(task_id__in=task_ids).order_by('-created_at')
        
        return AdvancementNote.objects.none()
            
    @transaction.atomic 
    def perform_create(self, serializer):
        task_instance = serializer.validated_data.get('task')
        user_profile = self.request.user.profile
        
        if user_profile.role == 'Chef de Parc':
            if task_instance.assigned_to_profile != user_profile:
                raise permissions.PermissionDenied("You can only add notes to tasks assigned to you.")
        
        advancement_note = serializer.save(created_by=self.request.user)
        
        images_data = self.request.FILES.getlist('image') 
        for image_file in images_data:
            AdvancementNoteImage.objects.create(advancement_note=advancement_note, image=image_file)
            
        task_identifier = task_instance.task_id_display or task_instance.id
        if user_profile.role == 'Chef de Parc': 
            admin_profiles = UserProfile.objects.filter(role='Admin')
            for admin_profile in admin_profiles:
                 if admin_profile.user:
                    create_notification(
                        message=f"Nouvelle note ajoutée à l'OT '{task_identifier}' par {user_profile.name}.",
                        recipient_type='UserInRole',
                        recipient_role='Admin',
                        recipient_user_id=admin_profile.user.id,
                        task_id=task_instance.id,
                        notification_category='TASK'
                    )
        elif user_profile.role == 'Admin' and task_instance.assigned_to_profile and task_instance.assigned_to_profile.user:
            create_notification(
                message=f"Nouvelle note ajoutée à votre OT '{task_identifier}' par l'Admin.",
                recipient_type='UserInRole',
                recipient_role='Chef de Parc',
                recipient_user_id=task_instance.assigned_to_profile.user.id,
                task_id=task_instance.id,
                notification_category='TASK'
            )

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated] 

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'profile'):
            return Notification.objects.none()
        
        q_role_general = Q(recipient_type='Role', recipient_role=user.profile.role)
        q_user_specific = Q(recipient_type='UserInRole', recipient_user=user, recipient_role=user.profile.role)
        
        return Notification.objects.filter(q_role_general | q_user_specific)\
                                 .select_related('recipient_user', 'task_related', 'ordre_imputation_related')\
                                 .distinct().order_by('-timestamp')

    def perform_create(self, serializer):
        if not (self.request.user and hasattr(self.request.user, 'profile') and self.request.user.profile.role == 'Admin'):
             raise permissions.PermissionDenied("You do not have permission to create notifications directly.")
        serializer.save()

    @action(detail=True, methods=['post'], url_path='mark-as-read', permission_classes=[IsAuthenticated])
    def mark_as_read(self, request, pk=None):
        try:
            notification = self.get_queryset().get(pk=pk)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found or not accessible.'}, status=status.HTTP_404_NOT_FOUND)
        
        notification.read = True
        notification.save()
        return Response({'status': 'notification marked as read'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='mark-all-as-read', permission_classes=[IsAuthenticated])
    def mark_all_as_read(self, request):
        notifications_to_update = self.get_queryset().filter(read=False)
        count = notifications_to_update.update(read=True)
        return Response({'status': f'{count} notifications marked as read'}, status=status.HTTP_200_OK)

class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().select_related('profile').order_by('username')
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        if self.action in ['update', 'partial_update']:
            return AdminUserUpdateSerializer
        return AdminUserListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save() 
        response_serializer = AdminUserListSerializer(user, context=self.get_serializer_context())
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_403_FORBIDDEN)
        self.perform_destroy(instance) 
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        user_profile_name = user.username
        user_profile_role = None

        if hasattr(user, 'profile') and user.profile:
            user_profile_name = user.profile.name
            user_profile_role = user.profile.role
            
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'name': user_profile_name, 
            'role': user_profile_role, 
        })

class PreventiveChecklistSubmissionView(views.APIView):
    def get_permissions(self):
        return [IsAuthenticated(), OR(IsAdminUser(), IsChefDeParcUser())]

    def post(self, request, *args, **kwargs):
        serializer = PreventiveChecklistSubmissionSerializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            created_task = serializer.save() 
            response_serializer = TaskSerializer(created_task, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminTaskReportView(views.APIView):
    permission_classes = [IsAdminUser]
    renderer_classes = [JSONRenderer, PassthroughPDFRenderer]

    def get_filtered_queryset(self, request):
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        ordre_imputation_values = request.query_params.getlist('ordre_imputation_value')

        queryset = Task.objects.select_related(
            'ordre', 
            'assigned_to_profile__user'
        ).prefetch_related(
            'techniciens', 
            'advancement_notes__images', 
            'advancement_notes__created_by'
        ).all().order_by('ordre__value', 'created_at')

        if ordre_imputation_values:
            queryset = queryset.filter(ordre__value__in=ordre_imputation_values)

        if start_date_str and end_date_str:
            try:
                start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(
                    (Q(start_date__lte=end_date) | Q(start_date__isnull=True)) &
                    (Q(end_date__gte=start_date) | Q(end_date__isnull=True))
                )
            except ValueError:
                raise drf_exceptions.ValidationError({"error": "Invalid date format. Please use colorChoice-MM-DD."})
        elif start_date_str or end_date_str:
             raise drf_exceptions.ValidationError({"error": "Both start date and end date are required for date range filtering, or neither for no date filter."})
        
        return queryset

    def generate_pdf_report(self, queryset, request, start_date_str=None, end_date_str=None, ordre_imputation_value=None):
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=inch/2, leftMargin=inch/2, topMargin=inch/2, bottomMargin=inch/2)
        styles = getSampleStyleSheet()
        story = []

        title_text = "Rapport d'Activités des Tâches"
        filter_criteria = []
        if ordre_imputation_value and len(ordre_imputation_value) > 0:
            filter_criteria.append(f"Ordre(s) d'Imputation: {', '.join(ordre_imputation_value)}")
        if start_date_str and end_date_str:
            filter_criteria.append(f"Période: {start_date_str} au {end_date_str}")
        
        if filter_criteria:
            title_text += " (" + ", ".join(filter_criteria) + ")"
            
        story.append(Paragraph(title_text, styles['h2']))
        story.append(Paragraph(f"Généré le: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} par {request.user.username}", styles['Normal']))
        story.append(Spacer(1, 0.15*inch))

        if not queryset.exists():
            story.append(Paragraph("Aucune tâche trouvée pour les critères sélectionnés.", styles['Normal']))
            doc.build(story)
            buffer.seek(0)
            return buffer

        small_text_style = ParagraphStyle('small_text', parent=styles['Normal'], fontSize=7, leading=9)
        header_style = ParagraphStyle('header_text', parent=styles['Normal'], fontSize=7, leading=9, fontName='Helvetica-Bold', alignment=1)
        
        task_table_data = []
        
        task_headers = [
            Paragraph("ID Tâche", header_style), Paragraph("O.I.", header_style), Paragraph("Type", header_style), 
            Paragraph("Description Tâche", header_style), Paragraph("Statut", header_style), 
            Paragraph("Chef Parc", header_style), Paragraph("Techniciens", header_style), 
            Paragraph("H Travail", header_style), Paragraph("Début", header_style), Paragraph("Fin", header_style)
        ]
        task_table_data.append(task_headers)
        
        col_widths = [0.7*inch, 1.0*inch, 0.7*inch, 1.8*inch, 0.6*inch, 0.9*inch, 1.0*inch, 0.5*inch, 0.6*inch, 0.6*inch]

        for task in queryset:
            techniciens_str = ", ".join([t.name for t in task.techniciens.all()])
            task_data_row = [
                Paragraph(task.task_id_display or str(task.id), small_text_style),
                Paragraph(task.ordre.value if task.ordre else "N/A", small_text_style),
                Paragraph(task.get_type_display(), small_text_style),
                Paragraph(task.tasks, small_text_style),
                Paragraph(task.get_status_display(), small_text_style),
                Paragraph(task.assigned_to_profile.name if task.assigned_to_profile else "N/A", small_text_style),
                Paragraph(techniciens_str if techniciens_str else "N/A", small_text_style),
                Paragraph(str(task.hours_of_work) if task.hours_of_work is not None else "N/A", small_text_style),
                Paragraph(task.start_date.strftime('%d-%m-%Y') if task.start_date else "N/A", small_text_style),
                Paragraph(task.end_date.strftime('%d-%m-%Y') if task.end_date else "N/A", small_text_style),
            ]
            task_table_data.append(task_data_row)

            if task.advancement_notes.exists():
                task_table_data.append([Paragraph(f"<b>Notes pour Tâche {task.task_id_display or task.id}:</b>", small_text_style)] + [''] * (len(col_widths) - 1))
                
                notes_header_row_text = ["Date", "Auteur", "Note", "Images"]
                task_table_data.append([
                    Paragraph(f"<b>{notes_header_row_text[0]}</b>", small_text_style),
                    Paragraph(f"<b>{notes_header_row_text[1]}</b>", small_text_style),
                    Paragraph(f"<b>{notes_header_row_text[2]}</b>", small_text_style),
                    '', '', '',
                    Paragraph(f"<b>{notes_header_row_text[3]}</b>", small_text_style),
                    '', '', ''
                ])

                for note in task.advancement_notes.all().order_by('date'):
                    image_flowables = []
                    for img_obj in note.images.all():
                        if img_obj.image and hasattr(img_obj.image, 'path'):
                            try:
                                if os.path.exists(img_obj.image.path):
                                    img = Image(img_obj.image.path, width=0.4*inch, height=0.4*inch) 
                                    img.hAlign = 'LEFT'
                                    image_flowables.append(img)
                                else:
                                    image_flowables.append(Paragraph("[img absente]", small_text_style))
                            except Exception:
                                image_flowables.append(Paragraph("[err img]", small_text_style))
                        else:
                             image_flowables.append(Paragraph("[ref img invalide]", small_text_style))
                    
                    image_content = image_flowables if image_flowables else Paragraph("Aucune", small_text_style)

                    note_detail_row = [
                        Paragraph(note.date.strftime('%d-%m-%Y'), small_text_style),
                        Paragraph(note.created_by_username or (note.created_by.username if note.created_by else "Système"), small_text_style),
                        Paragraph(note.note, small_text_style),
                        '', '', '',
                        image_content,
                        '', '', ''
                    ]
                    task_table_data.append(note_detail_row)
                task_table_data.append([''] * len(col_widths))

        table = Table(task_table_data, colWidths=col_widths, repeatRows=1)
        
        style_commands = [
            ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('ALIGN', (0,0), (-1,0), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]

        for i, row_content in enumerate(task_table_data):
            if not row_content or not isinstance(row_content[0], Paragraph): continue

            first_cell_text = row_content[0].text
            
            if "<b>Notes pour Tâche" in first_cell_text:
                style_commands.append(('SPAN', (0, i), (-1, i)))
                style_commands.append(('BACKGROUND', (0, i), (-1, i), colors.lightblue))
                style_commands.append(('TEXTCOLOR', (0,i), (-1,i), colors.black))
                
                if i + 1 < len(task_table_data):
                    style_commands.append(('SPAN', (2, i + 1), (5, i + 1))) 
                    style_commands.append(('SPAN', (6, i + 1), (9, i + 1))) 
                    style_commands.append(('BACKGROUND', (0, i + 1), (-1, i + 1), colors.lightcyan))
                    style_commands.append(('ALIGN', (0, i + 1), (-1, i + 1), 'CENTER'))
                    style_commands.append(('FONTNAME', (0, i + 1), (-1, i + 1), 'Helvetica-Bold'))

            if i > 1:
                row_before_previous = task_table_data[i-2]
                if isinstance(row_before_previous[0], Paragraph) and "<b>Notes pour Tâche" in row_before_previous[0].text:
                    previous_row = task_table_data[i-1]
                    if isinstance(previous_row[0], Paragraph) and "<b>Date</b>" in previous_row[0].text: 
                        style_commands.append(('SPAN', (2, i), (5, i)))
                        style_commands.append(('SPAN', (6, i), (9, i)))
                        style_commands.append(('BACKGROUND', (0, i), (-1, i), colors.whitesmoke))
                        style_commands.append(('VALIGN', (6, i), (6,i), 'MIDDLE'))

        table.setStyle(TableStyle(style_commands))
        story.append(table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer

    def get(self, request, *args, **kwargs):
        output_format = request.query_params.get('format', 'json') 
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        ordre_imputation_values = request.query_params.getlist('ordre_imputation_value')

        try:
            queryset = self.get_filtered_queryset(request)
        except drf_exceptions.ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": "An unexpected error occurred while filtering data.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        if output_format == 'pdf':
            try:
                has_date_range = start_date_str and end_date_str
                has_specific_oi = ordre_imputation_values and len(ordre_imputation_values) > 0

                if not has_date_range and not has_specific_oi:
                    return Response(
                        {"error": "Pour générer un PDF, veuillez sélectionner une plage de dates ou au moins un Ordre d'Imputation spécifique."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                pdf_buffer = self.generate_pdf_report(queryset, request, start_date_str, end_date_str, ordre_imputation_values)
                response = HttpResponse(pdf_buffer, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="rapport_taches_{timezone.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
                return response
            except Exception as e:
                traceback.print_exc()
                return Response(
                    {"error": "An unexpected error occurred during PDF generation.", "detail": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            try:
                json_serializer = TaskSerializer(queryset, many=True, context={'request': request})
                return Response(json_serializer.data)
            except Exception as e:
                traceback.print_exc()
                return Response(
                    {"error": "An unexpected error occurred during JSON serialization.", "detail": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )