// src/components/modals/TaskDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { Briefcase, Info, Users, CalendarDays, Clock, Hash, ListChecks, Wrench, ShieldCheck, PackageOpen, Hourglass, CheckCircle, ImageUp, X, Save, Trash2, Camera, ArrowRight } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Select, Textarea, Label, ErrorMessage } from '../ui';
import { cn, getTaskTypeLabel, TASK_TYPE_OPTIONS } from '../../utils';
import { apiRequest } from '../../api/api';
import AdvancementNoteDetailsModal from './AdvancementNoteDetailsModal';

const TaskDetailsModal = ({ task, isOpen, onClose, currentUser, onUpdateTask, onDeleteTask, chefsDeParc, ordresImputation, technicians, onOpenLightbox }) => {
    const [editableOrdreValue, setEditableOrdreValue] = useState('');
    const [editableType, setEditableType] = useState('');
    const [editableTasksDescription, setEditableTasksDescription] = useState('');
    const [editableAssignedToProfileId, setEditableAssignedToProfileId] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [advancementNote, setAdvancementNote] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [editableTechnicienIds, setEditableTechnicienIds] = useState([]);
    const [editableEPI, setEditableEPI] = useState('');
    const [editablePDR, setEditablePDR] = useState('');
    const [editableHoursOfWork, setEditableHoursOfWork] = useState('');
    const [editableStartDate, setEditableStartDate] = useState('');
    const [editableEndDate, setEditableEndDate] = useState('');
    const [editableStartTime, setEditableStartTime] = useState('');
    const [editableEstimatedHours, setEditableEstimatedHours] = useState('');
    const [dateError, setDateError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [advancementNotesHistory, setAdvancementNotesHistory] = useState([]);
    const [detailedAdvancementNote, setDetailedAdvancementNote] = useState(null);
    const taskIdentifier = task?.task_id_display || task?.id;

    useEffect(() => {
        if (task && isOpen) {
            setEditableOrdreValue(task.ordre?.value || '');
            setEditableType(task.type || 'preventif');
            setEditableTasksDescription(task.tasks || '');
            const assignedChef = chefsDeParc.find(c => c.name === task.assignedTo);
            setEditableAssignedToProfileId(assignedChef?.id.toString() || '');
            setNewStatus(task.status);
            if (task.techniciens && Array.isArray(task.techniciens) && task.techniciens.length > 0 && typeof task.techniciens[0] === 'object' && task.techniciens[0].hasOwnProperty('id_technician')) {
                setEditableTechnicienIds(task.techniciens.map(t => t.id_technician.toString()));
            } else if (task.technicien_ids && Array.isArray(task.technicien_ids)) {
                setEditableTechnicienIds(task.technicien_ids.map(String));
            } else if (task.technicien_names && Array.isArray(task.technicien_names)) {
                const ids = task.technicien_names.map(name => {
                    const tech = technicians.find(t => t.name === name);
                    return tech ? tech.id_technician.toString() : null;
                }).filter(id => id !== null);
                setEditableTechnicienIds(ids);
            } else {
                setEditableTechnicienIds([]);
            }
            setEditableEPI(task.epi || '');
            setEditablePDR(task.pdr || '');
            setEditableHoursOfWork(task.hours_of_work !== null && task.hours_of_work !== undefined ? task.hours_of_work.toString() : '');
            setEditableStartDate(task.start_date || '');
            setEditableEndDate(task.end_date || '');
            setEditableStartTime(task.start_time ? task.start_time.substring(0, 5) : '');
            setEditableEstimatedHours(task.estimated_hours !== null && task.estimated_hours !== undefined ? task.estimated_hours.toString() : '');
            setAdvancementNote('');
            setSelectedFiles([]);
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
            setImagePreviews([]);
            setDateError('');
            setFieldErrors({});
            setAdvancementNotesHistory(task.advancement_notes || []);
            setDetailedAdvancementNote(null);
        } else if (!isOpen) {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
            setImagePreviews([]);
            setDateError('');
            setFieldErrors({});
            setAdvancementNotesHistory([]);
            setDetailedAdvancementNote(null);
        }
    }, [task, isOpen, chefsDeParc, technicians]);

    useEffect(() => {
        return () => { imagePreviews.forEach(url => URL.revokeObjectURL(url)); };
    }, [imagePreviews]);

    if (!isOpen || !task) return null;

    const isTaskClosed = task.status === 'closed';
    const isTaskAssignedToCurrentUserChef = currentUser.role === 'Chef de Parc' && task.assignedTo?.trim() === currentUser.name?.trim();
    const canAdminEditCoreDetails = currentUser.role === 'Admin' && !isTaskClosed;
    const canChefEditManagementDetails = isTaskAssignedToCurrentUserChef && !isTaskClosed;
    const canAdminEditManagementDetails = currentUser.role === 'Admin' && !isTaskClosed;
    const canEditAnyDetails = canAdminEditCoreDetails || canChefEditManagementDetails || canAdminEditManagementDetails;

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        setSelectedFiles(prevFiles => [...prevFiles, ...files]);
        const newPreviews = files.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : null).filter(preview => preview !== null);
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (indexToRemove) => {
        setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
        setImagePreviews(prevPreviews => {
            const newPreviews = prevPreviews.filter((_, index) => index !== indexToRemove);
            const previewUrlToRevoke = imagePreviews[indexToRemove];
            if (previewUrlToRevoke) {
                URL.revokeObjectURL(previewUrlToRevoke);
            }
            return newPreviews;
        });
    };

    const handleSaveChanges = async () => {
        setDateError('');
        let currentFieldErrors = {};
        setIsSubmitting(true);
        if (editableStartDate && editableEndDate && editableStartDate > editableEndDate) {
            setDateError("La date de fin ne peut pas être anterieure à la date de debut.");
            currentFieldErrors.end_date = "La date de fin ne peut pas être anterieure à la date de debut.";
        }

        if (isTaskAssignedToCurrentUserChef && task.status === 'assigned') {
            if (!editableTechnicienIds || editableTechnicienIds.length === 0) currentFieldErrors.technicien_ids = 'Au moins un technicien est requis.';
            if (!editableEPI.trim()) currentFieldErrors.epi = 'Les details des EPI sont requis.';
            if (!editablePDR.trim()) currentFieldErrors.pdr = 'Les details des PDR sont requis.';
            if (!editableHoursOfWork || isNaN(parseFloat(editableHoursOfWork)) || parseFloat(editableHoursOfWork) <= 0) currentFieldErrors.hours_of_work = "Le Nouveau Total d'Heures de Fonctionnement (OI) est requis et doit être un nombre positif.";
            if (!editableEstimatedHours || isNaN(parseFloat(editableEstimatedHours)) || parseFloat(editableEstimatedHours) <= 0) currentFieldErrors.estimated_hours = "Les heures estimées sont requises et doivent être un nombre positif.";
            if (editableStartDate && !editableStartTime) currentFieldErrors.start_time = "L'heure de début est requise si la date de début est spécifiée.";
        }

        if (isTaskAssignedToCurrentUserChef && task.status === 'in progress') {
            if (editableHoursOfWork && (isNaN(parseFloat(editableHoursOfWork)) || parseFloat(editableHoursOfWork) <= 0)) currentFieldErrors.hours_of_work = "Le Nouveau Total d'Heures de Fonctionnement (OI) doit être un nombre positif si fourni.";
        }
        if (currentUser.role === 'Admin' && editableHoursOfWork && (isNaN(parseFloat(editableHoursOfWork)) || parseFloat(editableHoursOfWork) <= 0)) currentFieldErrors.hours_of_work = "Le Nouveau Total d'Heures de Fonctionnement (OI) doit être un nombre positif si fourni.";
        
        setFieldErrors(currentFieldErrors);

        if (Object.keys(currentFieldErrors).length > 0) {
            setIsSubmitting(false);
            return;
        }

        const updatesPayload = {};
        if (canAdminEditCoreDetails) {
            if (editableOrdreValue !== task.ordre?.value) updatesPayload.ordre_value = editableOrdreValue;
            if (editableType !== task.type) updatesPayload.type = editableType;
            if (editableTasksDescription !== task.tasks) updatesPayload.tasks = editableTasksDescription;
            const assignedChef = chefsDeParc.find(c => c.name === task.assignedTo);
            if (editableAssignedToProfileId !== (assignedChef?.id.toString() || '')) updatesPayload.assigned_to_profile_id = editableAssignedToProfileId ? parseInt(editableAssignedToProfileId) : null;
            if (editableStartDate !== (task.start_date || '')) updatesPayload.start_date = editableStartDate || null;
            if (editableEndDate !== (task.end_date || '')) updatesPayload.end_date = editableEndDate || null;
            const formattedStartTime = editableStartTime ? `${editableStartTime}:00` : null;
            if (formattedStartTime !== (task.start_time || null)) updatesPayload.start_time = formattedStartTime;
        }

        if (canChefEditManagementDetails || canAdminEditManagementDetails) {
            const originalTechIds = task.techniciens ? task.techniciens.map(t => t.id_technician.toString()).sort() : (task.technicien_names ? task.technicien_names.map(name => technicians.find(t => t.name === name)?.id_technician.toString()).filter(Boolean).sort() : []);
            const newEditableTechIds = editableTechnicienIds ? editableTechnicienIds.map(String).sort() : [];
            if (JSON.stringify(newEditableTechIds) !== JSON.stringify(originalTechIds)) updatesPayload.technicien_ids = editableTechnicienIds;
            if (editableEPI !== (task.epi || '')) updatesPayload.epi = editableEPI;
            if (editablePDR !== (task.pdr || '')) updatesPayload.pdr = editablePDR;
            const currentHours = task.hours_of_work !== null && task.hours_of_work !== undefined ? parseFloat(task.hours_of_work) : null;
            const newHours = editableHoursOfWork !== '' ? parseFloat(editableHoursOfWork) : null;
            if (newHours !== currentHours) updatesPayload.hours_of_work = newHours;
            const currentEstimated = task.estimated_hours !== null && task.estimated_hours !== undefined ? parseFloat(task.estimated_hours) : null;
            const newEstimated = editableEstimatedHours !== '' ? parseFloat(editableEstimatedHours) : null;
            if (newEstimated !== currentEstimated) updatesPayload.estimated_hours = newEstimated;
        }

        if (currentUser.role === 'Admin' && newStatus !== task.status) {
            updatesPayload.status = newStatus;
        } else if (isTaskAssignedToCurrentUserChef && task.status === 'in progress' && newStatus === 'closed' && newStatus !== task.status) {
            updatesPayload.status_update_for_chef = 'closed';
        }

        if (isTaskClosed && currentUser.role !== 'Admin' && Object.keys(updatesPayload).length === 0 && !advancementNote.trim() && selectedFiles.length === 0) {
            setIsSubmitting(false);
            onClose();
            return;
        }

        if (isTaskClosed && currentUser.role === 'Admin' && updatesPayload.status === task.status && Object.keys(updatesPayload).length === (updatesPayload.status ? 1 : 0) && !advancementNote.trim() && selectedFiles.length === 0) {
            setIsSubmitting(false);
            onClose();
            return;
        }

        try {
            const actualPayload = { ...updatesPayload };
            if (actualPayload.start_date === '') actualPayload.start_date = null;
            if (actualPayload.end_date === '') actualPayload.end_date = null;

            let hasChanges = Object.keys(actualPayload).length > 0;
            if (isTaskAssignedToCurrentUserChef && task.status === 'assigned') hasChanges = true;

            if (hasChanges) {
                await onUpdateTask(task.id, actualPayload);
            }

            if (advancementNote.trim() !== '' || selectedFiles.length > 0) {
                const noteFormData = new FormData();
                noteFormData.append('task', task.id.toString());
                noteFormData.append('date', new Date().toISOString().split('T')[0]);
                noteFormData.append('note', advancementNote.trim() || (hasChanges ? "Details mis à jour." : "Note ajoutee."));
                selectedFiles.forEach(file => {
                    noteFormData.append('image', file, file.name);
                });
                await apiRequest(`/advancement-notes/`, 'POST', noteFormData, true);
            }
            onClose();
        } catch (error) {
            console.error("echec de l'enregistrement des modifications:", error);
            const errorMsg = error.message || "echec de l'enregistrement. Veuillez reessayer.";
            if (error.message && error.message.includes(":")) {
                const backendErrors = error.message.split(';').reduce((acc, errMsg) => {
                    const [field, ...messages] = errMsg.split(':');
                    if (field && messages.length > 0) acc[field.trim()] = messages.join(':').trim();
                    return acc;
                }, {});
                setFieldErrors(prev => ({ ...prev, ...backendErrors, submit: errorMsg }));
            } else {
                setFieldErrors({ submit: errorMsg });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirmed = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'ordre de travail "${taskIdentifier}" ? Cette action est irreversible.`)) {
            setIsSubmitting(true);
            try {
                await onDeleteTask(task.id);
                onClose();
            } catch (error) {
                console.error("echec de la suppression de l'ordre de travail:", error);
                setFieldErrors({ submit: error.message || "echec de la suppression de l'ordre de travail." });
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    const DetailRow = ({ label, value, children, icon, isEditable, disabled, inputType = 'text', options, onChange, name, placeholder, rows, error, multiple, step }) => ( <div className="grid grid-cols-1 md:grid-cols-3 items-start py-2.5 border-b border-gray-200 last:border-b-0"> <span className="font-semibold text-gray-600 md:text-right col-span-1 pr-3 flex items-center text-sm"> {icon && React.cloneElement(icon, { className: "h-4 w-4 mr-2 text-blue-600 flex-shrink-0"})} {label} : </span> <div className="col-span-2 text-gray-800 break-words mt-1 md:mt-0"> {isEditable ? ( inputType === 'select' ? ( <Select value={value} onChange={onChange} name={name} disabled={disabled} multiple={multiple} className={cn(disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-slate-50', 'text-sm', error ? 'ring-1 ring-red-500 border-red-500' : '')}> {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)} </Select> ) : inputType === 'textarea' ? ( <Textarea value={value} onChange={onChange} name={name} placeholder={placeholder} rows={rows} disabled={disabled} className={cn(disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-slate-50', 'text-sm', error ? 'ring-1 ring-red-500 border-red-500' : '')}/> ) : ( <Input type={inputType} value={value} onChange={onChange} name={name} placeholder={placeholder} disabled={disabled} step={step} className={cn(disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-slate-50', 'text-sm', error ? 'ring-1 ring-red-500 border-red-500' : '')}/> ) ) : (children || (value !== undefined && value !== null && value !== '' ? <span className="bg-gray-100 p-1.5 rounded border text-gray-700 inline-block w-full text-sm whitespace-pre-wrap">{Array.isArray(value) ? value.join(', ') : value}</span> : <span className="text-gray-400 italic text-sm">Non defini</span>))} {isEditable && error && <ErrorMessage message={error} className="md:col-span-2"/>} </div> </div> );
    const handleTechnicianChange = (e) => { const selectedIds = Array.from(e.target.selectedOptions, option => option.value); setEditableTechnicienIds(selectedIds); if (fieldErrors.technicien_ids) setFieldErrors(p => ({ ...p, technicien_ids: null })); };
    const getStatusOptions = () => { const options = []; const allStatuses = [ { value: 'assigned', label: 'Assigne' }, { value: 'in progress', label: 'En Cours' }, { value: 'closed', label: 'Clôture' } ]; if (currentUser.role === 'Admin') { if (isTaskClosed) { options.push({ value: 'closed', label: 'Clôture (Actuel)' }); options.push({ value: 'assigned', label: 'Reouvrir vers : Assigne' }); options.push({ value: 'in progress', label: 'Reouvrir vers : En Cours' }); } else { options.push(...allStatuses); } } else if (isTaskAssignedToCurrentUserChef) { if (task.status === 'in progress') { options.push({ value: 'in progress', label: 'En Cours (Actuel)' }); options.push({ value: 'closed', label: 'Marquer comme Clôture' }); } else { const currentStatusObj = allStatuses.find(s => s.value === task.status); if (currentStatusObj) options.push(currentStatusObj); } } else { const currentStatusObj = allStatuses.find(s => s.value === task.status); if (currentStatusObj) options.unshift(currentStatusObj); } const currentStatusInOptions = options.some(op => op.value === task.status); if (!currentStatusInOptions && !(currentUser.role === 'Admin' && isTaskClosed)) { const currentStatusObj = allStatuses.find(s => s.value === task.status); if (currentStatusObj) options.unshift(currentStatusObj); } return options.filter((option, index, self) => index === self.findIndex((o) => o.value === option.value)); };
    const isStatusSelectDisabled = () => { if (isTaskClosed && currentUser.role !== 'Admin') return true; if (isTaskAssignedToCurrentUserChef) return task.status === 'assigned' || task.status === 'closed'; if (currentUser.role === 'Admin' && isTaskClosed && newStatus === task.status) return false; return false; };
    const showSaveButton = () => { if (isSubmitting) return true; if (isTaskClosed && currentUser.role !== 'Admin') return advancementNote.trim() !== '' || selectedFiles.length > 0; if (currentUser.role === 'Admin') return true; if (isTaskAssignedToCurrentUserChef) { if (task.status === 'assigned') return true; if (task.status === 'in progress') return true; } return false; };
    const shouldDisplayManagementInputs = canChefEditManagementDetails || canAdminEditManagementDetails;
    const areManagementInputsDisabled = isTaskClosed || (isTaskAssignedToCurrentUserChef && task.status === 'closed');
    return (
        <Dialog open={isOpen} onOpenChange={onClose} className="max-w-lg md:max-w-xl lg:max-w-3xl">
            <DialogHeader> <DialogTitle id="task-details-title" className="flex items-center text-gray-800"> <Briefcase className="h-6 w-6 mr-2 text-blue-600" /> Details de l'Ordre de travail </DialogTitle> <DialogDescription> <span className="font-semibold text-gray-700">ID Ordre de travail : {taskIdentifier}</span>. {canEditAnyDetails && !isTaskClosed && " Vous pouvez mettre à jour les champs eligibles ci-dessous."} {isTaskClosed && currentUser.role === 'Admin' && " Cet ordre de travail est clôture. Vous pouvez ajouter des notes/images ou le rouvrir."} {isTaskClosed && !isTaskAssignedToCurrentUserChef && currentUser.role !== 'Admin' && " Cet ordre de travail est clôture."} {isTaskAssignedToCurrentUserChef && task.status === 'assigned' && <span className="text-blue-600 font-semibold"> Veuillez completer les details requis pour demarrer cet ordre de travail.</span>} </DialogDescription> </DialogHeader>
            <DialogContent className="space-y-6">
                {fieldErrors.submit && <ErrorMessage message={fieldErrors.submit} className="mb-4 text-center"/>}
                <div className="grid gap-1 py-2 text-sm mb-4 border rounded-md p-4 bg-slate-100">
                    <DetailRow label="ID Affiche" value={taskIdentifier} icon={<Hash />} isEditable={false} />
                    <DetailRow label="Ordre d'Imputation (Valeur)" value={canAdminEditCoreDetails ? editableOrdreValue : task.ordre?.value} icon={<ListChecks />} isEditable={canAdminEditCoreDetails} inputType="select" name="editableOrdreValue" onChange={(e) => { setEditableOrdreValue(e.target.value); if(fieldErrors.ordre_value) setFieldErrors(p => ({...p, ordre_value: null}));}} options={[{value: '', label: "Selectionner l'Ordre"}, ...ordresImputation.map(oi => ({value: oi.value, label: oi.value}))]} disabled={!canAdminEditCoreDetails} error={fieldErrors.ordre_value} />
                    <DetailRow label="Type" value={canAdminEditCoreDetails ? editableType : getTaskTypeLabel(task.type)} icon={<Info />} isEditable={canAdminEditCoreDetails} inputType="select" name="editableType" onChange={(e) => { setEditableType(e.target.value); if(fieldErrors.type) setFieldErrors(p => ({...p, type: null}));}} options={TASK_TYPE_OPTIONS.map(opt => ({value: opt.value, label: opt.label}))} disabled={!canAdminEditCoreDetails} error={fieldErrors.type} />
                    <DetailRow label="Description" icon={<Info />} value={canAdminEditCoreDetails ? editableTasksDescription : task.tasks} isEditable={canAdminEditCoreDetails} inputType="textarea" name="editableTasksDescription" onChange={(e) => { setEditableTasksDescription(e.target.value); if(fieldErrors.tasks) setFieldErrors(p => ({...p, tasks: null}));}} rows={3} placeholder="Description detaillee de l'ordre de travail" disabled={!canAdminEditCoreDetails} error={fieldErrors.tasks}> {!canAdminEditCoreDetails && <p className="col-span-2 bg-white p-2 rounded border text-gray-700 whitespace-pre-wrap text-sm">{task.tasks}</p>} </DetailRow>
                    <DetailRow label="Assigne à" value={canAdminEditCoreDetails ? editableAssignedToProfileId : task.assignedTo} icon={<Users />} isEditable={canAdminEditCoreDetails} inputType="select" name="editableAssignedToProfileId" onChange={(e) => { setEditableAssignedToProfileId(e.target.value); if(fieldErrors.assigned_to_profile_id) setFieldErrors(p => ({...p, assigned_to_profile_id: null}));}} options={[{value: '', label: 'Selectionner un Chef de Parc'}, ...chefsDeParc.map(chef => ({value: chef.id.toString(), label: `${chef.name} (${chef.user.username})`}))]} disabled={!canAdminEditCoreDetails} error={fieldErrors.assigned_to_profile_id} />
                    <DetailRow label="Date de Debut" value={canAdminEditCoreDetails ? editableStartDate : task.start_date || 'Non defini'} icon={<CalendarDays />} isEditable={canAdminEditCoreDetails} inputType="date" name="editableStartDate" onChange={(e) => {setEditableStartDate(e.target.value); setDateError(''); if(fieldErrors.start_date) setFieldErrors(p => ({...p, start_date: null}));}} disabled={!canAdminEditCoreDetails} error={fieldErrors.start_date || (name === 'editableStartDate' && dateError && fieldErrors.end_date === dateError ? dateError : '')} />
                    <DetailRow label="Heure de Debut" value={canAdminEditCoreDetails ? editableStartTime : (task.start_time ? task.start_time.substring(0, 5) : 'Non definie')} icon={<Clock />} isEditable={canAdminEditCoreDetails} inputType="time" name="editableStartTime" onChange={(e) => {setEditableStartTime(e.target.value); if(fieldErrors.start_time) setFieldErrors(p => ({...p, start_time: null}));}} disabled={!canAdminEditCoreDetails} error={fieldErrors.start_time} />
                    <DetailRow label="Date de Fin" value={canAdminEditCoreDetails ? editableEndDate : task.end_date || 'Non defini'} icon={<CalendarDays />} isEditable={canAdminEditCoreDetails} inputType="date" name="editableEndDate" onChange={(e) => {setEditableEndDate(e.target.value); setDateError(''); if(fieldErrors.end_date) setFieldErrors(p => ({...p, end_date: null}));}} disabled={!canAdminEditCoreDetails} error={fieldErrors.end_date || (name === 'editableEndDate' && dateError ? dateError : '')} />
                    {dateError && canAdminEditCoreDetails && !fieldErrors.end_date && <div className="md:col-start-2 md:col-span-2"><ErrorMessage message={dateError} /></div>}
                    <DetailRow label="Statut" icon={<Info />}> <span className={`font-semibold capitalize px-2.5 py-1 rounded-full text-xs inline-block shadow-sm ${ task.status === 'assigned' ? 'bg-blue-100 text-blue-800 border border-blue-300' : task.status === 'in progress' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-green-100 text-green-800 border border-green-300' }`}>{task.status.replace('_', ' ')}</span> </DetailRow>
                    {task.status === 'closed' && task.closed_at && <DetailRow label="Clôturé le" value={new Date(task.closed_at).toLocaleString()} icon={<CheckCircle />} isEditable={false} />}
                </div>
                <div className="space-y-4 p-4 border rounded-md bg-slate-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">Details de Gestion de l'Ordre de travail</h4>
                    <div> <Label htmlFor="technicien-detail" className="flex items-center text-sm"><Wrench className="h-4 w-4 mr-2 text-gray-500"/>Techniciens</Label> {shouldDisplayManagementInputs ? ( <> <Select id="technicien-detail" multiple value={editableTechnicienIds} onChange={handleTechnicianChange} disabled={areManagementInputsDisabled} className={cn('text-sm h-auto min-h-[100px]', fieldErrors.technicien_ids ? 'ring-1 ring-red-500 border-red-500' : '')}> {technicians.map(tech => <option key={tech.id_technician} value={tech.id_technician}>{tech.name}</option>)} </Select> <ErrorMessage message={fieldErrors.technicien_ids} /> </> ) : ( <p className="text-gray-700 bg-gray-200 p-2.5 rounded min-h-[40px] text-sm"> {(task.technicien_names && task.technicien_names.length > 0) ? task.technicien_names.join(', ') : <span className="italic text-gray-400">Non specifie</span>} </p> )} </div>
                    <div> <Label htmlFor="epi-detail" className="flex items-center text-sm"><ShieldCheck className="h-4 w-4 mr-2 text-gray-500"/>EPI</Label> {shouldDisplayManagementInputs ? ( <> <Textarea id="epi-detail" value={editableEPI} onChange={(e) => {setEditableEPI(e.target.value); if(fieldErrors.epi) setFieldErrors(p => ({...p, epi: null}));}} placeholder="Lister les EPI requis" rows={3} disabled={areManagementInputsDisabled} className={cn('text-sm', fieldErrors.epi ? 'ring-1 ring-red-500 border-red-500' : '')} /> <ErrorMessage message={fieldErrors.epi} /> </> ) : ( <p className="text-gray-700 bg-gray-200 p-2.5 rounded min-h-[40px] whitespace-pre-wrap text-sm">{task.epi || <span className="italic text-gray-400">Non specifie</span>}</p> )} </div>
                    <div> <Label htmlFor="pdr-detail" className="flex items-center text-sm"><PackageOpen className="h-4 w-4 mr-2 text-gray-500"/>PDR</Label> {shouldDisplayManagementInputs ? ( <> <Textarea id="pdr-detail" value={editablePDR} onChange={(e) => {setEditablePDR(e.target.value); if(fieldErrors.pdr) setFieldErrors(p => ({...p, pdr: null}));}} placeholder="Lister les pièces de rechange" rows={3} disabled={areManagementInputsDisabled} className={cn('text-sm', fieldErrors.pdr ? 'ring-1 ring-red-500 border-red-500' : '')} /> <ErrorMessage message={fieldErrors.pdr} /> </> ) : ( <p className="text-gray-700 bg-gray-200 p-2.5 rounded min-h-[40px] whitespace-pre-wrap text-sm">{task.pdr || <span className="italic text-gray-400">Non specifie</span>}</p> )} </div>
                    <div> <Label htmlFor="estimated_hours-detail" className="flex items-center text-sm"><Clock className="h-4 w-4 mr-2 text-gray-500"/>Heures Estimées</Label> {shouldDisplayManagementInputs ? ( <> <Input id="estimated_hours-detail" name="editableEstimatedHours" type="number" step="0.01" value={editableEstimatedHours} onChange={(e) => {setEditableEstimatedHours(e.target.value); if(fieldErrors.estimated_hours) setFieldErrors(p => ({...p, estimated_hours: null}));}} placeholder="ex: 8.5" disabled={areManagementInputsDisabled} className={cn('text-sm', fieldErrors.estimated_hours ? 'ring-1 ring-red-500 border-red-500' : '')} /> <ErrorMessage message={fieldErrors.estimated_hours} /> </> ) : ( <p className="text-gray-700 bg-gray-200 p-2.5 rounded min-h-[40px] text-sm">{task.estimated_hours !== null && task.estimated_hours !== undefined ? `${task.estimated_hours}h` : <span className="italic text-gray-400">Non specifie</span>}</p> )} </div>
                    <div> <Label htmlFor="hours_of_work-detail" className="flex items-center text-sm"><Hourglass className="h-4 w-4 mr-2 text-gray-500"/>Nouveau Total Heures de Fonctionnement (OI)</Label> {shouldDisplayManagementInputs ? ( <> <Input id="hours_of_work-detail" name="editableHoursOfWork" type="number" step="0.01" value={editableHoursOfWork} onChange={(e) => {setEditableHoursOfWork(e.target.value); if(fieldErrors.hours_of_work) setFieldErrors(p => ({...p, hours_of_work: null}));}} placeholder="ex: 2500.50" disabled={areManagementInputsDisabled} className={cn('text-sm', fieldErrors.hours_of_work ? 'ring-1 ring-red-500 border-red-500' : '')} /> <ErrorMessage message={fieldErrors.hours_of_work} /> </> ) : ( <p className="text-gray-700 bg-gray-200 p-2.5 rounded min-h-[40px] text-sm">{task.hours_of_work !== null && task.hours_of_work !== undefined ? `${task.hours_of_work}h` : <span className="italic text-gray-400">Non specifie</span>}</p> )} </div>
                    { (currentUser.role === 'Admin' || (isTaskAssignedToCurrentUserChef && task.status === 'in progress')) && !isTaskClosed && <div className="pt-2"> <Label htmlFor="taskStatusUpdate-detail" className="text-sm">Mettre à jour le Statut :</Label> <Select id="taskStatusUpdate-detail" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} disabled={isStatusSelectDisabled()} className="text-sm"> {getStatusOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)} </Select> </div> }
                    { currentUser.role === 'Admin' && isTaskClosed && <div className="pt-2"> <Label htmlFor="taskStatusUpdate-detail-admin-closed" className="text-sm">Action sur l'Ordre de travail Clôture :</Label> <Select id="taskStatusUpdate-detail-admin-closed" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="text-sm"> {getStatusOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)} </Select> </div> }
                    { (!isTaskClosed || currentUser.role === 'Admin' || isTaskAssignedToCurrentUserChef ) && <> <div> <Label htmlFor="advancementNote-detail" className="text-sm">Ajouter une Note :</Label> <Textarea id="advancementNote-detail" value={advancementNote} onChange={(e) => setAdvancementNote(e.target.value)} placeholder="Progrès, problèmes..." rows={3} className="text-sm"/> </div> <div> <Label htmlFor="imageUpload-detail" className="text-sm">Telecharger des Images :</Label> <div className="flex items-center justify-center w-full"> <label htmlFor="imageUpload-detail" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"> <div className="flex flex-col items-center justify-center pt-5 pb-6"> <ImageUp className="w-8 h-8 mb-2 text-gray-500" /> <p className="mb-1 text-sm text-gray-500"><span className="font-semibold">Cliquez pour telecharger</span></p> <p className="text-xs text-gray-500">PNG, JPG (Max 5Mo)</p> </div> <input id="imageUpload-detail" type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*" /> </label> </div> {imagePreviews.length > 0 && ( <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"> {imagePreviews.map((previewUrl, index) => ( <div key={index} className="relative group"> <img src={previewUrl} alt={`Aperçu ${index + 1}`} className="h-24 w-full object-cover rounded-md border"/> <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 cursor-pointer" aria-label="Supprimer l'image"> <X className="h-3 w-3"/> </button> </div> ))} </div> )} {selectedFiles.length > 0 && <div className="mt-2 text-xs text-gray-600">Selectionne : {selectedFiles.map(f => f.name).join(', ')}</div>} </div> </> }
                </div>
                {advancementNotesHistory && advancementNotesHistory.length > 0 && ( <div className="mt-4 p-4 border rounded-md bg-slate-100"> <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-2">Historique d'Avancement :</h4> <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-200 p-3 rounded-md border custom-scrollbar"> {advancementNotesHistory.slice().reverse().map((note) => ( <div key={note.id} className="bg-white p-3 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5" onClick={() => setDetailedAdvancementNote(note)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetailedAdvancementNote(note);}} aria-label={`Voir les details de la note du ${new Date(note.date).toLocaleDateString()}`}> <div className="flex justify-between items-center mb-1"> <p className="text-xs text-gray-500"> {new Date(note.date).toLocaleDateString()} par {note.created_by_username || 'Système'} </p> {note.images && note.images.length > 0 && <Camera className="h-4 w-4 text-blue-500 flex-shrink-0" title={`${note.images.length} image(s)`}/>} </div> <p className="font-medium text-gray-800 whitespace-pre-wrap truncate text-sm"> {note.note.substring(0, 120)}{note.note.length > 120 ? '...' : ''} </p> <span className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center"> Voir les Details <ArrowRight className="h-3 w-3 ml-1"/> </span> </div> ))} </div> </div> )}
            </DialogContent>
            <DialogFooter> <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Fermer</Button> {currentUser.role === 'Admin' && !isTaskClosed && <Button variant="destructive" onClick={handleDeleteConfirmed} className="mr-auto" disabled={isSubmitting}>{isSubmitting && fieldErrors.submit?.includes("delete") ? 'Suppression en cours...' : <><Trash2 className="h-4 w-4 mr-2" /> Supprimer l'Ordre de travail</>}</Button>} { showSaveButton() && <Button onClick={handleSaveChanges} className="bg-green-600 text-white hover:bg-blue-700" disabled={isSubmitting || (isTaskClosed && currentUser.role !== 'Admin' && !advancementNote.trim() && selectedFiles.length === 0 && newStatus === task.status) } > {isSubmitting && !fieldErrors.submit?.includes("delete") ? 'Enregistrement...' :<><Save className="h-4 w-4 mr-2" /> {isTaskAssignedToCurrentUserChef && task.status === 'assigned' ? "Soumettre les Details" : "Enregistrer les Modifications"} </>} </Button> } </DialogFooter>
            {detailedAdvancementNote && ( <AdvancementNoteDetailsModal note={detailedAdvancementNote} isOpen={!!detailedAdvancementNote} onClose={() => setDetailedAdvancementNote(null)} onOpenLightbox={onOpenLightbox} /> )}
        </Dialog>
    );
};

export default TaskDetailsModal;

