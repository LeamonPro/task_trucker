// src/components/modals/AddTaskChefModal.jsx
import React, { useState } from 'react';
import { ListChecks, ShieldCheck, PackageOpen, Wrench, Hourglass, Clock, Save, X, FileText } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Select, Textarea, Label, ErrorMessage, Checkbox } from '../ui';
import { cn, TASK_TYPE_OPTIONS } from '../../utils';

const AddTaskChefModal = ({ isOpen, onClose, onAddTask, ordresImputation, technicians }) => {
    const initialTaskState = {
        ordre_value: '',
        type: 'preventif',
        tasks: '',
        technicien_ids: [],
        epi: '',
        pdr: '',
        hours_of_work: '',
        start_date: '',
        end_date: '',
        start_time: '', 
        estimated_hours: '',
        permis_de_travail: false,
    };

    const [taskData, setTaskData] = useState(initialTaskState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTaskData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleTechnicianChange = (e) => {
        const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
        setTaskData(prev => ({ ...prev, technicien_ids: selectedIds }));
        if (formErrors.technicien_ids) {
            setFormErrors(prev => ({ ...prev, technicien_ids: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!taskData.ordre_value) errors.ordre_value = "L'Ordre d'Imputation est requis.";
        if (!taskData.type) errors.type = "Le Type d'ordre de travail est requis.";
        if (!taskData.tasks.trim()) errors.tasks = "La Description de l'ordre de travail est requise.";
        if (!taskData.technicien_ids || taskData.technicien_ids.length === 0) errors.technicien_ids = "Au moins un technicien est requis.";
        if (!taskData.epi.trim()) errors.epi = "Les details des EPI sont requis.";
        if (!taskData.pdr.trim()) errors.pdr = "Les details des PDR sont requis.";
        if (!taskData.hours_of_work || isNaN(parseFloat(taskData.hours_of_work)) || parseFloat(taskData.hours_of_work) <= 0) {
            errors.hours_of_work = "Le Nouveau Total d'Heures de Fonctionnement (OI) est requis et doit être un nombre positif.";
        }
        if (taskData.start_date && taskData.end_date && taskData.start_date > taskData.end_date) {
            errors.end_date = "La date de fin ne peut pas être anterieure à la date de debut.";
        }
        if (!taskData.estimated_hours || isNaN(parseFloat(taskData.estimated_hours)) || parseFloat(taskData.estimated_hours) <= 0) {
            errors.estimated_hours = "Les heures estimées sont requises et doivent être un nombre positif.";
        }
        if (taskData.start_date && !taskData.start_time) {
            errors.start_time = "L'heure de début est requise si la date de début est spécifiée.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const payload = {
                ...taskData,
                hours_of_work: parseFloat(taskData.hours_of_work),
                estimated_hours: parseFloat(taskData.estimated_hours),
            };
            if (!payload.start_date) delete payload.start_date;
            if (!payload.end_date) delete payload.end_date;
            if (!payload.start_time) {
                delete payload.start_time;
            } else {
                payload.start_time = `${payload.start_time}:00`;
            }

            await onAddTask(payload);
            resetForm();
            onClose();
        } catch (error) {
            console.error("echec de l'ajout de l'ordre de travail (Chef):", error);
            if (error.message && error.message.includes(":")) {
                const backendErrors = error.message.split(';').reduce((acc, errMsg) => {
                    const [field, ...messages] = errMsg.split(':');
                    if (field && messages.length > 0) {
                        acc[field.trim()] = messages.join(':').trim();
                    }
                    return acc;
                }, {});
                setFormErrors(prev => ({ ...prev, ...backendErrors, submit: "Veuillez corriger les erreurs ci-dessus." }));
            } else {
                setFormErrors({ submit: error.message || "echec de la creation de l'ordre de travail. Veuillez reessayer." });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTaskData(initialTaskState);
        setFormErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose} className="max-w-lg md:max-w-xl">
            <DialogHeader>
                <DialogTitle id="add-task-title-chef">Ajouter un Nouvel Ordre de travail (Chef de Parc)</DialogTitle>
                <DialogDescription> Remplissez les details du nouvel ordre de travail. Il sera directement mis 'En Cours'. </DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                {formErrors.submit && <ErrorMessage message={formErrors.submit} className="mb-4 text-center" />}
                <div>
                    <Label htmlFor="ordre_value-add-chef" className="flex items-center"><ListChecks className="h-4 w-4 mr-1 text-gray-600" />Ordre d'Imputation</Label>
                    <Select id="ordre_value-add-chef" name="ordre_value" value={taskData.ordre_value} onChange={handleInputChange} className={formErrors.ordre_value ? 'ring-1 ring-red-500 border-red-500' : ''}>
                        <option value="" disabled>Selectionner un Ordre d'Imputation</option>
                        {ordresImputation.map(ordre => (
                            <option key={ordre.id_ordre} value={ordre.value}>{ordre.value}</option>
                        ))}
                    </Select>
                    <ErrorMessage message={formErrors.ordre_value} />
                </div>
                <div>
                    <Label htmlFor="type-add-chef">Type</Label>
                    <Select id="type-add-chef" name="type" value={taskData.type} onChange={handleInputChange} className={formErrors.type ? 'ring-1 ring-red-500 border-red-500' : ''}>
                        {TASK_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Select>
                    <ErrorMessage message={formErrors.type} />
                </div>
                <div>
                    <Label htmlFor="tasks-add-chef">Description (Ordre de travail)</Label>
                    <Textarea id="tasks-add-chef" name="tasks" value={taskData.tasks} onChange={handleInputChange} placeholder="Description detaillee de l'ordre de travail" rows={3} className={formErrors.tasks ? 'ring-1 ring-red-500 border-red-500' : ''} />
                    <ErrorMessage message={formErrors.tasks} />
                </div>
                <div>
                    <Label htmlFor="technicien_ids-add-chef" className="flex items-center"><Wrench className="h-4 w-4 mr-1 text-gray-600" />Techniciens</Label>
                    <Select id="technicien_ids-add-chef" name="technicien_ids" multiple value={taskData.technicien_ids} onChange={handleTechnicianChange} className={cn('h-auto min-h-[100px]', formErrors.technicien_ids ? 'ring-1 ring-red-500 border-red-500' : '')}>
                        {technicians.map(tech => (
                            <option key={tech.id_technician} value={tech.id_technician}>{tech.name}</option>
                        ))}
                    </Select>
                    <ErrorMessage message={formErrors.technicien_ids} />
                </div>
                <div>
                    <Label htmlFor="epi-add-chef" className="flex items-center"><ShieldCheck className="h-4 w-4 mr-1 text-gray-600" />EPI</Label>
                    <Textarea id="epi-add-chef" name="epi" value={taskData.epi} onChange={handleInputChange} placeholder="Lister les EPI requis" rows={2} className={formErrors.epi ? 'ring-1 ring-red-500 border-red-500' : ''} />
                    <ErrorMessage message={formErrors.epi} />
                </div>
                <div>
                    <Label htmlFor="pdr-add-chef" className="flex items-center"><PackageOpen className="h-4 w-4 mr-1 text-gray-600" />PDR</Label>
                    <Textarea id="pdr-add-chef" name="pdr" value={taskData.pdr} onChange={handleInputChange} placeholder="Lister les pièces de rechange requises" rows={2} className={formErrors.pdr ? 'ring-1 ring-red-500 border-red-500' : ''} />
                    <ErrorMessage message={formErrors.pdr} />
                </div>
                <div>
                    <Label htmlFor="hours_of_work-add-chef" className="flex items-center"><Hourglass className="h-4 w-4 mr-1 text-gray-600" />Nouveau Total Heures de Fonctionnement (OI)</Label>
                    <Input id="hours_of_work-add-chef" name="hours_of_work" type="number" step="0.01" value={taskData.hours_of_work} onChange={handleInputChange} placeholder="ex: 2500.50" className={formErrors.hours_of_work ? 'ring-1 ring-red-500 border-red-500' : ''} />
                    <ErrorMessage message={formErrors.hours_of_work} />
                </div>
                <div>
                    <Label htmlFor="estimated_hours-add-chef" className="flex items-center"><Clock className="h-4 w-4 mr-1 text-gray-600" />Heures de Travail Estimées</Label>
                    <Input id="estimated_hours-add-chef" name="estimated_hours" type="number" step="0.01" value={taskData.estimated_hours} onChange={handleInputChange} placeholder="ex: 8.5" className={formErrors.estimated_hours ? 'ring-1 ring-red-500 border-red-500' : ''} />
                    <ErrorMessage message={formErrors.estimated_hours} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="start_date-add-chef">Date de Debut</Label>
                        <Input id="start_date-add-chef" name="start_date" type="date" value={taskData.start_date} onChange={handleInputChange} className={formErrors.start_date ? 'ring-1 ring-red-500 border-red-500' : ''} />
                        <ErrorMessage message={formErrors.start_date} />
                    </div>
                     <div>
                        <Label htmlFor="start_time-add-chef">Heure de Debut</Label>
                        <Input id="start_time-add-chef" name="start_time" type="time" value={taskData.start_time} onChange={handleInputChange} className={formErrors.start_time ? 'ring-1 ring-red-500 border-red-500' : ''} />
                        <ErrorMessage message={formErrors.start_time} />
                    </div>
                    <div>
                        <Label htmlFor="end_date-add-chef">Date de Fin</Label>
                        <Input id="end_date-add-chef" name="end_date" type="date" value={taskData.end_date} onChange={handleInputChange} className={formErrors.end_date ? 'ring-1 ring-red-500 border-red-500' : ''} />
                        <ErrorMessage message={formErrors.end_date} />
                    </div>
                </div>
                <div>
                    <Checkbox
                        id="permis_de_travail-add-chef"
                        name="permis_de_travail"
                        checked={taskData.permis_de_travail}
                        onChange={handleInputChange}
                        label="Permis de Travail Requis"
                    />
                </div>
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="mr-auto"> <X className="h-4 w-4 mr-1" /> Fermer </Button>
                <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-blue-700" disabled={isSubmitting}> {isSubmitting ? 'Soumission en cours...' : <><Save className="h-4 w-4 mr-2" /> Creer l'Ordre de travail</>} </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default AddTaskChefModal;