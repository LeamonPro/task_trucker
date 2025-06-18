// src/components/admin/AdminOiManagementView.jsx
import React from 'react';
import { Archive, Plus, Edit3, Trash2 } from 'lucide-react';
import { Button } from '../ui';

const AdminOiManagementView = ({ ordresImputation, onOpenOiFormModal, onDeleteOi, isLoading }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try { return new Date(dateString).toLocaleDateString('fr-CA'); }
        catch (e) { return 'Date Invalide'; }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <Archive className="h-12 w-12 text-purple-500 animate-pulse" />
                <p className="ml-3 text-gray-500">Chargement des Ordres d'Imputation...</p>
            </div>
        );
    }
    
    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-y-auto min-h-[calc(100vh-250px)] custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <Archive className="h-6 w-6 mr-2 text-purple-600" />
                    Gestion des Ordres d'Imputation (OI)
                </h2>
                <Button onClick={() => onOpenOiFormModal(null)} className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-5 w-5 mr-2" /> Ajouter un OI
                </Button>
            </div>
            {ordresImputation.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Aucun Ordre d'Imputation trouvé.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Ordre</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valeur (Nom)</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proch. Visite Cycle</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Heures Travail</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernier Seuil Notifié</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {ordresImputation.map((oi) => (
                                <tr key={oi.id_ordre} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{oi.id_ordre}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{oi.value}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(oi.date_prochain_cycle_visite)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{oi.total_hours_of_work || '0.00'}h</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{oi.last_notified_threshold || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => onOpenOiFormModal(oi)} className="text-blue-600 hover:text-blue-700">
                                            <Edit3 className="h-4 w-4 mr-1" /> Modifier
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => onDeleteOi(oi.id_ordre, oi.value)} className="text-red-600 hover:text-red-700">
                                            <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminOiManagementView;
