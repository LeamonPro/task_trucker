// src/components/admin/AdminViews.jsx
import React from 'react';
import { UsersRound, FileText, Settings2, ClipboardList, Wrench } from 'lucide-react';
import { Button } from '../ui';

export const AdminUserManagementView = ({ users, onAddUserClick, onEditUserClick, onDeleteUser, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <UsersRound className="h-12 w-12 text-blue-500 animate-pulse" />
                <p className="ml-3 text-gray-500">Chargement des utilisateurs...</p>
            </div>
        );
    }
    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-y-auto min-h-[calc(100vh-250px)] custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <UsersRound className="h-6 w-6 mr-2 text-blue-600" /> Gestion des Utilisateurs
                </h2>
                <Button onClick={onAddUserClick} className="bg-green-600 hover:bg-green-700 text-white">
                    <UsersRound className="h-5 w-5 mr-2" /> Ajouter un Utilisateur
                </Button>
            </div>
            {users.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Aucun utilisateur trouvé.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom d'utilisateur</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du Profil</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{user.profile_name || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{user.profile_role || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.is_active ? 'Actif' : 'Inactif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => onEditUserClick(user)} className="text-blue-600 hover:text-blue-700">Modifier</Button>
                                        <Button variant="destructive" size="sm" onClick={() => onDeleteUser(user.id, user.username)} className="text-red-600 hover:text-red-700">Supprimer</Button>
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

export const AdminPreventiveTemplatesView = ({ templates, onAddClick, onEditClick, onDeleteClick, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <Settings2 className="h-12 w-12 text-blue-500 animate-spin" />
                <p className="ml-3 text-gray-500">Chargement des modèles préventifs...</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-y-auto min-h-[calc(100vh-250px)] custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <ClipboardList className="h-6 w-6 mr-2 text-orange-600" />
                    Gestion des Modèles de Tâches Préventives
                </h2>
                <Button onClick={onAddClick} className="bg-green-600 hover:bg-green-700 text-white">
                    <Settings2 className="h-5 w-5 mr-2" /> Ajouter un Modèle
                </Button>
            </div>
            {templates.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Aucun modèle de tâche préventive trouvé.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordre d'Imputation</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heures Décl.</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description (Checklist)</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {templates.map((template) => (
                                <tr key={template.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{template.title}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{template.ordre_imputation_value || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{template.trigger_hours}h</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={template.description}>{template.description}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => onEditClick(template)} className="text-blue-600 hover:text-blue-700">Modifier</Button>
                                        <Button variant="destructive" size="sm" onClick={() => onDeleteClick(template.id, template.title)} className="text-red-600 hover:text-red-700">Supprimer</Button>
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
