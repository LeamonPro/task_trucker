// src/components/modals/TechnicianFormModal.jsx
import React, { useState, useEffect } from 'react';
import { Wrench, Save } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Label, ErrorMessage } from '../ui';
import { cn } from '../../utils';

const TechnicianFormModal = ({ isOpen, onClose, onSaveTechnician, technicianToEdit }) => {
    const initialTechnicianState = { id_technician: '', name: '' };
    const [technicianData, setTechnicianData] = useState(initialTechnicianState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = Boolean(technicianToEdit);

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && technicianToEdit) {
                setTechnicianData({
                    id_technician: technicianToEdit.id_technician || '',
                    name: technicianToEdit.name || '',
                });
            } else {
                setTechnicianData(initialTechnicianState);
            }
            setFormErrors({});
        }
    }, [isOpen, technicianToEdit, isEditMode]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTechnicianData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!isEditMode && !technicianData.id_technician.trim()) {
            errors.id_technician = "L'ID du technicien est requis.";
        }
        if (!technicianData.name.trim()) {
            errors.name = "Le nom du technicien est requis.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const payload = { ...technicianData };
            if (isEditMode) {
                const { id_technician, ...updateData } = payload;
                await onSaveTechnician(updateData, technicianToEdit.id_technician);
            } else {
                await onSaveTechnician(payload, null);
            }
            onClose();
        } catch (error) {
            console.error(`Erreur lors de ${isEditMode ? "la modification" : "l'ajout"} du technicien:`, error);
            setFormErrors({ submit: error.message || `Échec de ${isEditMode ? "la modification" : "la création"}. Vérifiez les données.` });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose} className="max-w-md">
            <DialogHeader>
                <DialogTitle id="technician-form-modal-title" className="flex items-center">
                    <Wrench className="h-6 w-6 mr-2 text-blue-600" />
                    {isEditMode ? "Modifier le Technicien" : "Ajouter un Nouveau Technicien"}
                </DialogTitle>
                <DialogDescription>
                    {isEditMode ? `Modification du technicien: ${technicianToEdit?.name}` : "Créez un nouveau profil de technicien."}
                </DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                {formErrors.submit && <ErrorMessage message={formErrors.submit} className="text-center" />}
                <div>
                    <Label htmlFor="technician-id-form">ID Technicien (Clé Primaire)</Label>
                    <Input
                        id="technician-id-form"
                        name="id_technician"
                        value={technicianData.id_technician}
                        onChange={handleInputChange}
                        placeholder="ex: TECH001"
                        className={cn(formErrors.id_technician ? 'ring-1 ring-red-500 border-red-500' : '', isEditMode ? 'bg-gray-200 cursor-not-allowed' : '')}
                        disabled={isEditMode}
                        readOnly={isEditMode}
                    />
                    { !isEditMode && <ErrorMessage message={formErrors.id_technician} /> }
                </div>
                <div>
                    <Label htmlFor="technician-name-form">Nom du Technicien</Label>
                    <Input
                        id="technician-name-form"
                        name="name"
                        value={technicianData.name}
                        onChange={handleInputChange}
                        placeholder="ex: John Doe"
                        className={formErrors.name ? 'ring-1 ring-red-500 border-red-500' : ''}
                    />
                    <ErrorMessage message={formErrors.name} />
                </div>
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Annuler</Button>
                <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-green-700" disabled={isSubmitting}>
                    {isSubmitting ? (isEditMode ? 'Modification...' : 'Ajout...') : <><Save className="h-4 w-4 mr-2" /> {isEditMode ? 'Enregistrer Modifications' : 'Ajouter Technicien'}</>}
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default TechnicianFormModal;
