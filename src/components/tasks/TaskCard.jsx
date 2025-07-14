// src/components/tasks/TaskCard.jsx
import React from 'react';
import { Edit3, Info, FileText } from 'lucide-react';
import { cn, getTaskTypeLabel } from '../../utils';

const TaskCard = ({ task, onClick, currentUser }) => (
    <div 
        className="rounded-lg p-4 mb-3 bg-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        onClick={() => onClick(task)} 
        role="button" 
        tabIndex={0} 
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(task); }} 
        aria-label={`Voir les details pour l'ordre de travail ${task.task_id_display || task.id}`}
    >
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg text-blue-600 hover:text-blue-700 truncate" title={task.task_id_display || `Tâche ID: ${task.id}`}>
                {task.task_id_display || `Tâche ID: ${task.id}`}
            </h3>
            <div className="flex items-center space-x-2">
                {task.permis_de_travail && <FileText className="h-5 w-5 text-red-500" title="Permis de travail requis" />}
                {(currentUser.role === 'Chef de Parc' && task.assignedTo?.trim() === currentUser.name?.trim() && task.status !== 'closed') || (currentUser.role === 'Admin') ? (
                    <Edit3 className="h-5 w-5 text-blue-500 hover:text-blue-700 flex-shrink-0" title="Modifier ou Voir les Details de l'Ordre de travail"/>
                ) : (
                    currentUser.role === 'Admin' && <Info className="h-5 w-5 text-gray-400 hover:text-gray-600 flex-shrink-0" title="Voir les Details de l'Ordre de travail"/>
                )}
            </div>
        </div>

        {task.ordre?.value && <p className="text-xs text-gray-500 mb-1">Ordre d'Imputation: <span className="font-medium">{task.ordre.value}</span></p>}
        {task.ordre?.date_prochain_cycle_visite && <p className="text-xs text-purple-600 mb-0.5">Proch. Visite OI: <span className="font-medium">{new Date(task.ordre.date_prochain_cycle_visite).toLocaleDateString()}</span></p>}
        {task.ordre?.dernier_cycle_visite_resultat !== null && task.ordre?.dernier_cycle_visite_resultat !== undefined && <p className="text-xs mb-1">Dern. Visite OI: <span className={cn("font-medium ml-1", task.ordre.dernier_cycle_visite_resultat ? "text-green-600" : "text-red-600")}> {task.ordre.dernier_cycle_visite_resultat ? "Acceptée" : "Échouée"} </span> {task.ordre.date_derniere_visite_effectuee && ` (le ${new Date(task.ordre.date_derniere_visite_effectuee).toLocaleDateString()})`} </p>}
        
        <p className="text-sm text-gray-600 mb-1">Type : <span className="font-medium capitalize">{getTaskTypeLabel(task.type)}</span></p>
        
        {task.start_date && <p className="text-xs text-gray-500">Debut : {task.start_date} {task.start_time && `à ${task.start_time.substring(0, 5)}`} {task.end_date && `| Fin : ${task.end_date}`}</p>}
        
        <p className="text-xs text-gray-500 mb-3 truncate pt-1" title={task.tasks}>Resume : {task.tasks}</p>

        <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-2 items-center">
            <span>Statut : <span className={`font-semibold capitalize px-2 py-1 rounded-full text-xs shadow-sm ${ task.status === 'assigned' ? 'bg-blue-100 text-blue-700 border border-blue-300' : task.status === 'in progress' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-green-100 text-green-700 border border-green-300' }`}>{task.status.replace('_', ' ')}</span></span>
            <span>Assigne à : <span className="font-medium text-gray-700">{task.assignedTo || 'N/A'}</span></span>
            {task.technicien_names && task.technicien_names.length > 0 && <span>Techniciens : <span className="font-medium text-gray-700">{task.technicien_names.join(', ')}</span></span>}
            
            {task.estimated_hours && <span>Heures Est. : <span className="font-medium text-gray-700">{task.estimated_hours}h</span></span>}
            {task.status === 'closed' && task.actual_hours_worked && (
                <span>Total Heures Travail : <span className="font-medium text-gray-700">{parseFloat(task.actual_hours_worked).toFixed(2)}h</span></span>
            )}
            {task.closed_at && <span className="text-red-600">Clôturé le : <span className="font-medium">{new Date(task.closed_at).toLocaleDateString()}</span></span>}
        </div>
    </div>
);

export default TaskCard;