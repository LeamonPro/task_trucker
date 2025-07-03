from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Sum

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Chef de Parc', 'Chef de Parc'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"

class Technician(models.Model):
    id_technician = models.CharField(max_length=100, primary_key=True)
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name

class OrdreImputation(models.Model):
    id_ordre = models.CharField(max_length=100, primary_key=True)
    value = models.CharField(max_length=255, unique=True)
    date_prochain_cycle_visite = models.DateField(null=True, blank=True, verbose_name="Date Prochain Cycle Visite")
    date_derniere_visite_effectuee = models.DateField(null=True, blank=True, verbose_name="Date Dernière Visite Effectuée")
    dernier_cycle_visite_resultat = models.BooleanField(null=True, blank=True, verbose_name="Résultat Dernier Cycle Visite (Accepté/Échoué)")
    
    total_hours_of_work = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00, 
        verbose_name="Total Hours of Work Accumulated"
    )
    last_notified_threshold = models.PositiveIntegerField(
        null=True, blank=True, 
        verbose_name="Last Notified Preventive Threshold (Actual Hours)" # Stores the 100% value for which 90% warning was sent
    )

    def __str__(self):
        return self.value

class PreventiveTaskTemplate(models.Model):
    title = models.CharField(max_length=255, verbose_name="Titre de la Tâche Préventive")
    description = models.TextField(verbose_name="Description (élément de checklist)")
    trigger_hours = models.PositiveIntegerField(
        verbose_name="Heures de Déclenchement (ex: 200, 400)",
        help_text="Le nombre d'heures de travail total de l'OI qui déclenche cette tâche."
    )
    ordre_imputation = models.ForeignKey(
        OrdreImputation, 
        on_delete=models.CASCADE, 
        related_name='preventive_task_templates',
        verbose_name="Ordre d'Imputation Concerné"
    )

    def __str__(self):
        return f"{self.title} pour {self.ordre_imputation.value} @ {self.trigger_hours}h"

    class Meta:
        verbose_name = "Modèle de Tâche Préventive"
        verbose_name_plural = "Modèles de Tâches Préventives"
        unique_together = [['ordre_imputation', 'trigger_hours', 'description']]


class Task(models.Model):
    TYPE_CHOICES = [
        ('preventif', 'Preventif'),
        ('curatif', 'Curatif'),
        ('visite hierarchique', 'Visite Hierarchique'),
    ]
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('in progress', 'In Progress'),
        ('closed', 'Closed'),
    ]

    task_id_display = models.CharField(max_length=50, unique=True, blank=True, null=True, verbose_name="Task Display ID")
    ordre = models.ForeignKey(OrdreImputation, on_delete=models.SET_NULL, null=True, blank=False, to_field='value')
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='preventif')
    tasks = models.TextField(verbose_name="Task Description") 
    techniciens = models.ManyToManyField(Technician, blank=True, related_name="tasks_assigned")
    epi = models.TextField(blank=True, null=True, verbose_name="EPI Required")
    pdr = models.TextField(blank=True, null=True, verbose_name="PDR Required")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    assigned_to_profile = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=False,
        related_name='assigned_tasks',
        limit_choices_to={'role': 'Chef de Parc'}
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # --- NEW FIELDS ---
    start_time = models.TimeField(null=True, blank=True, verbose_name="Heure de Début")
    estimated_hours = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        verbose_name="Heures de Travail Estimées"
    )
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="Date et Heure de Clôture")
    # --- END NEW FIELDS ---

    hours_of_work = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        verbose_name="New Total Operating Hours for OI"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Task {self.task_id_display or self.id} - {self.ordre.value if self.ordre else 'N/A'}"

    @property
    def assignedTo(self):
        return self.assigned_to_profile.name if self.assigned_to_profile else None

def generate_task_id_display(instance):
    if instance.pk and not instance.task_id_display:
        instance.task_id_display = f"ORDT-{instance.pk}"
        Task.objects.filter(pk=instance.pk).update(task_id_display=instance.task_id_display)


class AdvancementNote(models.Model):
    task = models.ForeignKey(Task, related_name='advancement_notes', on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    note = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_by_username = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        task_identifier = self.task.task_id_display if self.task and self.task.task_id_display else self.task.id
        return f"Note for Task {task_identifier} on {self.date} by {self.created_by_username or (self.created_by.username if self.created_by else 'Unknown')}"

    def save(self, *args, **kwargs):
        if self.created_by and not self.created_by_username:
            self.created_by_username = self.created_by.username
        super().save(*args, **kwargs)

class AdvancementNoteImage(models.Model):
    advancement_note = models.ForeignKey(AdvancementNote, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='advancement_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for Note {self.advancement_note.id} - {self.image.name}"

class Notification(models.Model):
    RECIPIENT_TYPE_CHOICES = [
        ('Role', 'Role'), 
        ('UserInRole', 'UserInRole') 
    ]
    NOTIFICATION_CATEGORY_CHOICES = [
        ('TASK', 'Task Related'),
        ('CYCLE_VISIT', 'Cycle Visit Related'),
        ('PREVENTIVE_CHECKLIST', 'Preventive Maintenance Checklist'),
        ('GENERAL', 'General Notification'),
    ]

    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    
    recipient_type = models.CharField(max_length=20, choices=RECIPIENT_TYPE_CHOICES)
    recipient_role = models.CharField(max_length=50, choices=UserProfile.ROLE_CHOICES, blank=True, null=True) 
    recipient_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    
    task_related = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name='task_notifications')
    ordre_imputation_related = models.ForeignKey(OrdreImputation, on_delete=models.CASCADE, null=True, blank=True, related_name='oi_notifications')
    
    notification_category = models.CharField(
        max_length=30, 
        choices=NOTIFICATION_CATEGORY_CHOICES, 
        default='GENERAL'
    )

    def __str__(self):
        target_info = ""
        if self.recipient_user:
            target_info = f"for User: {self.recipient_user.username}"
        elif self.recipient_role:
            target_info = f"for Role: {self.recipient_role}"
        
        related_info = ""
        if self.task_related:
            related_info = f"(Task: {self.task_related.task_id_display or self.task_related.id})"
        elif self.ordre_imputation_related:
            related_info = f"(OI: {self.ordre_imputation_related.value})"

        return f"Notification ({self.get_notification_category_display()}): {self.message[:50]}... {target_info} {related_info}"

    class Meta:
        ordering = ['-timestamp']

def check_and_trigger_preventive_tasks(ordre_imputation_instance):
    defined_thresholds = sorted(list(
        PreventiveTaskTemplate.objects.filter(ordre_imputation=ordre_imputation_instance)
                                      .values_list('trigger_hours', flat=True)
                                      .distinct()
    ))
    
    if not defined_thresholds:
        print(f"No preventive task templates found for OI {ordre_imputation_instance.value}. Skipping check.")
        return

    current_total_hours = ordre_imputation_instance.total_hours_of_work
    last_notified_actual_threshold = ordre_imputation_instance.last_notified_threshold or 0
    
    # Generate all possible future trigger points based on a 1600-hour cycle
    all_trigger_points = []
    base_thresholds = [t for t in defined_thresholds if t > 0]
    
    # Determine the number of cycles to check, going a bit beyond the current hours.
    max_hours_to_check = float(current_total_hours) + 2000.0 
    
    k = 0
    while True:
        cycle_base = k * 1600
        generated_a_trigger_in_cycle = False
        for thresh in base_thresholds:
            trigger = cycle_base + thresh
            if trigger > max_hours_to_check and k > 0:
                break
            all_trigger_points.append(trigger)
            generated_a_trigger_in_cycle = True
        
        if not generated_a_trigger_in_cycle or (cycle_base > max_hours_to_check and k > 0) :
            break
        k += 1

    all_trigger_points = sorted(list(set(all_trigger_points)))

    actual_threshold_to_warn_for = None
    template_trigger_hours = None

    for full_threshold_value in all_trigger_points:
        warning_trigger_point = full_threshold_value * 0.90
        
        if current_total_hours >= warning_trigger_point and full_threshold_value > last_notified_actual_threshold:
            actual_threshold_to_warn_for = full_threshold_value
            # Determine which template to use
            template_trigger_hours = full_threshold_value % 1600
            if template_trigger_hours == 0:
                template_trigger_hours = 1600
            
            if template_trigger_hours not in defined_thresholds:
                continue

            break

    if actual_threshold_to_warn_for and template_trigger_hours:
        templates_for_trigger = PreventiveTaskTemplate.objects.filter(
            ordre_imputation=ordre_imputation_instance, 
            trigger_hours=template_trigger_hours
        )

        if templates_for_trigger.exists():
            checklist_items = [f"- {tmpl.description}" for tmpl in templates_for_trigger]
            checklist_message = (
                f"Alerte Anticipée: Maintenance Préventive pour OI '{ordre_imputation_instance.value}' "
                f"(approche les {actual_threshold_to_warn_for}h de service).\n"
                f"Veuillez vous préparer pour les tâches suivantes:\n" + "\n".join(checklist_items)
            )
            
            recipients_notified_count = 0
            
            admin_profiles = UserProfile.objects.filter(role='Admin')
            for admin_profile in admin_profiles:
                if admin_profile.user:
                    Notification.objects.create(
                        message=checklist_message,
                        recipient_type='UserInRole', 
                        recipient_role='Admin',
                        recipient_user=admin_profile.user,
                        notification_category='PREVENTIVE_CHECKLIST',
                        ordre_imputation_related=ordre_imputation_instance
                    )
                    recipients_notified_count +=1
            
            chef_profiles = UserProfile.objects.filter(role='Chef de Parc')
            for chef_profile in chef_profiles:
                if chef_profile.user:
                    Notification.objects.create(
                        message=checklist_message, 
                        recipient_type='UserInRole',
                        recipient_role='Chef de Parc',
                        recipient_user=chef_profile.user,
                        notification_category='PREVENTIVE_CHECKLIST',
                        ordre_imputation_related=ordre_imputation_instance
                    )
                    recipients_notified_count +=1
            
            if recipients_notified_count > 0:
                ordre_imputation_instance.last_notified_threshold = actual_threshold_to_warn_for
                ordre_imputation_instance.save(update_fields=['last_notified_threshold'])
                print(f"Advance preventive task warnings triggered for OI {ordre_imputation_instance.value} approaching {actual_threshold_to_warn_for}h. Notified {recipients_notified_count} users.")
            else:
                print(f"Advance preventive tasks found for OI {ordre_imputation_instance.value} approaching {actual_threshold_to_warn_for}h, but no Admin or Chef de Parc users found to notify.")
        else:
            print(f"OI {ordre_imputation_instance.value} is approaching {actual_threshold_to_warn_for}h (90% warning point crossed), but no preventive task templates found for this specific threshold.")
            ordre_imputation_instance.last_notified_threshold = actual_threshold_to_warn_for
            ordre_imputation_instance.save(update_fields=['last_notified_threshold'])

@receiver(post_save, sender=Task)
def update_oi_total_hours_on_task_save(sender, instance, created, **kwargs):
    if instance.ordre and instance.hours_of_work is not None:
        oi = instance.ordre
        new_total_hours_for_oi = instance.hours_of_work 
        
        if oi.total_hours_of_work != new_total_hours_for_oi:
            oi.total_hours_of_work = new_total_hours_for_oi
            oi.save(update_fields=['total_hours_of_work']) 
            check_and_trigger_preventive_tasks(oi)


@receiver(post_save, sender=Task)
def ensure_task_id_display(sender, instance, created, **kwargs):
    if created and not instance.task_id_display:
        generate_task_id_display(instance)