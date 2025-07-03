// src/components/modals/PreventiveTaskManagementModal.jsx
import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Edit3, Eye, Trash2, Search, Filter, Calendar, User, Wrench } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Select, Label } from '../ui';
import PreventiveTaskImageModal from './PreventiveTaskImageModal';
import { apiRequest } from '../../api/api';
import { cn, getTaskTypeLabel } from '../../utils';

const PreventiveTaskManagementModal = ({ 
    isOpen, 
    onClose, 
    currentUser,
    ordresImputation = [],
    technicians = []
}) => {
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Filters
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        type: '',
        ordreImputation: '',
        assignedTo: '',
        dateRange: { start: '', end: '' }
    });

    // Modal states
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskModalMode, setTaskModalMode] = useState('view'); // 'view', 'edit', 'create'
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // Check permissions
    const canManageTasks = currentUser && (
        currentUser.role === 'Admin' || 
        currentUser.role === 'Chef de Parc'
    );

    const canCreateTasks = currentUser && currentUser.role === 'Admin';

    // Load tasks when modal opens
    useEffect(() => {
        if (isOpen) {
            loadTasks();
        }
    }, [isOpen]);

    // Apply filters
    useEffect(() => {
        applyFilters();
    }, [tasks, filters]);

    const loadTasks = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            const response = await apiRequest('/tasks/');
            // Filter for preventive tasks only
            const preventiveTasks = response.filter(task => task.type === 'preventif');
            setTasks(preventiveTasks);
        } catch (err) {
            console.error('Error loading tasks:', err);
            setError(`Erreur lors du chargement: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...tasks];

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(task => 
                (task.task_id_display || task.id.toString()).toLowerCase().includes(searchLower) ||
                task.tasks.toLowerCase().includes(searchLower) ||
                (task.ordre?.value || '').toLowerCase().includes(searchLower) ||
                (task.assignedTo || '').toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (filters.status) {
            filtered = filtered.filter(task => task.status === filters.status);
        }

        // Type filter (though we're already filtering for preventif)
        if (filters.type) {
            filtered = filtered.filter(task => task.type === filters.type);
        }

        // Ordre Imputation filter
        if (filters.ordreImputation) {
            filtered = filtered.filter(task => task.ordre?.value === filters.ordreImputation);
        }

        // Assigned to filter
        if (filters.assignedTo) {
            filtered = filtered.filter(task => task.assignedTo === filters.assignedTo);
        }

        // Date range filter
        if (filters.dateRange.start || filters.dateRange.end) {
            filtered = filtered.filter(task => {
                const taskDate = new Date(task.created_at);
                const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
                const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
                
                if (startDate && taskDate < startDate) return false;
                if (endDate && taskDate > endDate) return false;
                return true;
            });
        }

        setFilteredTasks(filtered);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleDateRangeChange = (type, value) => {
        setFilters(prev => ({
            ...prev,
            dateRange: {
                ...prev.dateRange,
                [type]: value
            }
        }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            status: '',
            type: '',
            ordreImputation: '',
            assignedTo: '',
            dateRange: { start: '', end: '' }
        });
    };

    const openTaskModal = (task = null, mode = 'view') => {
        setSelectedTask(task);
        setTaskModalMode(mode);
        setIsTaskModalOpen(true);
    };

    const closeTaskModal = () => {
        setSelectedTask(null);
        setIsTaskModalOpen(false);
        // Reload tasks to get updated data
        loadTasks();
    };

    const handleTaskUpdate = (taskId) => {
        // Reload tasks after update
        loadTasks();
    };

    const deleteTask = async (taskId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche préventive ?')) {
            return;
        }

        try {
            await apiRequest(`/tasks/${taskId}/`, 'DELETE');
            await loadTasks();
        } catch (err) {
            console.error('Error deleting task:', err);
            setError(`Erreur lors de la suppression: ${err.message}`);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'assigned': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Assigné' },
            'in progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En Cours' },
            'closed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Clôturé' }
        };

        const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
        
        return (
            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", config.bg, config.text)}>
                {config.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    // Get unique values for filter dropdowns
    const uniqueStatuses = [...new Set(tasks.map(task => task.status))];
    const uniqueAssignees = [...new Set(tasks.map(task => task.assignedTo).filter(Boolean))];

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose} className="max-w-6xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                            <ClipboardList className="h-6 w-6 mr-2 text-blue-600" />
                            Gestion des Tâches Préventives
                        </div>
                        {canCreateTasks && (
                            <Button 
                                onClick={() => openTaskModal(null, 'create')}
                                className="bg-green-600 text-white hover:bg-green-700"
                                size="sm"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Nouvelle Tâche
                            </Button>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Gérez les tâches préventives et leurs images associées.
                        {!canManageTasks && " (Mode lecture seule)"}
                    </DialogDescription>
                </DialogHeader>

                <DialogContent className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Filters Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-700 flex items-center">
                                <Filter className="h-4 w-4 mr-2" />
                                Filtres
                            </h3>
                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                Effacer
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Search */}
                            <div>
                                <Label htmlFor="search-filter">Recherche</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="search-filter"
                                        placeholder="ID, description, OI..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <Label htmlFor="status-filter">Statut</Label>
                                <Select
                                    id="status-filter"
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="">Tous les statuts</option>
                                    {uniqueStatuses.map(status => (
                                        <option key={status} value={status}>
                                            {status === 'assigned' ? 'Assigné' :
                                             status === 'in progress' ? 'En Cours' :
                                             status === 'closed' ? 'Clôturé' : status}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {/* Ordre Imputation */}
                            <div>
                                <Label htmlFor="oi-filter">Ordre d'Imputation</Label>
                                <Select
                                    id="oi-filter"
                                    value={filters.ordreImputation}
                                    onChange={(e) => handleFilterChange('ordreImputation', e.target.value)}
                                >
                                    <option value="">Tous les OI</option>
                                    {ordresImputation.map(oi => (
                                        <option key={oi.id_ordre} value={oi.value}>
                                            {oi.value}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {/* Assigned To */}
                            <div>
                                <Label htmlFor="assigned-filter">Assigné à</Label>
                                <Select
                                    id="assigned-filter"
                                    value={filters.assignedTo}
                                    onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                                >
                                    <option value="">Tous les assignés</option>
                                    {uniqueAssignees.map(assignee => (
                                        <option key={assignee} value={assignee}>
                                            {assignee}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {/* Date Range */}
                            <div>
                                <Label htmlFor="date-start">Date début</Label>
                                <Input
                                    id="date-start"
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="date-end">Date fin</Label>
                                <Input
                                    id="date-end"
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-700">
                                Tâches Préventives ({filteredTasks.length})
                            </h3>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2">Chargement...</span>
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {tasks.length === 0 ? 'Aucune tâche préventive trouvée.' : 'Aucune tâche ne correspond aux filtres.'}
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {filteredTasks.map(task => (
                                    <div key={task.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center space-x-3">
                                                    <h4 className="font-medium text-blue-600">
                                                        {task.task_id_display || task.id}
                                                    </h4>
                                                    {getStatusBadge(task.status)}
                                                </div>
                                                
                                                <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <div className="flex items-center">
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        Créé: {formatDate(task.created_at)}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <User className="h-4 w-4 mr-1" />
                                                        {task.assignedTo || 'Non assigné'}
                                                    </div>
                                                    <div>OI: {task.ordre?.value || 'N/A'}</div>
                                                    <div className="flex items-center">
                                                        <Wrench className="h-4 w-4 mr-1" />
                                                        {task.technicien_names?.length || 0} technicien(s)
                                                    </div>
                                                </div>
                                                
                                                <p className="text-sm text-gray-700 line-clamp-2">
                                                    {task.tasks}
                                                </p>
                                                
                                                {task.advancement_notes && task.advancement_notes.length > 0 && (
                                                    <div className="text-xs text-blue-600">
                                                        {task.advancement_notes.reduce((total, note) => total + (note.images?.length || 0), 0)} image(s) attachée(s)
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col space-y-2 ml-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openTaskModal(task, 'view')}
                                                    className="text-blue-600 hover:text-blue-700"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Voir
                                                </Button>
                                                
                                                {canManageTasks && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openTaskModal(task, 'edit')}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            <Edit3 className="h-4 w-4 mr-1" />
                                                            Modifier
                                                        </Button>
                                                        
                                                        {currentUser.role === 'Admin' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => deleteTask(task.id)}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-1" />
                                                                Supprimer
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Fermer
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* Task Detail/Edit Modal */}
            <PreventiveTaskImageModal
                isOpen={isTaskModalOpen}
                onClose={closeTaskModal}
                taskData={selectedTask}
                currentUser={currentUser}
                onTaskUpdate={handleTaskUpdate}
                mode={taskModalMode}
            />
        </>
    );
};

export default PreventiveTaskManagementModal;