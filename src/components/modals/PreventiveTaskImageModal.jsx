// src/components/modals/PreventiveTaskImageModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Save, ImageUp, X, ZoomIn, Download, Upload, AlertCircle, CheckCircle, Loader2, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Select, Textarea, Label, ErrorMessage, Checkbox } from '../ui';
import { apiRequest, DJANGO_DOMAIN_URL } from '../../api/api';
import { cn } from '../../utils';

const PreventiveTaskImageModal = ({ 
    isOpen, 
    onClose, 
    taskData = null, 
    currentUser, 
    onTaskUpdate = null,
    mode = 'view' // 'view', 'edit', 'create'
}) => {
    // Task data state
    const [taskDetails, setTaskDetails] = useState(null);
    const [isLoadingTask, setIsLoadingTask] = useState(false);
    
    // Image management state
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const [uploadErrors, setUploadErrors] = useState([]);
    
    // Form state
    const [formData, setFormData] = useState({
        notes: '',
        completedItems: {}
    });
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // UI state
    const [lightboxImage, setLightboxImage] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    // Constants
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_FILES = 10;

    // Check if user can upload/manage images
    const canManageImages = currentUser && (
        currentUser.role === 'Admin' || 
        currentUser.role === 'Chef de Parc'
    );

    // Load task details when modal opens
    useEffect(() => {
        if (isOpen && taskData?.id) {
            loadTaskDetails();
        } else if (isOpen && !taskData?.id) {
            // New task mode
            setTaskDetails(null);
            setExistingImages([]);
        }
        
        return () => {
            // Cleanup previews on close
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
            setImagePreviews([]);
            setSelectedFiles([]);
        };
    }, [isOpen, taskData?.id]);

    const loadTaskDetails = async () => {
        if (!taskData?.id) return;
        
        setIsLoadingTask(true);
        try {
            const response = await apiRequest(`/tasks/${taskData.id}/`);
            setTaskDetails(response);
            
            // Extract existing images from advancement notes
            const allImages = [];
            if (response.advancement_notes) {
                response.advancement_notes.forEach(note => {
                    if (note.images) {
                        note.images.forEach(img => {
                            allImages.push({
                                id: img.id,
                                url: img.image_url,
                                noteId: note.id,
                                noteDate: note.date,
                                noteAuthor: note.created_by_username,
                                uploaded_at: img.uploaded_at
                            });
                        });
                    }
                });
            }
            setExistingImages(allImages);
            
        } catch (error) {
            console.error('Error loading task details:', error);
            setFormErrors({ submit: `Erreur lors du chargement: ${error.message}` });
        } finally {
            setIsLoadingTask(false);
        }
    };

    // File validation
    const validateFile = (file) => {
        const errors = [];
        
        if (!ALLOWED_TYPES.includes(file.type)) {
            errors.push(`${file.name}: Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.`);
        }
        
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`${file.name}: Fichier trop volumineux (max 5MB).`);
        }
        
        return errors;
    };

    // Handle file selection
    const handleFileSelect = useCallback((files) => {
        const fileArray = Array.from(files);
        const totalFiles = selectedFiles.length + fileArray.length;
        
        if (totalFiles > MAX_FILES) {
            setFormErrors(prev => ({
                ...prev,
                files: `Maximum ${MAX_FILES} fichiers autorisés.`
            }));
            return;
        }

        const validationErrors = [];
        const validFiles = [];
        const newPreviews = [];

        fileArray.forEach(file => {
            const errors = validateFile(file);
            if (errors.length > 0) {
                validationErrors.push(...errors);
            } else {
                validFiles.push(file);
                if (file.type.startsWith('image/')) {
                    newPreviews.push(URL.createObjectURL(file));
                }
            }
        });

        if (validationErrors.length > 0) {
            setUploadErrors(validationErrors);
        } else {
            setUploadErrors([]);
        }

        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
            setFormErrors(prev => ({ ...prev, files: null }));
        }
    }, [selectedFiles.length]);

    // Handle file input change
    const handleFileChange = (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files);
        }
    };

    // Handle drag and drop
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    }, [handleFileSelect]);

    // Remove selected file
    const removeSelectedFile = (indexToRemove) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, index) => index !== indexToRemove);
            const urlToRevoke = prev[indexToRemove];
            if (urlToRevoke) {
                URL.revokeObjectURL(urlToRevoke);
            }
            return newPreviews;
        });
    };

    // Upload images
    const uploadImages = async () => {
        if (selectedFiles.length === 0) return [];

        setIsUploading(true);
        const uploadedImages = [];
        const errors = [];

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                setUploadProgress(prev => ({ ...prev, [i]: 0 }));

                try {
                    const formData = new FormData();
                    formData.append('task', taskDetails.id);
                    formData.append('date', new Date().toISOString().split('T')[0]);
                    formData.append('note', `Image téléchargée: ${file.name}`);
                    formData.append('image', file);

                    // Simulate progress for better UX
                    const progressInterval = setInterval(() => {
                        setUploadProgress(prev => ({
                            ...prev,
                            [i]: Math.min((prev[i] || 0) + 10, 90)
                        }));
                    }, 100);

                    const response = await apiRequest('/advancement-notes/', 'POST', formData, true);
                    
                    clearInterval(progressInterval);
                    setUploadProgress(prev => ({ ...prev, [i]: 100 }));
                    
                    uploadedImages.push(response);
                } catch (error) {
                    errors.push(`Erreur upload ${file.name}: ${error.message}`);
                    setUploadProgress(prev => ({ ...prev, [i]: -1 }));
                }
            }
        } finally {
            setIsUploading(false);
        }

        if (errors.length > 0) {
            setUploadErrors(errors);
        }

        return uploadedImages;
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!canManageImages) {
            setFormErrors({ submit: "Vous n'avez pas les permissions pour cette action." });
            return;
        }

        setIsSubmitting(true);
        setFormErrors({});

        try {
            // Upload new images if any
            if (selectedFiles.length > 0) {
                await uploadImages();
            }

            // Add notes if provided
            if (formData.notes.trim()) {
                const noteFormData = new FormData();
                noteFormData.append('task', taskDetails.id);
                noteFormData.append('date', new Date().toISOString().split('T')[0]);
                noteFormData.append('note', formData.notes.trim());

                await apiRequest('/advancement-notes/', 'POST', noteFormData, true);
            }

            // Refresh task data
            await loadTaskDetails();
            
            // Clear form
            setSelectedFiles([]);
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
            setImagePreviews([]);
            setFormData({ notes: '', completedItems: {} });
            setUploadProgress({});
            setUploadErrors([]);

            // Notify parent component
            if (onTaskUpdate) {
                onTaskUpdate(taskDetails.id);
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            setFormErrors({ submit: error.message || 'Erreur lors de la soumission.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle lightbox
    const openLightbox = (imageUrl, alt = '') => {
        setLightboxImage({ url: imageUrl, alt });
    };

    const closeLightbox = () => {
        setLightboxImage(null);
    };

    // Get full image URL
    const getFullImageUrl = (urlPart) => {
        if (!urlPart) return '';
        if (urlPart.startsWith('http://') || urlPart.startsWith('https://') || urlPart.startsWith('data:')) {
            return urlPart;
        }
        const domain = DJANGO_DOMAIN_URL.endsWith('/') ? DJANGO_DOMAIN_URL.slice(0, -1) : DJANGO_DOMAIN_URL;
        const path = urlPart.startsWith('/') ? urlPart : `/${urlPart}`;
        return `${domain}${path}`;
    };

    // Handle close
    const handleClose = () => {
        // Cleanup
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
        setImagePreviews([]);
        setSelectedFiles([]);
        setFormData({ notes: '', completedItems: {} });
        setFormErrors({});
        setUploadErrors([]);
        setUploadProgress({});
        setLightboxImage(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose} className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <ClipboardList className="h-6 w-6 mr-2 text-blue-600" />
                        {mode === 'create' ? 'Nouvelle Tâche Préventive' : 
                         mode === 'edit' ? 'Modifier Tâche Préventive' : 
                         'Détails Tâche Préventive'}
                        {taskDetails && ` - ${taskDetails.task_id_display || taskDetails.id}`}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'view' ? 'Consultez les détails et gérez les images de cette tâche préventive.' :
                         mode === 'edit' ? 'Modifiez les détails et gérez les images de cette tâche.' :
                         'Créez une nouvelle tâche préventive avec images.'}
                    </DialogDescription>
                </DialogHeader>

                <DialogContent className="space-y-6">
                    {formErrors.submit && (
                        <ErrorMessage message={formErrors.submit} className="text-center bg-red-100 p-3 rounded-md" />
                    )}

                    {isLoadingTask ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="ml-2">Chargement des détails...</span>
                        </div>
                    ) : (
                        <>
                            {/* Task Details Section */}
                            {taskDetails && (
                                <div className="bg-slate-50 p-4 rounded-lg border">
                                    <h3 className="font-semibold text-gray-700 mb-3">Détails de la Tâche</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div><strong>ID:</strong> {taskDetails.task_id_display || taskDetails.id}</div>
                                        <div><strong>Type:</strong> {taskDetails.type}</div>
                                        <div><strong>Statut:</strong> 
                                            <span className={cn("ml-2 px-2 py-1 rounded-full text-xs font-medium",
                                                taskDetails.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                                taskDetails.status === 'in progress' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            )}>
                                                {taskDetails.status}
                                            </span>
                                        </div>
                                        <div><strong>OI:</strong> {taskDetails.ordre?.value || 'N/A'}</div>
                                        <div><strong>Assigné à:</strong> {taskDetails.assignedTo || 'N/A'}</div>
                                        <div><strong>Techniciens:</strong> {taskDetails.technicien_names?.join(', ') || 'N/A'}</div>
                                    </div>
                                    {taskDetails.tasks && (
                                        <div className="mt-3">
                                            <strong>Description:</strong>
                                            <p className="mt-1 text-sm bg-white p-2 rounded border whitespace-pre-wrap">
                                                {taskDetails.tasks}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Existing Images Section */}
                            {existingImages.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-700 flex items-center">
                                        <Eye className="h-5 w-5 mr-2" />
                                        Images Existantes ({existingImages.length})
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {existingImages.map((image, index) => (
                                            <div key={image.id} className="relative group border rounded-lg p-2 bg-white shadow-sm hover:shadow-md transition-shadow">
                                                <div className="aspect-square relative overflow-hidden rounded-md bg-gray-100">
                                                    <img
                                                        src={getFullImageUrl(image.url)}
                                                        alt={`Image ${index + 1}`}
                                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                        onClick={() => openLightbox(getFullImageUrl(image.url), `Image ${index + 1}`)}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div className="hidden w-full h-full items-center justify-center text-red-500 text-xs">
                                                        <AlertCircle className="h-6 w-6" />
                                                        <span className="ml-1">Erreur</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-500">
                                                    <div>Par: {image.noteAuthor}</div>
                                                    <div>{new Date(image.noteDate).toLocaleDateString()}</div>
                                                </div>
                                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="flex space-x-1">
                                                        <button
                                                            onClick={() => openLightbox(getFullImageUrl(image.url), `Image ${index + 1}`)}
                                                            className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                                            title="Voir en grand"
                                                        >
                                                            <ZoomIn className="h-3 w-3" />
                                                        </button>
                                                        <a
                                                            href={getFullImageUrl(image.url)}
                                                            download
                                                            className="p-1 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                                                            title="Télécharger"
                                                        >
                                                            <Download className="h-3 w-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Image Upload Section */}
                            {canManageImages && taskDetails && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-700 flex items-center">
                                        <ImageUp className="h-5 w-5 mr-2" />
                                        Ajouter des Images
                                    </h3>

                                    {/* Upload Errors */}
                                    {uploadErrors.length > 0 && (
                                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                            <div className="font-medium">Erreurs de validation:</div>
                                            <ul className="list-disc list-inside text-sm mt-1">
                                                {uploadErrors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Drag & Drop Zone */}
                                    <div
                                        className={cn(
                                            "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                                            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                                        )}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                    >
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            disabled={isUploading}
                                        />
                                        <div className="space-y-2">
                                            <Upload className="h-8 w-8 mx-auto text-gray-400" />
                                            <div className="text-sm text-gray-600">
                                                <span className="font-medium text-blue-600">Cliquez pour sélectionner</span> ou glissez-déposez vos images
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                PNG, JPG, GIF, WebP jusqu'à 5MB (max {MAX_FILES} fichiers)
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selected Files Preview */}
                                    {selectedFiles.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-medium text-gray-700">Fichiers sélectionnés ({selectedFiles.length})</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {selectedFiles.map((file, index) => (
                                                    <div key={index} className="relative group border rounded-lg p-2 bg-white">
                                                        <div className="aspect-square relative overflow-hidden rounded-md bg-gray-100">
                                                            {imagePreviews[index] ? (
                                                                <img
                                                                    src={imagePreviews[index]}
                                                                    alt={file.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                    <ImageUp className="h-6 w-6" />
                                                                </div>
                                                            )}
                                                            
                                                            {/* Upload Progress */}
                                                            {uploadProgress[index] !== undefined && uploadProgress[index] >= 0 && (
                                                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                                    {uploadProgress[index] === 100 ? (
                                                                        <CheckCircle className="h-6 w-6 text-green-400" />
                                                                    ) : uploadProgress[index] === -1 ? (
                                                                        <AlertCircle className="h-6 w-6 text-red-400" />
                                                                    ) : (
                                                                        <div className="text-white text-sm">
                                                                            {uploadProgress[index]}%
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="mt-1 text-xs text-gray-600 truncate" title={file.name}>
                                                            {file.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {(file.size / 1024 / 1024).toFixed(1)} MB
                                                        </div>
                                                        
                                                        {!isUploading && (
                                                            <button
                                                                onClick={() => removeSelectedFile(index)}
                                                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Supprimer"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes Section */}
                                    <div>
                                        <Label htmlFor="task-notes">Notes additionnelles (optionnel)</Label>
                                        <Textarea
                                            id="task-notes"
                                            value={formData.notes}
                                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                            placeholder="Ajoutez des notes sur cette intervention..."
                                            rows={3}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {!canManageImages && (
                                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                                    <div className="flex items-center">
                                        <AlertCircle className="h-5 w-5 mr-2" />
                                        <span>Vous n'avez pas les permissions pour gérer les images de cette tâche.</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting || isUploading}>
                        Fermer
                    </Button>
                    
                    {canManageImages && taskDetails && (selectedFiles.length > 0 || formData.notes.trim()) && (
                        <Button 
                            onClick={handleSubmit} 
                            className="bg-green-600 text-white hover:bg-green-700" 
                            disabled={isSubmitting || isUploading}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sauvegarde...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Sauvegarder
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </Dialog>

            {/* Lightbox */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-[200] bg-black bg-opacity-90 flex items-center justify-center p-4"
                    onClick={closeLightbox}
                >
                    <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
                        <img
                            src={lightboxImage.url}
                            alt={lightboxImage.alt}
                            className="max-w-full max-h-[85vh] object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={closeLightbox}
                            className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                            <p className="text-center">{lightboxImage.alt}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PreventiveTaskImageModal;