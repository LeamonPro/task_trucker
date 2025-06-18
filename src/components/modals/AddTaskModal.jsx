// src/components/modals/AddTaskModal.jsx
import React, { useState } from 'react';
import { ListChecks, ArrowLeft, ArrowRight, Save, X } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Select, Textarea, Label, ErrorMessage } from '../ui';
import { getTaskTypeLabel, TASK_TYPE_OPTIONS } from '../../utils';

const AddTaskModal = ({ isOpen, onClose, onAddTask, chefsDeParc, ordresImputation }) => {
    const initialTaskState = {
        ordre_value: '',
        type: 'preventif',
        tasks: '',
        assigned_to_profile_id: '',
        start_date: '',
        end_date: '',
        start_time: '',
        estimated_hours: ''
    };
    const [currentStep, setCurrentStep] = useState(1);
    const [taskData, setTaskData] = useState(initialTaskState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTaskData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({...prev, [name]: null}));
        }
    };

    const validateStep1 = () => {
        const errors = {};
        if (!taskData.ordre_value) errors.ordre_value = "L'Ordre d'Imputation est requis.";
        if (!taskData.type) errors.type = "Le Type d'ordre de travail est requis.";
        if (!taskData.tasks.trim()) errors.tasks = "La Description de l'ordre de travail est requise.";
        if (taskData.start_date && taskData.end_date && taskData.start_date > taskData.end_date) {
            errors.end_date = "La date de fin ne peut pas être anterieure à la date de debut.";
        }
        if (taskData.estimated_hours && (isNaN(parseFloat(taskData.estimated_hours)) || parseFloat(taskData.estimated_hours) <= 0)) {
            errors.estimated_hours = "Les heures estimées doivent être un nombre positif.";
        }
        if (taskData.start_date && !taskData.start_time) {
            errors.start_time = "L'heure de début est requise avec la date de début.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateStep2 = () => {
        const errors = {};
        if (!taskData.assigned_to_profile_id) errors.assigned_to_profile_id = "Veuillez assigner à un Chef de Parc.";
        setFormErrors(prev => ({...prev, ...errors}));
        return Object.keys(errors).length === 0;
    };

    const nextStep = () => {
        setFormErrors({});
        if (currentStep === 1 && !validateStep1()) return;
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        if (!validateStep1()) { setCurrentStep(1); return; }
        if (!validateStep2()) { setCurrentStep(2); return; }
        setIsSubmitting(true);
        try {
            const payload = { ...taskData };
            if (!payload.start_date) delete payload.start_date;
            if (!payload.end_date) delete payload.end_date;
            if (!payload.start_time) {
                delete payload.start_time;
            } else {
                payload.start_time = `${payload.start_time}:00`;
            }
            if (!payload.estimated_hours) {
                delete payload.estimated_hours;
            } else {
                payload.estimated_hours = parseFloat(payload.estimated_hours);
            }

            await onAddTask(payload);
            resetForm();
            onClose();
        } catch (error) {
            console.error("echec de l'ajout de l'ordre de travail (Admin):", error);
            setFormErrors({ submit: error.message || "echec de la creation de l'ordre de travail. Veuillez reessayer." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setCurrentStep(1);
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
                <DialogTitle id="add-task-title-admin">Ajouter un Nouvel Ordre de travail (Admin - etape {currentStep} sur 3)</DialogTitle>
                <DialogDescription>
                    {currentStep === 1 && "Entrez les details de l'ordre de travail (imputation, type, dates, tâches specifiques)."}
                    {currentStep === 2 && "Assignez l'ordre de travail à un Chef de Parc."}
                    {currentStep === 3 && "Verifiez et soumettez le nouvel ordre de travail."}
                </DialogDescription>
            </DialogHeader>
            <DialogContent>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(currentStep / 3) * 100}%` }}></div>
                </div>
                {formErrors.submit && <ErrorMessage message={formErrors.submit} className="mb-4 text-center"/>}
                {currentStep === 1 && (
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label htmlFor="ordre_value-add-admin" className="flex items-center"><ListChecks className="h-4 w-4 mr-1 text-gray-600"/>Ordre d'Imputation</Label>
                            <Select id="ordre_value-add-admin" name="ordre_value" value={taskData.ordre_value} onChange={handleInputChange} className={formErrors.ordre_value ? 'ring-1 ring-red-500 border-red-500' : ''}>
                                <option value="" disabled>Selectionner un Ordre d'Imputation</option>
                                {ordresImputation.map(ordre => ( <option key={ordre.id_ordre} value={ordre.value}>{ordre.value}</option> ))}
                            </Select>
                            <ErrorMessage message={formErrors.ordre_value} />
                        </div>
                        <div>
                            <Label htmlFor="type-add-admin">Type</Label>
                            <Select id="type-add-admin" name="type" value={taskData.type} onChange={handleInputChange} className={formErrors.type ? 'ring-1 ring-red-500 border-red-500' : ''}>
                                {TASK_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </Select>
                            <ErrorMessage message={formErrors.type} />
                        </div>
                        <div>
                            <Label htmlFor="tasks-add-admin">Description (Ordre de travail)</Label>
                            <Textarea id="tasks-add-admin" name="tasks" value={taskData.tasks} onChange={handleInputChange} placeholder="Description detaillee de l'ordre de travail" rows={3} className={formErrors.tasks ? 'ring-1 ring-red-500 border-red-500' : ''}/>
                            <ErrorMessage message={formErrors.tasks} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="start_date-add-admin">Date de Debut</Label>
                                <Input id="start_date-add-admin" name="start_date" type="date" value={taskData.start_date} onChange={handleInputChange} className={formErrors.start_date ? 'ring-1 ring-red-500 border-red-500' : ''}/>
                                <ErrorMessage message={formErrors.start_date} />
                            </div>
                            <div>
                                <Label htmlFor="start_time-add-admin">Heure de Debut</Label>
                                <Input id="start_time-add-admin" name="start_time" type="time" value={taskData.start_time} onChange={handleInputChange} className={formErrors.start_time ? 'ring-1 ring-red-500 border-red-500' : ''}/>
                                <ErrorMessage message={formErrors.start_time} />
                            </div>
                            <div>
                                <Label htmlFor="end_date-add-admin">Date de Fin</Label>
                                <Input id="end_date-add-admin" name="end_date" type="date" value={taskData.end_date} onChange={handleInputChange} className={formErrors.end_date ? 'ring-1 ring-red-500 border-red-500' : ''}/>
                                <ErrorMessage message={formErrors.end_date} />
                            </div>
                            <div>
                                <Label htmlFor="estimated_hours-add-admin">Heures Estimées</Label>
                                <Input id="estimated_hours-add-admin" name="estimated_hours" type="number" step="0.01" value={taskData.estimated_hours} onChange={handleInputChange} placeholder="ex: 8.5" className={formErrors.estimated_hours ? 'ring-1 ring-red-500 border-red-500' : ''}/>
                                <ErrorMessage message={formErrors.estimated_hours} />
                            </div>
                        </div>
                    </div>
                )}
                {currentStep === 2 && (
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label htmlFor="assigned_to_profile_id-add-admin">Assigner à (Chef de Parc)</Label>
                            <Select id="assigned_to_profile_id-add-admin" name="assigned_to_profile_id" value={taskData.assigned_to_profile_id} onChange={handleInputChange} className={formErrors.assigned_to_profile_id ? 'ring-1 ring-red-500 border-red-500' : ''}>
                                <option value="" disabled>Selectionner un Chef de Parc</option>
                                {chefsDeParc.map(chef => ( <option key={chef.id} value={chef.id}>{chef.name} ({chef.user.username})</option> ))}
                            </Select>
                            <ErrorMessage message={formErrors.assigned_to_profile_id} />
                        </div>
                    </div>
                )}
                {currentStep === 3 && (
                    <div className="grid gap-3 py-4 text-sm bg-slate-100 p-4 rounded-md">
                        <h4 className="font-semibold text-md mb-2 text-gray-800">Verifier les Informations de l'Ordre de travail</h4>
                        <p><strong>Ordre d'Imputation :</strong> {taskData.ordre_value}</p>
                        <p><strong>Type :</strong> <span className="capitalize">{getTaskTypeLabel(taskData.type)}</span></p>
                        <p><strong>Description :</strong> <span className="whitespace-pre-wrap">{taskData.tasks}</span></p>
                        <p><strong>Assigner à :</strong> {chefsDeParc.find(c => c.id === parseInt(taskData.assigned_to_profile_id))?.name || 'N/A'}</p>
                        {taskData.start_date && <p><strong>Date de Debut :</strong> {taskData.start_date} {taskData.start_time && `à ${taskData.start_time}`}</p>}
                        {taskData.end_date && <p><strong>Date de Fin :</strong> {taskData.end_date}</p>}
                        {taskData.estimated_hours && <p><strong>Heures Estimées :</strong> {taskData.estimated_hours}h</p>}
                    </div>
                )}
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="mr-auto"> <X className="h-4 w-4 mr-1" /> Fermer </Button>
                {currentStep > 1 && <Button variant="outline" onClick={prevStep} disabled={isSubmitting}><ArrowLeft className="h-4 w-4 mr-1" /> Precedent</Button>}
                {currentStep < 3 && <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>Suivant <ArrowRight className="h-4 w-4 ml-1" /></Button>}
                {currentStep === 3 && <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-blue-700" disabled={isSubmitting}>{isSubmitting ? 'Soumission en cours...' : <><Save className="h-4 w-4 mr-2"/>Soumettre l'Ordre de travail</>}</Button>}
            </DialogFooter>
        </Dialog>
    );
};

export default AddTaskModal;
