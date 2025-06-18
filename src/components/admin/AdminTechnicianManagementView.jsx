// src/components/admin/AdminTechnicianManagementView.jsx
import React from 'react';
import { Wrench, Plus, Edit3, Trash2 } from 'lucide-react';
import { Button } from '../ui';

const AdminTechnicianManagementView = ({ technicians, onOpenTechnicianFormModal, onDeleteTechnician, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <Wrench className="h-12 w-12 text-blue-500 animate-pulse" />
                <p className="ml-3 text-gray-500">Chargement des techniciens...</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-y-auto min-h-[calc(100vh-250px)] custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <Wrench className="h-6 w-6 mr-2 text-blue-600" />
                    Gestion des Techniciens
                </h2>
                <Button onClick={() => onOpenTechnicianFormModal(null)} className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-5 w-5 mr-2" /> Ajouter un Technicien
                </Button>
            </div>
            {technicians.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Aucun technicien trouvé.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Technicien</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {technicians.map((technician) => (
                                <tr key={technician.id_technician} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{technician.id_technician}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{technician.name}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => onOpenTechnicianFormModal(technician)} className="text-blue-600 hover:text-blue-700">
                                            <Edit3 className="h-4 w-4 mr-1" /> Modifier
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => onDeleteTechnician(technician.id_technician, technician.name)} className="text-red-600 hover:text-red-700">
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

export default AdminTechnicianManagementView;
