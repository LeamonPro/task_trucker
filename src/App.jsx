import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Bell, LogOut, Briefcase, Wrench, CheckCircle, Clock, UsersRound, Archive, FileText, ClipboardList, Hourglass } from 'lucide-react';
import { apiRequest, getAuthToken } from './api/api';
import LoginView from './components/auth/LoginView';
import TaskCard from './components/tasks/TaskCard';
import NotificationDropdown from './components/common/NotificationDropdown';
import ImageLightbox from './components/common/ImageLightbox';
import AddTaskModal from './components/modals/AddTaskModal';
import AddTaskChefModal from './components/modals/AddTaskChefModal';
import TaskDetailsModal from './components/modals/TaskDetailsModal';
import { AddUserDialog, EditUserDialog } from './components/modals/UserModals';
import { CycleVisiteModal, AdminCycleVisitInfoModal } from './components/modals/CycleVisiteModals';
import { PreventiveTemplateModal, PreventiveChecklistModal } from './components/modals/PreventiveModals';
import OiFormModal from './components/modals/OiFormModal';
import TechnicianFormModal from './components/modals/TechnicianFormModal';
import AdminOiManagementView from './components/admin/AdminOiManagementView';
import { AdminUserManagementView, AdminPreventiveTemplatesView } from './components/admin/AdminViews';
import AdminTaskRecordsView from './components/admin/AdminTaskRecordsView';
import AdminTechnicianManagementView from './components/admin/AdminTechnicianManagementView';
import ChangeOiHoursView from './components/modals/ChangeOiHoursView';
import { Button } from './components/ui';
import { cn } from './utils';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('assigned');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddTaskChefModalOpen, setIsAddTaskChefModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [chefsDeParc, setChefsDeParc] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [ordresImputation, setOrdresImputation] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [lightboxImage, setLightboxImage] = useState({ src: null, alt: null, isOpen: false });
  const [currentView, setCurrentView] = useState('tasks');
  const [adminUsers, setAdminUsers] = useState([]);
  const [isLoadingAdminUsers, setIsLoadingAdminUsers] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isCycleVisiteModalOpen, setIsCycleVisiteModalOpen] = useState(false);
  const [selectedOrdreForCycleVisite, setSelectedOrdreForCycleVisite] = useState(null);
  const [isAdminCycleVisitInfoModalOpen, setIsAdminCycleVisitInfoModalOpen] = useState(false);
  const [selectedNotificationForAdminInfo, setSelectedNotificationForAdminInfo] = useState(null);
  const [preventiveTaskTemplates, setPreventiveTaskTemplates] = useState([]);
  const [isLoadingPreventiveTemplates, setIsLoadingPreventiveTemplates] = useState(false);
  const [isPreventiveTemplateModalOpen, setIsPreventiveTemplateModalOpen] = useState(false);
  const [editingPreventiveTemplate, setEditingPreventiveTemplate] = useState(null);
  const [isPreventiveChecklistModalOpen, setIsPreventiveChecklistModalOpen] = useState(false);
  const [preventiveChecklistData, setPreventiveChecklistData] = useState(null);
  const [isLoadingOis, setIsLoadingOis] = useState(false);
  const [isOiFormModalOpen, setIsOiFormModalOpen] = useState(false);
  const [editingOi, setEditingOi] = useState(null);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false);
  const [isTechnicianFormModalOpen, setIsTechnicianFormModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState(null);

  const handleLogin = async (username, password) => {
    setLoginError('');
    setIsLoadingData(true);
    try {
      const data = await apiRequest('/auth-token/', 'POST', { username, password });
      localStorage.setItem('authToken', data.token);
      const loggedInUser = {
        token: data.token,
        user_id: data.user_id,
        username: data.username,
        name: data.name,
        role: data.role,
      };
      setCurrentUser(loggedInUser);
      localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
      setIsNotificationOpen(false);
      if (loggedInUser.role === 'Admin' || loggedInUser.role === 'Chef de Parc') {
        setFilter('assigned');
      } else {
        setFilter('assigned');
      }
      setCurrentView('tasks');
    } catch (error) {
      setLoginError(error.message || 'Nom d\'utilisateur ou mot de passe invalide.');
      setCurrentUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    } finally {
        setIsLoadingData(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('taskFilter');
    setCurrentUser(null);
    setTasks([]);
    setNotifications([]);
    setChefsDeParc([]);
    setTechnicians([]);
    setOrdresImputation([]);
    setAdminUsers([]);
    setLoginError('');
    setFilter('assigned');
    setCurrentView('tasks');
    setIsNotificationOpen(false);
    setIsLoadingData(false);
    setLightboxImage({ src: null, alt: null, isOpen: false });
    setIsCycleVisiteModalOpen(false);
    setSelectedOrdreForCycleVisite(null);
    setIsAdminCycleVisitInfoModalOpen(false);
    setSelectedNotificationForAdminInfo(null);
    setPreventiveTaskTemplates([]);
    setIsLoadingPreventiveTemplates(false);
    setIsPreventiveTemplateModalOpen(false);
    setEditingPreventiveTemplate(null);
    setIsPreventiveChecklistModalOpen(false);
    setPreventiveChecklistData(null);
    setIsOiFormModalOpen(false);
    setEditingOi(null);
    setIsTechnicianFormModalOpen(false);
    setEditingTechnician(null);
    setIsLoadingTechnicians(false);
  };

  const fetchOrdresImputationList = useCallback(async () => {
    if (!currentUser || !getAuthToken()) {
        setOrdresImputation([]);
        return;
    }
    setIsLoadingOis(true);
    try {
        const ordresData = await apiRequest('/ordres-imputation/');
        setOrdresImputation(ordresData || []);
    } catch (error) {
        console.error("Erreur lors de la récupération des Ordres d'Imputation:", error);
        setLoginError(prev => `${prev ? prev + '; ' : ''}Erreur chargement OIs: ${error.message}`);
        setOrdresImputation([]);
    } finally {
        setIsLoadingOis(false);
    }
  }, [currentUser]);

  const fetchTechniciansList = useCallback(async () => {
    if (!currentUser || !getAuthToken()) {
        setTechnicians([]);
        return;
    }
    setIsLoadingTechnicians(true);
    try {
        const techniciansData = await apiRequest('/technicians/');
        setTechnicians(techniciansData || []);
    } catch (error) {
        console.error("Erreur lors de la récupération des Techniciens:", error);
        setLoginError(prev => `${prev ? prev + '; ' : ''}Erreur chargement Techniciens: ${error.message}`);
        setTechnicians([]);
    } finally {
        setIsLoadingTechnicians(false);
    }
  }, [currentUser]);

  const fetchTaskData = useCallback(async () => {
    if (!currentUser || !getAuthToken()) {
      return;
    }
    setLoginError('');
    const apiPromises = [
      apiRequest('/tasks/'),
      apiRequest('/technicians/'),
      apiRequest('/ordres-imputation/'),
      apiRequest('/notifications/')
    ];
    if (currentUser.role === 'Admin') {
      apiPromises.splice(1, 0, apiRequest('/userprofiles/by-role/Chef%20de%20Parc/'));
    } else {
      apiPromises.splice(1, 0, Promise.resolve([]));
    }
    try {
      const [tasksData, chefsDataResult, techsData, ordresData, notifsData] = await Promise.all(apiPromises);
      const processedTasks = (tasksData || []).map(task => ({
        ...task,
        task_id_display: task.task_id_display || `ORDT-${task.id}`,
        ordre: task.ordre ? { ...task.ordre, date_prochain_cycle_visite: task.ordre.date_prochain_cycle_visite || null, date_derniere_visite_effectuee: task.ordre.date_derniere_visite_effectuee || null, dernier_cycle_visite_resultat: task.ordre.dernier_cycle_visite_resultat === undefined ? null : task.ordre.dernier_cycle_visite_resultat, } : null,
        advancement_notes: (task.advancement_notes || []).map(note => ({ ...note, task_display_id: note.task_display_id || task.task_id_display || `ORDT-${task.id}`, images: note.images || [] }))
      }));
      setTasks(processedTasks);
      setChefsDeParc(chefsDataResult || []);
      setTechnicians(techsData || []);
      setOrdresImputation(ordresData || []);
      setNotifications(notifsData || []);
    } catch (error) {
      console.error("echec de la recuperation des donnees initiales (tasks):", error);
      const errorMessage = error.message || "Une erreur inconnue s'est produite.";
      if (error.message && error.message.includes("permission")) {
        setLoginError(`Erreur de permission lors du chargement des donnees : ${errorMessage}. Assurez-vous que votre rôle utilisateur est correctement defini. Déconnexion/reconnexion peut être nécessaire.`);
      } else if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        setLoginError(`Erreur Reseau : Impossible de se connecter au serveur à ${apiRequest.API_BASE_URL}. Verifiez la connexion et le serveur.`);
      } else {
        setLoginError(`echec du chargement des donnees : ${errorMessage}. Essayez de vous reconnecter.`);
      }
      setTasks([]);
      setChefsDeParc([]);
      setTechnicians([]);
      setOrdresImputation([]);
      setNotifications([]);
    }
  }, [currentUser]);

  const fetchAdminUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'Admin' || !getAuthToken()) {
      setAdminUsers([]);
      return;
    }
    setIsLoadingAdminUsers(true);
    setLoginError('');
    try {
      const usersData = await apiRequest('/admin/users/');
      setAdminUsers(usersData || []);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs (admin):", error);
      setLoginError(prev => `${prev ? prev + '; ' : ''}Erreur chargement utilisateurs: ${error.message}`);
      setAdminUsers([]);
    } finally {
      setIsLoadingAdminUsers(false);
    }
  }, [currentUser]);

  const fetchPreventiveTaskTemplates = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'Admin' || !getAuthToken()) {
        setPreventiveTaskTemplates([]);
        return;
    }
    setIsLoadingPreventiveTemplates(true);
    setLoginError('');
    try {
        const templatesData = await apiRequest('/admin/preventive-task-templates/');
        setPreventiveTaskTemplates(templatesData || []);
    } catch (error) {
        console.error("Erreur lors de la récupération des modèles préventifs (admin):", error);
        setLoginError(prev => `${prev ? prev + '; ' : ''}Erreur chargement modèles préventifs: ${error.message}`);
        setPreventiveTaskTemplates([]);
    } finally {
        setIsLoadingPreventiveTemplates(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const storedUserString = localStorage.getItem('currentUser');
    const token = getAuthToken();
    if (storedUserString && token) {
      try {
        const storedUser = JSON.parse(storedUserString);
        setCurrentUser(storedUser);
        const validFilters = ['assigned', 'in progress', 'closed'];
        const storedFilter = localStorage.getItem('taskFilter');
        let initialFilter = 'assigned';
        if (storedFilter && validFilters.includes(storedFilter)) {
          initialFilter = storedFilter;
        } else if (storedUser.role === 'Admin' || storedUser.role === 'Chef de Parc') {
          initialFilter = 'assigned';
        }
        setFilter(initialFilter);
        setCurrentView('tasks');
      } catch (e) {
        console.error("Erreur lors de l'analyse de l'utilisateur stocke:", e);
        handleLogout();
      }
    } else {
        setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (currentUser && token) {
        setIsLoadingData(true);
        let dataFetchPromise = Promise.resolve();
        if (currentView === 'tasks') {
            dataFetchPromise = fetchTaskData();
            localStorage.setItem('taskFilter', filter);
        } else if (currentView === 'userManagement' && currentUser.role === 'Admin') {
            dataFetchPromise = fetchAdminUsers();
        } else if (currentView === 'taskRecords' && currentUser.role === 'Admin') {
            if (ordresImputation.length === 0) {
                fetchOrdresImputationList(); 
            }
            if (technicians.length === 0) {
                fetchTechniciansList();
            }
        } else if (currentView === 'preventiveTemplates' && currentUser.role === 'Admin') {
            dataFetchPromise = fetchPreventiveTaskTemplates();
            if (ordresImputation.length === 0) {
                 fetchOrdresImputationList();
            }
        } else if (currentView === 'oiManagement' && currentUser.role === 'Admin') {
            dataFetchPromise = fetchOrdresImputationList();
        } else if (currentView === 'technicianManagement' && currentUser.role === 'Admin') {
            dataFetchPromise = fetchTechniciansList();
        } else if (currentView === 'changeOiHours' && (currentUser.role === 'Admin' || currentUser.role === 'Chef de Parc')) {
            dataFetchPromise = fetchOrdresImputationList();
        }
        dataFetchPromise
            .catch(err => { console.error("Error during data fetch in main useEffect:", err); })
            .finally(() => { setIsLoadingData(false); });
    } else {
        setIsLoadingData(false);
        setTasks([]);
        setNotifications([]);
        setChefsDeParc([]);
        setTechnicians([]);
        setOrdresImputation([]);
        setAdminUsers([]);
        setPreventiveTaskTemplates([]);
        setLoginError('');
    }
  }, [currentUser, currentView, filter, fetchTaskData, fetchAdminUsers, fetchPreventiveTaskTemplates, fetchOrdresImputationList, fetchTechniciansList, ordresImputation.length, technicians.length]);

  const markNotificationAsRead = useCallback(async (id) => { if (!id) return; if (String(id).startsWith('local-')) { setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); return; } try { await apiRequest(`/notifications/${id}/mark-as-read/`, 'POST'); setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); } catch (error) { console.error("echec du marquage de la notification comme lue:", error); } }, []);
  const markAllNotificationsAsRead = async () => { try { await apiRequest('/notifications/mark-all-as-read/', 'POST'); setNotifications(prev => prev.map(n => ({ ...n, read: true }) )); } catch (error) { console.error("echec du marquage de toutes les notifications API comme lues:", error); } };
  const handleClearAllNotificationsFrontend = useCallback(() => { setNotifications([]); setIsNotificationOpen(false); }, []);
  const userNotifications = useMemo(() => { if (!currentUser) return []; return notifications; }, [notifications, currentUser]);
  const unreadNotificationCount = useMemo(() => userNotifications.filter(n => !n.read).length, [userNotifications]);
  const handleAddTask = async (taskPayload) => { const newTask = await apiRequest('/tasks/', 'POST', taskPayload); await fetchTaskData(); return newTask; };
  const handleDeleteTask = async (taskId) => { await apiRequest(`/tasks/${taskId}/`, 'DELETE'); await fetchTaskData(); setSelectedTask(null); };
  const handleUpdateTask = async (taskId, updatesPayload) => { const updatedTask = await apiRequest(`/tasks/${taskId}/`, 'PATCH', updatesPayload); await fetchTaskData(); if (selectedTask && selectedTask.id === taskId) { try { const refreshedSelectedTask = await apiRequest(`/tasks/${taskId}/`); if (refreshedSelectedTask) { setSelectedTask({ ...refreshedSelectedTask, id: String(refreshedSelectedTask.id), ordre: refreshedSelectedTask.ordre ? { ...refreshedSelectedTask.ordre, date_prochain_cycle_visite: refreshedSelectedTask.ordre.date_prochain_cycle_visite || null, date_derniere_visite_effectuee: refreshedSelectedTask.ordre.date_derniere_visite_effectuee || null, dernier_cycle_visite_resultat: refreshedSelectedTask.ordre.dernier_cycle_visite_resultat === undefined ? null : refreshedSelectedTask.ordre.dernier_cycle_visite_resultat, } : null, advancement_notes: (refreshedSelectedTask.advancement_notes || []).map(note => ({ ...note, task_display_id: note.task_display_id || refreshedSelectedTask.task_id_display || `ORDT-${refreshedSelectedTask.id}`, images: note.images || [] })) }); } else { setSelectedTask(null); } } catch (error) { console.error("Failed to refresh selected task details:", error); setSelectedTask(null); } } return updatedTask; };
  const handlePrintTask = async (taskId) => {
    try {
        const blob = await apiRequest(`/tasks/${taskId}/print/`, 'GET', null, false, 'blob');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tache_${taskId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to print task:", error);
        setLoginError(`Failed to print task: ${error.message}`);
    }
  };
  const filteredTasks = useMemo(() => { if (!currentUser || !tasks) return []; return tasks.filter(task => task.status === filter); }, [tasks, filter, currentUser]);
  const handleAddAdminUser = async (userPayload) => { const newUser = await apiRequest('/admin/users/', 'POST', userPayload); await fetchAdminUsers(); return newUser; };
  const handleUpdateAdminUser = async (userId, userPayload) => { const updatedUser = await apiRequest(`/admin/users/${userId}/`, 'PATCH', userPayload); await fetchAdminUsers(); return updatedUser; };
  const handleDeleteAdminUser = async (userId, username) => { if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ? Cette action est irréversible.`)) { try { await apiRequest(`/admin/users/${userId}/`, 'DELETE'); await fetchAdminUsers(); } catch (error) { console.error(`Échec de la suppression de l'utilisateur ${username}:`, error); setLoginError(prev => `${prev ? prev + '; ' : ''}Erreur suppression utilisateur: ${error.message}`); } } };
  const handleTaskClick = useCallback(async (taskOrId) => { let taskIdString; let preliminaryTaskData = null; if (typeof taskOrId === 'object' && taskOrId !== null && taskOrId.id) { taskIdString = String(taskOrId.id); preliminaryTaskData = taskOrId; } else if (typeof taskOrId === 'number' || typeof taskOrId === 'string') { taskIdString = String(taskOrId); preliminaryTaskData = tasks.find(t => String(t.id) === taskIdString) || null; } else { console.error("handleTaskClick: Invalid argument provided.", taskOrId); setLoginError("Erreur: ID de tâche invalide pour l'ouverture des détails."); return; } if (!taskIdString) { console.error("handleTaskClick: No valid task ID found."); setLoginError("Erreur: Aucun ID de tâche valide trouvé pour l'ouverture des détails."); return; } if (preliminaryTaskData) { setSelectedTask({ id: taskIdString, ...preliminaryTaskData, ordre: preliminaryTaskData.ordre ? { ...preliminaryTaskData.ordre, date_prochain_cycle_visite: preliminaryTaskData.ordre.date_prochain_cycle_visite || null, date_derniere_visite_effectuee: preliminaryTaskData.ordre.date_derniere_visite_effectuee || null, dernier_cycle_visite_resultat: preliminaryTaskData.ordre.dernier_cycle_visite_resultat === undefined ? null : preliminaryTaskData.ordre.dernier_cycle_visite_resultat, } : null, advancement_notes: (preliminaryTaskData.advancement_notes || []).map(note => ({ ...note, task_display_id: note.task_display_id || preliminaryTaskData.task_id_display || `ORDT-${taskIdString}`, images: note.images || [] })) }); } else { setSelectedTask({ id: taskIdString, tasks: "Chargement des détails...", type: '', ordre: {value: '', date_prochain_cycle_visite: null, date_derniere_visite_effectuee: null, dernier_cycle_visite_resultat: null}, status: 'chargement', advancement_notes: [] }); } try { const detailedTask = await apiRequest(`/tasks/${taskIdString}/`); if (detailedTask) { setSelectedTask({ ...detailedTask, id: String(detailedTask.id), ordre: detailedTask.ordre ? { ...detailedTask.ordre, date_prochain_cycle_visite: detailedTask.ordre.date_prochain_cycle_visite || null, date_derniere_visite_effectuee: detailedTask.ordre.date_derniere_visite_effectuee || null, dernier_cycle_visite_resultat: detailedTask.ordre.dernier_cycle_visite_resultat === undefined ? null : detailedTask.ordre.dernier_cycle_visite_resultat, } : null, advancement_notes: (detailedTask.advancement_notes || []).map(note => ({ ...note, task_display_id: note.task_display_id || detailedTask.task_id_display || `ORDT-${detailedTask.id}`, images: note.images || [] })) }); } else { throw new Error("Les détails de la tâche n'ont pas pu être chargés (réponse vide)."); } } catch (error) { console.error("Erreur lors de la recuperation des details de l'ordre de travail:", error); setLoginError(`Erreur chargement details: ${error.message}. ${preliminaryTaskData ? "Affichage des données partielles." : "Impossible d'afficher la tâche."}`); if (!preliminaryTaskData || (selectedTask && String(selectedTask.id) !== taskIdString) ) { setSelectedTask(null); } } }, [tasks, selectedTask]); 
  const handleCloseDetailsModal = () => { setSelectedTask(null); if (currentView === 'tasks') fetchTaskData(); }; 
  const handleToggleNotifications = () => { setIsNotificationOpen(prev => !prev); };
  const handleNotificationSelect = useCallback(async (relatedObjectId, notificationId, category, relatedObjectName, notificationMessage) => { if (currentUser.role === 'Chef de Parc' && category === 'CYCLE_VISIT' && relatedObjectId) { const oi = ordresImputation.find(o => o.id_ordre === relatedObjectId); if (oi) { setSelectedOrdreForCycleVisite(oi); setIsCycleVisiteModalOpen(true); } else { try { const fetchedOi = await apiRequest(`/ordres-imputation/${relatedObjectId}/`); if (fetchedOi) { setSelectedOrdreForCycleVisite(fetchedOi); setIsCycleVisiteModalOpen(true); } else { setLoginError(`Détails OI "${relatedObjectName || relatedObjectId}" non trouvés.`); } } catch (err) { console.error("Failed to fetch OI for Chef:", err); setLoginError(`Impossible de charger OI "${relatedObjectName || relatedObjectId}".`); } } } else if (currentUser.role === 'Admin' && category === 'CYCLE_VISIT' && relatedObjectId) { const oi = ordresImputation.find(o => o.id_ordre === relatedObjectId); if (oi) { setSelectedNotificationForAdminInfo({ ordre: oi, message: notificationMessage }); setIsAdminCycleVisitInfoModalOpen(true); } else { try { const fetchedOi = await apiRequest(`/ordres-imputation/${relatedObjectId}/`); if (fetchedOi) { setSelectedNotificationForAdminInfo({ ordre: fetchedOi, message: notificationMessage }); setIsAdminCycleVisitInfoModalOpen(true); } else { setLoginError(`Détails OI "${relatedObjectName || relatedObjectId}" non trouvés.`); } } catch (err) { console.error("Failed to fetch OI for Admin:", err); setLoginError(`Impossible de charger OI "${relatedObjectName || relatedObjectId}".`); } } } else if (category === 'PREVENTIVE_CHECKLIST' && relatedObjectId) { setPreventiveChecklistData({ ordreImputationId: relatedObjectId, ordreImputationValue: relatedObjectName, notificationMessage: notificationMessage, }); setIsPreventiveChecklistModalOpen(true); } else if (category === 'TASK' && relatedObjectId) { if (currentView !== 'tasks') setCurrentView('tasks'); await handleTaskClick(relatedObjectId); } if (notificationId) { const notificationToMark = notifications.find(n => n.id === notificationId); if (notificationToMark && !notificationToMark.read) { await markNotificationAsRead(notificationId); } } setIsNotificationOpen(false); }, [currentUser, handleTaskClick, markNotificationAsRead, notifications, ordresImputation, currentView]);
  const handleUpdateCycleVisite = async (ordreImputationId, updateData) => { await apiRequest(`/ordres-imputation/${ordreImputationId}/update-cycle-visite/`, 'POST', updateData); await fetchTaskData(); };
  const openLightbox = (src, alt) => { setLightboxImage({ src, alt, isOpen: true }); }; const closeLightbox = () => { setLightboxImage({ src: null, alt: null, isOpen: false }); };
  const handleOpenAddUserDialog = () => setIsAddUserDialogOpen(true); const handleCloseAddUserDialog = () => setIsAddUserDialogOpen(false); const handleOpenEditUserDialog = (user) => { setEditingUser(user); setIsEditUserDialogOpen(true); }; const handleCloseEditUserDialog = () => { setEditingUser(null); setIsEditUserDialogOpen(false); };
  const handleSavePreventiveTemplate = async (templatePayload, templateId = null) => { if (templateId) { await apiRequest(`/admin/preventive-task-templates/${templateId}/`, 'PUT', templatePayload); } else { await apiRequest('/admin/preventive-task-templates/', 'POST', templatePayload); } await fetchPreventiveTaskTemplates(); };
  const handleDeletePreventiveTemplate = async (templateId, templateTitle) => { if (window.confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${templateTitle}" ?`)) { try { await apiRequest(`/admin/preventive-task-templates/${templateId}/`, 'DELETE'); await fetchPreventiveTaskTemplates(); } catch (error) { console.error(`Échec de la suppression du modèle préventif ${templateTitle}:`, error); setLoginError(prev => `${prev ? prev + '; ' : ''}Erreur suppression modèle: ${error.message}`); } } };
  const handleOpenPreventiveTemplateModal = (template = null) => { setEditingPreventiveTemplate(template); setIsPreventiveTemplateModalOpen(true); };
  const handleClosePreventiveTemplateModal = () => { setEditingPreventiveTemplate(null); setIsPreventiveTemplateModalOpen(false); };
  const handleSubmitPreventiveChecklist = async (submissionPayload) => { await apiRequest('/submit-preventive-checklist/', 'POST', submissionPayload); await fetchTaskData(); };
  const handleOpenOiFormModal = (oi = null) => { setEditingOi(oi); setIsOiFormModalOpen(true); };
  const handleCloseOiFormModal = () => { setEditingOi(null); setIsOiFormModalOpen(false); };
  const handleSaveOi = async (oiPayload, oiIdToUpdate = null) => { if (oiIdToUpdate) { const { id_ordre, ...updateData } = oiPayload; await apiRequest(`/ordres-imputation/${oiIdToUpdate}/`, 'PUT', updateData); } else { await apiRequest('/ordres-imputation/', 'POST', oiPayload); } await fetchOrdresImputationList(); };
  const handleDeleteOi = async (oiId, oiValue) => { if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'Ordre d'Imputation "${oiValue}" (ID: ${oiId}) ? Cette action est irréversible.`)) { try { await apiRequest(`/ordres-imputation/${oiId}/`, 'DELETE'); await fetchOrdresImputationList(); } catch (error) { console.error(`Échec de la suppression de l'OI ${oiValue}:`, error); setLoginError(prev => `${prev ? prev + '; ' : ''}Erreur suppression OI: ${error.message}`); } } };
  const handleOpenTechnicianFormModal = (technician = null) => { setEditingTechnician(technician); setIsTechnicianFormModalOpen(true); };
  const handleCloseTechnicianFormModal = () => { setEditingTechnician(null); setIsTechnicianFormModalOpen(false); };
  const handleSaveTechnician = async (technicianPayload, technicianIdToUpdate = null) => { if (technicianIdToUpdate) { const { name } = technicianPayload; await apiRequest(`/technicians/${technicianIdToUpdate}/`, 'PUT', { name }); } else { await apiRequest('/technicians/', 'POST', technicianPayload); } await fetchTechniciansList(); };
  const handleDeleteTechnician = async (technicianId, technicianName) => { if (window.confirm(`Êtes-vous sûr de vouloir supprimer le technicien "${technicianName}" (ID: ${technicianId}) ? Cette action est irréversible.`)) { try { await apiRequest(`/technicians/${technicianId}/`, 'DELETE'); await fetchTechniciansList(); } catch (error) { console.error(`Échec de la suppression du technicien ${technicianName}:`, error); setLoginError(prev => `${prev ? prev + '; ' : ''}Erreur suppression technicien: ${error.message}`); } } };
  const handleUpdateOiHours = async (oiId, newHoursValue) => { await apiRequest(`/ordres-imputation/${oiId}/`, 'PATCH', { total_hours_of_work: newHoursValue }); await fetchOrdresImputationList(); };

  const filterButtons = [ { label: 'Assignes', value: 'assigned', icon: <Clock className="h-4 w-4 mr-1.5"/> }, { label: 'En Cours', value: 'in progress', icon: <Wrench className="h-4 w-4 mr-1.5"/> }, { label: 'Clôtures', value: 'closed', icon: <CheckCircle className="h-4 w-4 mr-1.5"/> }, ];
  
  if (isLoadingData && !currentUser && !getAuthToken()) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 text-center">
                <Briefcase className="mx-auto h-16 w-16 text-blue-600 mb-3 animate-pulse" />
                <h2 className="text-2xl font-semibold text-gray-700">Chargement Initial...</h2>
            </div>
        </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} loginError={loginError} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => setCurrentView('tasks')} title="Gestion des Ordres de travail" className={cn("text-gray-600 hover:text-gray-800", currentView === 'tasks' ? 'text-blue-600 bg-blue-100' : '')}>
                <Briefcase className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
                {currentView === 'tasks' ? "Gestion des Ordres de travail" 
                : currentView === 'userManagement' ? "Gestion des Utilisateurs" 
                : currentView === 'taskRecords' ? "Rapports d'Activités" 
                : currentView === 'preventiveTemplates' ? "Modèles Préventifs" 
                : currentView === 'oiManagement' ? "Gestion des OI" 
                : currentView === 'technicianManagement' ? "Gestion des Techniciens" 
                : currentView === 'changeOiHours' ? "Modifier Heures OI"
                : "Gestionnaire"}
            </h1>
        </div>
        {currentUser && (
            <div className="flex items-center space-x-2 sm:space-x-4">
                {currentUser.role === 'Admin' && (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentView('userManagement')} title="Gestion des Utilisateurs" className={cn("text-gray-600 hover:text-gray-800", currentView === 'userManagement' ? 'text-blue-600 bg-blue-100' : '')}> <UsersRound className="h-5 w-5" /> </Button>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentView('oiManagement')} title="Gestion des Ordres d'Imputation" className={cn("text-gray-600 hover:text-gray-800", currentView === 'oiManagement' ? 'text-purple-600 bg-purple-100' : '')}> <Archive className="h-5 w-5" /> </Button>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentView('technicianManagement')} title="Gestion des Techniciens" className={cn("text-gray-600 hover:text-gray-800", currentView === 'technicianManagement' ? 'text-green-600 bg-green-100' : '')}> <Wrench className="h-5 w-5" /> </Button>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentView('taskRecords')} title="Rapports d'Activités" className={cn("text-gray-600 hover:text-gray-800", currentView === 'taskRecords' ? 'text-blue-600 bg-blue-100' : '')}> <FileText className="h-5 w-5" /> </Button>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentView('preventiveTemplates')} title="Modèles de Tâches Préventives" className={cn("text-gray-600 hover:text-gray-800", currentView === 'preventiveTemplates' ? 'text-orange-600 bg-orange-100' : '')}> <ClipboardList className="h-5 w-5" /> </Button>
                    </>
                )}
                {(currentUser.role === 'Admin' || currentUser.role === 'Chef de Parc') && (
                    <Button variant="ghost" size="icon" onClick={() => setCurrentView('changeOiHours')} title="Modifier Heures OI" className={cn("text-gray-600 hover:text-gray-800", currentView === 'changeOiHours' ? 'text-blue-600 bg-blue-100' : '')}>
                        <Hourglass className="h-5 w-5" />
                    </Button>
                )}
                <div className="relative">
                    <Button variant="ghost" size="icon" onClick={handleToggleNotifications} className="relative text-gray-600 hover:text-gray-800"> <Bell className="h-5 w-5" /> {unreadNotificationCount > 0 && ( <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-red-500" title={`${unreadNotificationCount} non lues`}/> )} </Button>
                    <NotificationDropdown notifications={userNotifications} isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} onMarkAsRead={markNotificationAsRead} onMarkAllAsRead={markAllNotificationsAsRead} onNotificationSelect={handleNotificationSelect} onClearAllFrontend={handleClearAllNotificationsFrontend} />
                </div>
                <span className="text-sm text-gray-600 hidden md:inline">Bienvenue, {currentUser.name} ({currentUser.role})</span>
                <Button variant="outline" size="sm" onClick={handleLogout} className="text-gray-700 border-gray-300 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300"> <LogOut className="h-4 w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Deconnexion</span> </Button>
            </div>
        )}
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex flex-col">
          {loginError && !isLoadingData && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert"> <strong className="font-bold">Erreur :</strong> <span className="block sm:inline">{loginError}</span> <button onClick={() => setLoginError('')} className="absolute top-0 bottom-0 right-0 px-4 py-3"><X className="h-4 w-4"/></button></div>}
          
          {currentUser && currentView === 'tasks' && (
              <>
                  <div className="flex justify-center space-x-1 sm:space-x-2 md:space-x-3 mb-6 flex-wrap">
                      {filterButtons.map(btn => (
                          <Button key={btn.value} variant={filter === btn.value ? 'default' : 'outline'} onClick={() => setFilter(btn.value)} className={cn("capitalize px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm flex items-center my-1", filter === btn.value ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-700')}>
                              {btn.icon} {btn.label}
                          </Button>
                      ))}
                  </div>
                  <div className="flex-grow bg-white p-3 md:p-4 rounded-lg shadow overflow-y-auto mb-6 min-h-[400px] custom-scrollbar">
                      <h2 className="text-lg font-semibold mb-4 capitalize text-gray-700">{filter.replace('_', ' ')} Ordres de travail</h2>
                      {isLoadingData && (!tasks || tasks.length === 0) ? (
                          <div className="flex justify-center items-center h-full"> <Briefcase className="h-12 w-12 text-blue-500 animate-pulse" /> <p className="ml-3 text-gray-500">Chargement des ordres de travail...</p> </div>
                      ) : filteredTasks.length > 0 ? (
                          filteredTasks.map(task => (<TaskCard key={task.id} task={task} onClick={handleTaskClick} currentUser={currentUser} />))
                      ) : (
                          <p className="text-center text-gray-500 py-10"> Aucun ordre de travail {filter.replace('_', ' ')} {currentUser.role === 'Chef de Parc' && filter === 'assigned' && `ne vous est assigne`}. </p>
                      )}
                  </div>
                  {currentUser.role === 'Admin' && (<div className="mt-auto flex justify-center py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-20"> <Button onClick={() => setIsAddTaskModalOpen(true)} size="lg" className="bg-green-600 text-white hover:bg-blue-700"> <Plus className="h-5 w-5 mr-2" /> Ajouter un Nouvel Ordre de travail (Admin) </Button> </div>)}
                  {currentUser.role === 'Chef de Parc' && (<div className="mt-auto flex justify-center py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-20"> <Button onClick={() => setIsAddTaskChefModalOpen(true)} size="lg" className="bg-teal-600 text-white hover:bg-teal-700"> <Plus className="h-5 w-5 mr-2" /> Ajouter un Nouvel Ordre de travail (Chef) </Button> </div>)}
              </>
          )}

          {currentUser && currentUser.role === 'Admin' && currentView === 'userManagement' && <AdminUserManagementView users={adminUsers} onAddUserClick={handleOpenAddUserDialog} onEditUserClick={handleOpenEditUserDialog} onDeleteUser={handleDeleteAdminUser} isLoading={isLoadingAdminUsers} />}
          {currentUser && currentUser.role === 'Admin' && currentView === 'taskRecords' && <AdminTaskRecordsView ordresImputation={ordresImputation} technicians={technicians} onOpenLightbox={openLightbox} />}
          {currentUser && currentUser.role === 'Admin' && currentView === 'oiManagement' && <AdminOiManagementView ordresImputation={ordresImputation} onOpenOiFormModal={handleOpenOiFormModal} onDeleteOi={handleDeleteOi} isLoading={isLoadingOis || (isLoadingData && ordresImputation.length === 0)} />}
          {currentUser && currentUser.role === 'Admin' && currentView === 'technicianManagement' && <AdminTechnicianManagementView technicians={technicians} onOpenTechnicianFormModal={handleOpenTechnicianFormModal} onDeleteTechnician={handleDeleteTechnician} isLoading={isLoadingTechnicians || (isLoadingData && technicians.length === 0)} />}
          {currentUser && currentUser.role === 'Admin' && currentView === 'preventiveTemplates' && <AdminPreventiveTemplatesView templates={preventiveTaskTemplates} ordresImputation={ordresImputation} onAddClick={() => handleOpenPreventiveTemplateModal(null)} onEditClick={handleOpenPreventiveTemplateModal} onDeleteClick={handleDeletePreventiveTemplate} isLoading={isLoadingPreventiveTemplates || (isLoadingData && ordresImputation.length === 0)} />}
          {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Chef de Parc') && currentView === 'changeOiHours' && <ChangeOiHoursView ordresImputation={ordresImputation} onUpdateOiHours={handleUpdateOiHours} isLoadingOis={isLoadingOis || (isLoadingData && ordresImputation.length === 0)} />}
      </main>

      <footer className="bg-gray-200 text-center p-3 text-xs text-gray-600">
          Gestionnaire d'Ordres de travail &copy; {new Date().getFullYear()}
      </footer>

      {/* --- Modals --- */}
      {currentUser?.role === 'Admin' && <AddTaskModal isOpen={isAddTaskModalOpen} onClose={() => setIsAddTaskModalOpen(false)} onAddTask={handleAddTask} chefsDeParc={chefsDeParc} ordresImputation={ordresImputation} />}
      {currentUser?.role === 'Chef de Parc' && <AddTaskChefModal isOpen={isAddTaskChefModalOpen} onClose={() => setIsAddTaskChefModalOpen(false)} onAddTask={handleAddTask} ordresImputation={ordresImputation} technicians={technicians} />}
      {selectedTask && currentUser && <TaskDetailsModal task={selectedTask} isOpen={!!selectedTask} onClose={handleCloseDetailsModal} currentUser={currentUser} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onPrintTask={handlePrintTask} chefsDeParc={chefsDeParc} ordresImputation={ordresImputation} technicians={technicians} onOpenLightbox={openLightbox} />}
      <ImageLightbox src={lightboxImage.src} alt={lightboxImage.alt} isOpen={lightboxImage.isOpen} onClose={closeLightbox} />
      {currentUser?.role === 'Admin' && (
        <>
          <AddUserDialog isOpen={isAddUserDialogOpen} onClose={handleCloseAddUserDialog} onAddUser={handleAddAdminUser} />
          <EditUserDialog isOpen={isEditUserDialogOpen} onClose={handleCloseEditUserDialog} onUpdateUser={handleUpdateAdminUser} userToEdit={editingUser} />
          <PreventiveTemplateModal isOpen={isPreventiveTemplateModalOpen} onClose={handleClosePreventiveTemplateModal} onSave={handleSavePreventiveTemplate} ordresImputation={ordresImputation} templateToEdit={editingPreventiveTemplate} />
          <OiFormModal isOpen={isOiFormModalOpen} onClose={handleCloseOiFormModal} onSaveOi={handleSaveOi} oiToEdit={editingOi} />
          <TechnicianFormModal isOpen={isTechnicianFormModalOpen} onClose={handleCloseTechnicianFormModal} onSaveTechnician={handleSaveTechnician} technicianToEdit={editingTechnician} />
        </>
      )}
      {currentUser?.role === 'Chef de Parc' && selectedOrdreForCycleVisite && <CycleVisiteModal isOpen={isCycleVisiteModalOpen} onClose={() => { setIsCycleVisiteModalOpen(false); setSelectedOrdreForCycleVisite(null); }} ordreImputation={selectedOrdreForCycleVisite} onUpdateCycleVisite={handleUpdateCycleVisite} />}
      {currentUser?.role === 'Admin' && selectedNotificationForAdminInfo && <AdminCycleVisitInfoModal isOpen={isAdminCycleVisitInfoModalOpen} onClose={() => { setIsAdminCycleVisitInfoModalOpen(false); setSelectedNotificationForAdminInfo(null); }} info={selectedNotificationForAdminInfo} />}
      {(currentUser?.role === 'Admin' || currentUser?.role === 'Chef de Parc') && preventiveChecklistData && <PreventiveChecklistModal isOpen={isPreventiveChecklistModalOpen} onClose={() => { setIsPreventiveChecklistModalOpen(false); setPreventiveChecklistData(null); }} onSubmit={handleSubmitPreventiveChecklist} checklistData={preventiveChecklistData} technicians={technicians} />}
    </div>
  );
}

export default App;