import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Select, Label, ErrorMessage } from '../ui';
import { apiRequest } from '../../api/api';
import { ClipboardList, Wrench, UserCheck } from 'lucide-react';
import { cn } from '../../utils';

const PreventiveTaskCreationModal = ({ isOpen, onClose, notificationData, technicians, chefsDeParc, onCreateTask, currentUser }) => {
    const [selectedTechnicianIds, setSelectedTechnicianIds] = useState([]);
    const [selectedAssignedToProfileId, setSelectedAssignedToProfileId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            setSelectedTechnicianIds([]);
            setFieldErrors({});
            // If the current user is a Chef de Parc, pre-select them.
            if (currentUser?.role === 'Chef de Parc') {
                const selfAsChef = chefsDeParc.find(chef => chef.user.id === currentUser.user_id);
                if (selfAsChef) {
                    setSelectedAssignedToProfileId(selfAsChef.id.toString());
                }
            } else {
                setSelectedAssignedToProfileId('');
            }
        }
    }, [isOpen, currentUser, chefsDeParc]);

    if (!isOpen || !notificationData) return null;

    const { ordreImputation, triggerHours } = notificationData;

    const handleCreateTask = async () => {
        setIsSubmitting(true);
        setFieldErrors({});
        let errors = {};

        if (currentUser.role === 'Admin' && !selectedAssignedToProfileId) {
            errors.assigned_to_profile_id = 'Un Chef de Parc doit être assigné.';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setIsSubmitting(false);
            return;
        }

        const payload = {
            ordre_imputation_id: ordreImputation.id_ordre,
            trigger_hours: triggerHours,
            technicien_ids: selectedTechnicianIds,
        };
        
        if (currentUser.role === 'Admin') {
            payload.assigned_to_profile_id = selectedAssignedToProfileId;
        }

        try {
            await onCreateTask(payload);
            onClose();
        } catch (error) {
            console.error("Failed to create preventive task:", error);
            setFieldErrors({ submit: error.message || "Échec de la création de la tâche." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTechnicianChange = (e) => {
        const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedTechnicianIds(selectedIds);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogHeader>
                <DialogTitle className="flex items-center">
                    <ClipboardList className="h-6 w-6 mr-2 text-orange-600" />
                    Créer une Tâche de Maintenance Préventive
                </DialogTitle>
                <DialogDescription>
                    Une maintenance préventive est requise pour l'Ordre d'Imputation <strong>{ordreImputation.value}</strong> qui approche les <strong>{triggerHours}</strong> heures de service.
                </DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                {fieldErrors.submit && <ErrorMessage message={fieldErrors.submit} />}

                {currentUser.role === 'Admin' && (
                    <div>
                        <Label htmlFor="assign-chef" className="flex items-center text-sm mb-1">
                            <UserCheck className="h-4 w-4 mr-2 text-gray-500" />
                            Assigner à un Chef de Parc
                        </Label>
                        <Select
                            id="assign-chef"
                            value={selectedAssignedToProfileId}
                            onChange={(e) => {
                                setSelectedAssignedToProfileId(e.target.value);
                                if (fieldErrors.assigned_to_profile_id) setFieldErrors(p => ({...p, assigned_to_profile_id: null}));
                            }}
                            className={cn('text-sm', fieldErrors.assigned_to_profile_id ? 'ring-1 ring-red-500 border-red-500' : '')}
                        >
                            <option value="">Sélectionner un Chef de Parc</option>
                            {chefsDeParc.map(chef => (
                                <option key={chef.id} value={chef.id.toString()}>
                                    {chef.name} ({chef.user.username})
                                </option>
                            ))}
                        </Select>
                        <ErrorMessage message={fieldErrors.assigned_to_profile_id} />
                    </div>
                )}

                <div>
                    <Label htmlFor="technicians" className="flex items-center text-sm mb-1">
                        <Wrench className="h-4 w-4 mr-2 text-gray-500" />
                        Sélectionner les Techniciens (Optionnel)
                    </Label>
                    <Select
                        id="technicians"
                        multiple
                        value={selectedTechnicianIds}
                        onChange={handleTechnicianChange}
                        className="text-sm h-auto min-h-[120px]"
                    >
                        {technicians.map(tech => (
                            <option key={tech.id_technician} value={tech.id_technician}>
                                {tech.name}
                            </option>
                        ))}
                    </Select>
                </div>
                <p className="text-xs text-gray-500 italic">
                    La création de cette tâche la mettra automatiquement en statut "En Cours" et générera une checklist basée sur les modèles préventifs.
                </p>
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Annuler</Button>
                <Button onClick={handleCreateTask} disabled={isSubmitting}>
                    {isSubmitting ? "Création en cours..." : "Créer la Tâche"}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}