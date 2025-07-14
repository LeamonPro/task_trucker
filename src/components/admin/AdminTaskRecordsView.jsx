// src/components/admin/AdminTaskRecordsView.jsx
import React, { useState } from 'react';
import { FileText, ListChecks, FileDown, Briefcase, ZoomIn } from 'lucide-react';
import { Button, Input, Select, Label, ErrorMessage } from '../ui';
import AdvancementNoteDetailsModal from '../modals/AdvancementNoteDetailsModal';
import { apiRequest } from '../../api/api';
import { getTaskTypeLabel } from '../../utils';

const AdminTaskRecordsView = ({ ordresImputation, technicians, onOpenLightbox }) => {
    const [reportFilters, setReportFilters] = useState({ startDate: '', endDate: '', ordreImputationValue: [], technicienIds: [] });
    const [reportData, setReportData] = useState([]);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [reportError, setReportError] = useState('');
    const [detailedAdvancementNote, setDetailedAdvancementNote] = useState(null);

    const handleFilterChange = (e) => {
        const { name, value, options } = e.target;
        if ((name === 'ordreImputationValue' || name === 'technicienIds') && e.target.multiple) {
            const selectedValues = Array.from(options).filter(option => option.selected).map(option => option.value);
            setReportFilters(prev => ({ ...prev, [name]: selectedValues }));
        } else {
            setReportFilters(prev => ({ ...prev, [name]: value }));
        }
        setReportError('');
    };

    const fetchTaskRecords = async (format = 'json') => {
        setIsLoadingReport(true);
        setReportError('');
        setReportData([]);
        let queryParams = new URLSearchParams();
        if (reportFilters.startDate && reportFilters.endDate) {
            queryParams.append('start_date', reportFilters.startDate);
            queryParams.append('end_date', reportFilters.endDate);
        } else if (reportFilters.startDate || reportFilters.endDate) {
            setReportError("Les deux dates (début et fin) sont requises pour filtrer par période.");
            setIsLoadingReport(false);
            return;
        }
        if (reportFilters.ordreImputationValue && reportFilters.ordreImputationValue.length > 0) {
            reportFilters.ordreImputationValue.forEach(oiValue => {
                queryParams.append('ordre_imputation_value', oiValue);
            });
        }
        if (reportFilters.technicienIds && reportFilters.technicienIds.length > 0) {
            reportFilters.technicienIds.forEach(techId => {
                queryParams.append('technicien_id', techId);
            });
        }
        if (format === 'pdf') queryParams.append('format', 'pdf');
        
        if (format === 'pdf' && !reportFilters.startDate && !reportFilters.endDate && reportFilters.ordreImputationValue.length === 0) {
            setReportError("Veuillez sélectionner un Ordre d'Imputation ou une plage de dates pour générer le rapport PDF.");
            setIsLoadingReport(false);
            return;
        }

        try {
            const endpoint = `/admin/task-reports/?${queryParams.toString()}`;
            if (format === 'pdf') {
                const blob = await apiRequest(endpoint, 'GET', null, false, 'blob');
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rapport_taches_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } else {
                const data = await apiRequest(endpoint);
                const processedData = (data || []).map(task => ({
                    ...task,
                    task_id_display: task.task_id_display || `ORDT-${task.id}`,
                    advancement_notes: (task.advancement_notes || []).map(note => ({
                        ...note,
                        task_display_id: note.task_display_id || task.task_id_display || `ORDT-${task.id}`,
                        images: note.images || []
                    }))
                }));
                setReportData(processedData);
                if (!processedData || processedData.length === 0) setReportError("Aucune tâche trouvée pour les critères sélectionnés.");
            }
        } catch (error) {
            console.error(`Erreur lors de la récupération des rapports (${format}):`, error);
            setReportError(error.message || `Échec de la récupération des données du rapport (${format}).`);
            setReportData([]);
        } finally {
            setIsLoadingReport(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-CA');
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow min-h-[calc(100vh-250px)] custom-scrollbar">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-6">
                <FileText className="h-6 w-6 mr-2 text-blue-600" /> Rapports d'Activités des Tâches
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-md bg-slate-50 shadow">
                <div>
                    <Label htmlFor="startDate-report">Date de Début</Label>
                    <Input type="date" id="startDate-report" name="startDate" value={reportFilters.startDate} onChange={handleFilterChange} className="bg-white"/>
                </div>
                <div>
                    <Label htmlFor="endDate-report">Date de Fin</Label>
                    <Input type="date" id="endDate-report" name="endDate" value={reportFilters.endDate} onChange={handleFilterChange} className="bg-white"/>
                </div>
                <div>
                    <Label htmlFor="ordreImputationValue-report">Ordre d'Imputation</Label>
                    <Select 
                        id="ordreImputationValue-report" 
                        name="ordreImputationValue" 
                        multiple 
                        value={reportFilters.ordreImputationValue} 
                        onChange={handleFilterChange} 
                        className="bg-white min-h-[100px]"
                    >
                        {ordresImputation.map(oi => (
                            <option key={oi.id_ordre} value={oi.value}>{oi.value}</option>
                        ))}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="technicienIds-report">Techniciens</Label>
                    <Select
                        id="technicienIds-report"
                        name="technicienIds"
                        multiple
                        value={reportFilters.technicienIds}
                        onChange={handleFilterChange}
                        className="bg-white min-h-[100px]"
                    >
                        {technicians.map(tech => (
                            <option key={tech.id_technician} value={tech.id_technician}>{tech.name}</option>
                        ))}
                    </Select>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mb-6">
                <Button onClick={() => fetchTaskRecords('json')} disabled={isLoadingReport} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <ListChecks className="h-5 w-5 mr-2" /> {isLoadingReport && reportData.length === 0 ? 'Chargement...' : "Afficher les Tâches"}
                </Button>
                <Button onClick={() => fetchTaskRecords('pdf')} disabled={isLoadingReport} className="bg-green-600 hover:bg-green-700 text-white">
                    <FileDown className="h-5 w-5 mr-2" /> {isLoadingReport && reportData.length > 0 ? 'Génération PDF...' : "Télécharger en PDF"}
                </Button>
            </div>
            {reportError && !isLoadingReport && <ErrorMessage message={reportError} className="text-center text-lg mb-4 p-3 bg-red-100 text-red-700 rounded-md" />}
            {isLoadingReport && reportData.length === 0 && !reportError && (
                <div className="text-center py-10">
                    <Briefcase className="h-12 w-12 text-blue-500 animate-pulse mx-auto mb-2" />
                    <p className="text-gray-500">Chargement des données du rapport...</p>
                </div>
            )}
            {!isLoadingReport && reportData.length > 0 && (
                <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar border p-4 rounded-md bg-slate-50 shadow-inner">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 sticky top-0 bg-slate-50 py-2 z-10 border-b">Résultats ({reportData.length} tâches trouvées)</h3>
                    {reportData.map(task => (
                        <div key={task.id} className="p-3 border rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-blue-700 text-md">ID Tâche: {task.task_id_display || task.id}</h4>
                            <p className="text-xs text-gray-500">O.I.: {task.ordre?.value || 'N/A'} | Type: {getTaskTypeLabel(task.type)} | Statut: <span className="font-medium capitalize">{task.status?.replace('_', ' ')}</span></p>
                            <p className="text-sm my-1"><strong>Description:</strong> <span className="whitespace-pre-wrap">{task.tasks}</span></p>
                            <p className="text-xs"><strong>Chef de Parc:</strong> {task.assignedTo || 'N/A'}</p>
                            <p className="text-xs"><strong>Techniciens:</strong> {task.technicien_names?.join(', ') || 'N/A'}</p>
                            <p className="text-xs"><strong>Heures Travail:</strong> {task.hours_of_work !== null && task.hours_of_work !== undefined ? `${task.hours_of_work}h` : 'N/A'}</p>
                            <p className="text-xs"><strong>Dates:</strong> Début: {formatDate(task.start_date)} - Fin: {formatDate(task.end_date)}</p>
                            <p className="text-xs"><strong>Créé le:</strong> {formatDate(task.created_at)} | <strong>Mis à jour le:</strong> {formatDate(task.updated_at)}</p>
                            {task.advancement_notes && task.advancement_notes.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-200">
                                    <h5 className="text-xs font-semibold text-gray-600 mb-1">Notes d'Avancement ({task.advancement_notes.length}):</h5>
                                    <ul className="list-disc list-inside space-y-1 pl-2 max-h-40 overflow-y-auto custom-scrollbar bg-slate-100 p-2 rounded">
                                        {task.advancement_notes.slice().reverse().map(note => (
                                            <li key={note.id} className="text-xs text-gray-700">
                                                <span className="font-medium">{formatDate(note.date)} ({note.created_by_username || 'Système'}):</span> {note.note.substring(0,150)}{note.note.length > 150 ? '...' : ''}
                                                {note.images && note.images.length > 0 && (
                                                    <span className="ml-2 text-blue-500 cursor-pointer hover:underline" title="Voir détails de la note et images" onClick={() => { const noteWithContext = {...note, task_display_id: task.task_id_display || `ORDT-${task.id}`}; setDetailedAdvancementNote(noteWithContext); }} >
                                                        ({note.images.length} image{note.images.length > 1 ? 's' : ''} <ZoomIn className="h-3 w-3 inline-block"/>)
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {detailedAdvancementNote && (
                <AdvancementNoteDetailsModal note={detailedAdvancementNote} isOpen={!!detailedAdvancementNote} onClose={() => setDetailedAdvancementNote(null)} onOpenLightbox={onOpenLightbox} />
            )}
        </div>
    );
};

export default AdminTaskRecordsView;