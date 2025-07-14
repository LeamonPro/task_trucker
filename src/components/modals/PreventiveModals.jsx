import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Save, Wrench } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Select, Textarea, Label, ErrorMessage, Checkbox } from '../ui';

export const PreventiveTemplateModal = ({ isOpen, onClose, onSave, ordresImputation, templateToEdit }) => {
    const initialTemplateState = { title: '', description: '', trigger_hours: '', ordre_imputation: '' };
    const [templateData, setTemplateData] = useState(initialTemplateState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (templateToEdit) {
                setTemplateData({
                    title: templateToEdit.title || '',
                    description: templateToEdit.description || '',
                    trigger_hours: templateToEdit.trigger_hours?.toString() || '',
                    ordre_imputation: templateToEdit.ordre_imputation || ''
                });
            } else {
                setTemplateData(initialTemplateState);
            }
            setFormErrors({});
        }
    }, [isOpen, templateToEdit]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTemplateData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const errors = {};
        if (!templateData.title.trim()) errors.title = "Le titre est requis.";
        if (!templateData.description.trim()) errors.description = "La description est requise.";
        if (!templateData.trigger_hours) errors.trigger_hours = "Les heures de déclenchement sont requises.";
        else if (isNaN(parseInt(templateData.trigger_hours)) || parseInt(templateData.trigger_hours) <= 0) {
            errors.trigger_hours = "Les heures de déclenchement doivent être un nombre entier positif.";
        }
        if (!templateData.ordre_imputation) errors.ordre_imputation = "L'Ordre d'Imputation est requis.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const payload = { ...templateData, trigger_hours: parseInt(templateData.trigger_hours) };
            await onSave(payload, templateToEdit?.id);
            onClose();
        } catch (error) {
            console.error("Erreur lors de l'enregistrement du modèle préventif:", error);
            setFormErrors({ submit: error.message || "Échec de l'enregistrement. Veuillez réessayer." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose} className="max-w-lg">
            <DialogHeader>
                <DialogTitle id="prev-template-modal-title">
                    {templateToEdit ? "Modifier le Modèle de Tâche Préventive" : "Ajouter un Modèle de Tâche Préventive"}
                </DialogTitle>
                <DialogDescription>Définissez les détails pour une tâche préventive automatique.</DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                {formErrors.submit && <ErrorMessage message={formErrors.submit} className="text-center" />}
                <div>
                    <Label htmlFor="template-title">Titre</Label>
                    <Input id="template-title" name="title" value={templateData.title} onChange={handleInputChange} placeholder="ex: Vérification Niveau d'Huile Moteur" className={formErrors.title ? 'ring-1 ring-red-500 border-red-500' : ''} />
                    <ErrorMessage message={formErrors.title} />
                </div>
                <div>
                    <Label htmlFor="template-description">Description (Tâche de la Checklist)</Label>
                    <Textarea id="template-description" name="description" value={templateData.description} onChange={handleInputChange} placeholder="ex: Contrôler et ajuster le niveau d'huile moteur." rows={3} className={formErrors.description ? 'ring-1 ring-red-500 border-red-500' : ''} />
                    <ErrorMessage message={formErrors.description} />
                </div>
                <div>
                    <Label htmlFor="template-trigger_hours">Heures de Déclenchement</Label>
                    <Input id="template-trigger_hours" name="trigger_hours" type="number" value={templateData.trigger_hours} onChange={handleInputChange} placeholder="ex: 200, 400, 800, 1600" className={formErrors.trigger_hours ? 'ring-1 ring-red-500 border-red-500' : ''} />
                    <ErrorMessage message={formErrors.trigger_hours} />
                </div>
                <div>
                    <Label htmlFor="template-ordre_imputation">Ordre d'Imputation</Label>
                    <Select id="template-ordre_imputation" name="ordre_imputation" value={templateData.ordre_imputation} onChange={handleInputChange} className={formErrors.ordre_imputation ? 'ring-1 ring-red-500 border-red-500' : ''}>
                        <option value="" disabled>Sélectionner un Ordre d'Imputation</option>
                        {ordresImputation.map(oi => ( <option key={oi.id_ordre} value={oi.id_ordre}>{oi.value}</option> ))}
                    </Select>
                    <ErrorMessage message={formErrors.ordre_imputation} />
                </div>
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Annuler</Button>
                <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-green-700" disabled={isSubmitting}>
                    {isSubmitting ? 'Enregistrement...' : <><Save className="h-4 w-4 mr-2" /> Enregistrer</>}
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export const PreventiveChecklistModal = ({ isOpen, onClose, onSubmit, checklistData, technicians }) => {
    const [completedItems, setCompletedItems] = useState({});
    const [notes, setNotes] = useState('');
    const [selectedTechnicianIds, setSelectedTechnicianIds] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { ordreImputationId, ordreImputationValue, notificationMessage } = checklistData || {};
    
    const parsedChecklistItems = useMemo(() => {
        if (!notificationMessage) return [];
        return notificationMessage.split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('- '))
            .map(line => line.substring(2).trim());
    }, [notificationMessage]);

    useEffect(() => {
        if (isOpen) {
            const initialCompleted = {};
            parsedChecklistItems.forEach((_, index) => {
                initialCompleted[`item-${index}`] = false;
            });
            setCompletedItems(initialCompleted);
            setNotes('');
            setSelectedTechnicianIds([]);
            setFormErrors({});
        }
    }, [isOpen, parsedChecklistItems]);

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setCompletedItems(prev => ({ ...prev, [name]: checked }));
    };
    
    const handleTechnicianChange = (e) => {
        const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedTechnicianIds(selectedIds);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setFormErrors({});
        
        const checklistItemsPayload = parsedChecklistItems.map((description, index) => ({
            description: description,
            is_completed: completedItems[`item-${index}`] || false
        }));

        if (checklistItemsPayload.length === 0) {
            setFormErrors({ submit: "Aucune tâche de checklist à soumettre."});
            setIsSubmitting(false);
            return;
        }

        try {
            await onSubmit({
                ordre_imputation_id: ordreImputationId,
                checklist_items: checklistItemsPayload,
                notes: notes.trim(),
                technicien_ids: selectedTechnicianIds
            });
            onClose();
        } catch (error) {
            console.error("Erreur lors de la soumission de la checklist préventive:", error);
            setFormErrors({ submit: error.message || "Échec de la soumission. Veuillez réessayer." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !checklistData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose} className="max-w-lg">
            <DialogHeader>
                <DialogTitle id="prev-checklist-modal-title" className="flex items-center">
                    <ClipboardList className="h-6 w-6 mr-2 text-orange-600" />
                    Maintenance Préventive pour OI: {ordreImputationValue}
                </DialogTitle>
                <DialogDescription>
                    Cochez les tâches effectuées pour cet Ordre d'Imputation.
                </DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                {formErrors.submit && <ErrorMessage message={formErrors.submit} className="text-center" />}
                
                <div className="bg-slate-50 p-3 rounded-md border">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Tâches à Effectuer :</h4>
                    {parsedChecklistItems.length > 0 ? (
                        <ul className="space-y-2">
                            {parsedChecklistItems.map((item, index) => (
                                <li key={index} className="text-sm text-gray-800">
                                    <Checkbox 
                                        id={`checklist-item-${index}`}
                                        name={`item-${index}`}
                                        checked={completedItems[`item-${index}`] || false}
                                        onChange={handleCheckboxChange}
                                        label={item}
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500 italic">Aucune tâche spécifique trouvée dans la notification.</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="technicians-checklist" className="flex items-center"><Wrench className="h-4 w-4 mr-1 text-gray-600" />Techniciens (Optionnel)</Label>
                    <Select id="technicians-checklist" name="technicien_ids" multiple value={selectedTechnicianIds} onChange={handleTechnicianChange} className='h-auto min-h-[100px]'>
                        {technicians.map(tech => (
                            <option key={tech.id_technician} value={tech.id_technician}>{tech.name}</option>
                        ))}
                    </Select>
                </div>

                <div>
                    <Label htmlFor="preventive-notes">Notes Additionnelles (Optionnel)</Label>
                    <Textarea 
                        id="preventive-notes" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        placeholder="ex: Filtre à air remplacé, niveau de liquide de refroidissement ajusté..." 
                        rows={3} 
                    />
                </div>
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Annuler</Button>
                <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-green-700" disabled={isSubmitting || parsedChecklistItems.length === 0}>
                    {isSubmitting ? 'Soumission...' : <><Save className="h-4 w-4 mr-2" /> Soumettre Tâches Effectuées</>}
                </Button>
            </DialogFooter>
        </Dialog>
    );
};