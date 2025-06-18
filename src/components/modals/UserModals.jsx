// src/components/modals/UserModals.jsx
import React, { useState, useEffect } from 'react';
import { UserPlus, Save, UserCog } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Select, Label, ErrorMessage, Checkbox } from '../ui';

export const AddUserDialog = ({ isOpen, onClose, onAddUser }) => {
    const initialUserData = {
        username: '', email: '', password: '', confirmPassword: '',
        profile_name: '', profile_role: 'Chef de Parc', is_active: true,
    };
    const [userData, setUserData] = useState(initialUserData);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUserData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
        if (name === "password" && formErrors.confirmPassword) setFormErrors(prev => ({ ...prev, confirmPassword: null }));
    };

    const validateForm = () => {
        const errors = {};
        if (!userData.username.trim()) errors.username = "Le nom d'utilisateur est requis.";
        if (!userData.email.trim()) errors.email = "L'email est requis.";
        else if (!/\S+@\S+\.\S+/.test(userData.email)) errors.email = "Format d'email invalide.";
        if (!userData.password) errors.password = "Le mot de passe est requis.";
        else if (userData.password.length < 8) errors.password = "Le mot de passe doit contenir au moins 8 caractères.";
        if (userData.password !== userData.confirmPassword) errors.confirmPassword = "Les mots de passe ne correspondent pas.";
        if (!userData.profile_name.trim()) errors.profile_name = "Le nom du profil est requis.";
        if (!userData.profile_role) errors.profile_role = "Le rôle du profil est requis.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const payload = {
                username: userData.username, email: userData.email, password: userData.password,
                first_name: '', last_name: '', profile_name: userData.profile_name,
                profile_role: userData.profile_role, is_active: userData.is_active,
            };
            await onAddUser(payload);
            resetForm();
            onClose();
        } catch (error) {
            console.error("Erreur lors de l'ajout de l'utilisateur:", error);
            setFormErrors({ submit: error.message || "Échec de la création de l'utilisateur. Veuillez réessayer." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setUserData(initialUserData);
        setFormErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose} className="max-w-md">
            <DialogHeader>
                <DialogTitle id="add-user-title" className="flex items-center"><UserPlus className="h-6 w-6 mr-2 text-blue-600" />Ajouter un Nouvel Utilisateur</DialogTitle>
                <DialogDescription>Remplissez les informations ci-dessous pour créer un nouvel utilisateur et son profil.</DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                {formErrors.submit && <ErrorMessage message={formErrors.submit} className="mb-4 text-center" />}
                <div><Label htmlFor="username-add">Nom d'utilisateur</Label><Input id="username-add" name="username" value={userData.username} onChange={handleInputChange} className={formErrors.username ? 'ring-1 ring-red-500 border-red-500' : ''} /><ErrorMessage message={formErrors.username} /></div>
                <div><Label htmlFor="email-add">Email</Label><Input id="email-add" name="email" type="email" value={userData.email} onChange={handleInputChange} className={formErrors.email ? 'ring-1 ring-red-500 border-red-500' : ''} /><ErrorMessage message={formErrors.email} /></div>
                <div><Label htmlFor="password-add">Mot de passe</Label><Input id="password-add" name="password" type="password" value={userData.password} onChange={handleInputChange} className={formErrors.password ? 'ring-1 ring-red-500 border-red-500' : ''} /><ErrorMessage message={formErrors.password} /></div>
                <div><Label htmlFor="confirmPassword-add">Confirmer le mot de passe</Label><Input id="confirmPassword-add" name="confirmPassword" type="password" value={userData.confirmPassword} onChange={handleInputChange} className={formErrors.confirmPassword ? 'ring-1 ring-red-500 border-red-500' : ''} /><ErrorMessage message={formErrors.confirmPassword} /></div>
                <div><Label htmlFor="profile_name-add">Nom du Profil (Complet)</Label><Input id="profile_name-add" name="profile_name" value={userData.profile_name} onChange={handleInputChange} className={formErrors.profile_name ? 'ring-1 ring-red-500 border-red-500' : ''} /><ErrorMessage message={formErrors.profile_name} /></div>
                <div>
                    <Label htmlFor="profile_role-add">Rôle du Profil</Label>
                    <Select id="profile_role-add" name="profile_role" value={userData.profile_role} onChange={handleInputChange} className={formErrors.profile_role ? 'ring-1 ring-red-500 border-red-500' : ''}>
                        <option value="Admin">Admin</option>
                        <option value="Chef de Parc">Chef de Parc</option>
                    </Select>
                    <ErrorMessage message={formErrors.profile_role} />
                </div>
                <Checkbox id="is_active-add" name="is_active" checked={userData.is_active} onChange={handleInputChange} label="Actif" />
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Annuler</Button>
                <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-green-700" disabled={isSubmitting}>
                    {isSubmitting ? 'Ajout en cours...' : <><Save className="h-4 w-4 mr-2" /> Ajouter Utilisateur</>}
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export const EditUserDialog = ({ isOpen, onClose, onUpdateUser, userToEdit }) => {
    const [userData, setUserData] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    useEffect(() => {
        if (userToEdit && isOpen) {
            setUserData({
                id: userToEdit.id, username: userToEdit.username, email: userToEdit.email,
                password: '', confirmPassword: '', profile_name: userToEdit.profile_name || '',
                profile_role: userToEdit.profile_role || 'Chef de Parc',
                is_active: userToEdit.is_active !== undefined ? userToEdit.is_active : true,
            });
            setShowPasswordFields(false);
            setFormErrors({});
        }
    }, [userToEdit, isOpen]);

    if (!userToEdit || !isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUserData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
        if (name === "password" && formErrors.confirmPassword) setFormErrors(prev => ({ ...prev, confirmPassword: null }));
    };

    const validateForm = () => {
        const errors = {};
        if (!userData.email.trim()) errors.email = "L'email est requis.";
        else if (!/\S+@\S+\.\S+/.test(userData.email)) errors.email = "Format d'email invalide.";
        if (showPasswordFields) {
            if (!userData.password) errors.password = "Le nouveau mot de passe est requis si vous souhaitez le changer.";
            else if (userData.password.length < 8) errors.password = "Le mot de passe doit contenir au moins 8 caractères.";
            if (userData.password !== userData.confirmPassword) errors.confirmPassword = "Les mots de passe ne correspondent pas.";
        }
        if (!userData.profile_name.trim()) errors.profile_name = "Le nom du profil est requis.";
        if (!userData.profile_role) errors.profile_role = "Le rôle du profil est requis.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const payload = {
                email: userData.email, profile_name: userData.profile_name,
                profile_role: userData.profile_role, is_active: userData.is_active,
            };
            if (showPasswordFields && userData.password) payload.password = userData.password;
            await onUpdateUser(userData.id, payload);
            onClose();
        } catch (error) {
            console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
            setFormErrors({ submit: error.message || "Échec de la mise à jour de l'utilisateur. Veuillez réessayer." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setUserData({});
        setFormErrors({});
        setShowPasswordFields(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose} className="max-w-md">
            <DialogHeader>
                <DialogTitle id="edit-user-title" className="flex items-center"><UserCog className="h-6 w-6 mr-2 text-blue-600" />Modifier l'Utilisateur : {userToEdit.username}</DialogTitle>
                <DialogDescription>Mettez à jour les informations de l'utilisateur.</DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                {formErrors.submit && <ErrorMessage message={formErrors.submit} className="mb-4 text-center" />}
                <div><Label htmlFor="username-edit">Nom d'utilisateur (Non modifiable)</Label><Input id="username-edit" name="username" value={userData.username || ''} readOnly disabled className="bg-gray-200" /></div>
                <div><Label htmlFor="email-edit">Email</Label><Input id="email-edit" name="email" type="email" value={userData.email || ''} onChange={handleInputChange} className={formErrors.email ? 'ring-1 ring-red-500 border-red-500' : ''} /><ErrorMessage message={formErrors.email} /></div>
                <div><Label htmlFor="profile_name-edit">Nom du Profil (Complet)</Label><Input id="profile_name-edit" name="profile_name" value={userData.profile_name || ''} onChange={handleInputChange} className={formErrors.profile_name ? 'ring-1 ring-red-500 border-red-500' : ''} /><ErrorMessage message={formErrors.profile_name} /></div>
                <div>
                    <Label htmlFor="profile_role-edit">Rôle du Profil</Label>
                    <Select id="profile_role-edit" name="profile_role" value={userData.profile_role || 'Chef de Parc'} onChange={handleInputChange} className={formErrors.profile_role ? 'ring-1 ring-red-500 border-red-500' : ''}>
                        <option value="Admin">Admin</option>
                        <option value="Chef de Parc">Chef de Parc</option>
                    </Select>
                    <ErrorMessage message={formErrors.profile_role} />
                </div>
                <Checkbox id="is_active-edit" name="is_active" checked={userData.is_active || false} onChange={handleInputChange} label="Actif" />
                <div className="pt-2">
                    <Button variant="link" onClick={() => setShowPasswordFields(!showPasswordFields)} className="p-0 h-auto text-sm">
                        {showPasswordFields ? "Cacher les champs du mot de passe" : "Modifier le mot de passe ?"}
                    </Button>
                </div>
                {showPasswordFields && (
                    <>
                        <div><Label htmlFor="password-edit">Nouveau mot de passe (laisser vide pour ne pas changer)</Label><Input id="password-edit" name="password" type="password" value={userData.password} onChange={handleInputChange} className={formErrors.password ? 'ring-1 ring-red-500 border-red-500' : ''} /><ErrorMessage message={formErrors.password} /></div>
                        <div><Label htmlFor="confirmPassword-edit">Confirmer le nouveau mot de passe</Label><Input id="confirmPassword-edit" name="confirmPassword" type="password" value={userData.confirmPassword} onChange={handleInputChange} className={formErrors.confirmPassword ? 'ring-1 ring-red-500 border-red-500' : ''} /><ErrorMessage message={formErrors.confirmPassword} /></div>
                    </>
                )}
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Annuler</Button>
                <Button onClick={handleSubmit} className="bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitting}>
                    {isSubmitting ? 'Mise à jour...' : <><Save className="h-4 w-4 mr-2" /> Enregistrer les Modifications</>}
                </Button>
            </DialogFooter>
        </Dialog>
    );
};
