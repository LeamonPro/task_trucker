// src/components/modals/OiFormModal.jsx
import React, { useState, useEffect } from 'react';
import { PackageOpen, Save } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Label, ErrorMessage } from '../ui';

const OiFormModal = ({ isOpen, onClose, onSaveOi, oiToEdit }) => {
    const initialOiState = { id_ordre: '', value: '', date_prochain_cycle_visite: '' };
    const [oiData, setOiData] = useState(initialOiState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = Boolean(oiToEdit);

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && oiToEdit) {
                setOiData({
                    id_ordre: oiToEdit.id_ordre || '',
                    value: oiToEdit.value || '',
                    date_prochain_cycle_visite: oiToEdit.date_prochain_cycle_visite || '',
                });
            } else {
                setOiData(initialOiState);
            }
            setFormErrors({});
        }
    }, [isOpen, oiToEdit, isEditMode]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setOiData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!isEditMode && !oiData.id_ordre.trim()) {
            errors.id_ordre = "L'ID de l'Ordre (PK) est requis.";
        }
        if (!oiData.value.trim()) {
            errors.value = "La valeur (nom unique) de l'Ordre est requise.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const payload = { ...oiData };
            if (!payload.date_prochain_cycle_visite) {
                payload.date_prochain_cycle_visite = null; 
            }
            await onSaveOi(payload, isEditMode ? oiToEdit.id_ordre : null);
            onClose();
        } catch (error) {
            console.error(`Erreur lors de ${isEditMode ? "la modification" : "l'ajout"} de l'OI:`, error);
            setFormErrors({ submit: error.message || `Échec de ${isEditMode ? "la modification" : "la création"}. Vérifiez les données.` });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose} className="max-w-md">
            <DialogHeader>
                <DialogTitle id="oi-form-modal-title" className="flex items-center">
                    <PackageOpen className="h-6 w-6 mr-2 text-blue-600" />
                    {isEditMode ? "Modifier l'Ordre d'Imputation" : "Ajouter un Ordre d'Imputation"}
                </DialogTitle>
                <DialogDescription>
                    {isEditMode ? `Modification de l'OI: ${oiToEdit?.value}` : "Créez un nouvel Ordre d'Imputation."}
                </DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                {formErrors.submit && <ErrorMessage message={formErrors.submit} className="text-center" />}
                <div>
                    <Label htmlFor="id_ordre-oi-form">ID Ordre (Clé Primaire)</Label>
                    <Input
                        id="id_ordre-oi-form"
                        name="id_ordre"
                        value={oiData.id_ordre}
                        onChange={handleInputChange}
                        placeholder="ex: CH01-T01-01"
                        className={formErrors.id_ordre ? 'ring-1 ring-red-500 border-red-500' : ''}
                        disabled={isEditMode}
                        readOnly={isEditMode}
                    />
                    { !isEditMode && <ErrorMessage message={formErrors.id_ordre} /> }
                </div>
                <div>
                    <Label htmlFor="value-oi-form">Valeur (Nom unique)</Label>
                    <Input
                        id="value-oi-form"
                        name="value"
                        value={oiData.value}
                        onChange={handleInputChange}
                        placeholder="ex: CHARIOT-ELEVATEUR-01"
                        className={formErrors.value ? 'ring-1 ring-red-500 border-red-500' : ''}
                    />
                    <ErrorMessage message={formErrors.value} />
                </div>
                <div>
                    <Label htmlFor="date_prochain_cycle_visite-oi-form">Date Prochaine Visite de Cycle (Optionnel)</Label>
                    <Input
                        id="date_prochain_cycle_visite-oi-form"
                        name="date_prochain_cycle_visite"
                        type="date"
                        value={oiData.date_prochain_cycle_visite}
                        onChange={handleInputChange}
                        className={formErrors.date_prochain_cycle_visite ? 'ring-1 ring-red-500 border-red-500' : ''}
                    />
                    <ErrorMessage message={formErrors.date_prochain_cycle_visite} />
                </div>
                {isEditMode && oiToEdit && (
                    <div className="mt-3 pt-3 border-t text-xs text-gray-500 space-y-1">
                        <p><strong>Total Heures de Travail:</strong> {oiToEdit.total_hours_of_work || '0.00'}h (Non modifiable ici)</p>
                        <p><strong>Dernier Seuil Notifié:</strong> {oiToEdit.last_notified_threshold || 'Aucun'} (Non modifiable ici)</p>
                    </div>
                )}
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Annuler</Button>
                <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-green-700" disabled={isSubmitting}>
                    {isSubmitting ? (isEditMode ? 'Modification...' : 'Ajout...') : <><Save className="h-4 w-4 mr-2" /> {isEditMode ? 'Enregistrer Modifications' : 'Ajouter OI'}</>}
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default OiFormModal;
