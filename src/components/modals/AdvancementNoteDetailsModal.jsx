// src/components/modals/AdvancementNoteDetailsModal.jsx
import React, { useState } from 'react';
import { FileText, ZoomIn, Download, AlertCircle, X } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button } from '../ui';
import { DJANGO_DOMAIN_URL } from '../../api/api';

const AdvancementNoteDetailsModal = ({ note, isOpen, onClose, onOpenLightbox }) => {
    if (!isOpen || !note) return null;
    const noteImages = note.images || [];

    const getDisplayImageUrl = (urlPart) => {
        if (!urlPart) return '';
        if (urlPart.startsWith('http://') || urlPart.startsWith('https://') || urlPart.startsWith('data:')) {
            return urlPart;
        }
        const domain = DJANGO_DOMAIN_URL.endsWith('/') ? DJANGO_DOMAIN_URL.slice(0, -1) : DJANGO_DOMAIN_URL;
        const path = urlPart.startsWith('/') ? urlPart : `/${urlPart}`;
        return `${domain}${path}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose} className="max-w-lg md:max-w-xl">
            <DialogHeader>
                <DialogTitle id={`advancement-note-title-${note.id}`} className="flex items-center text-gray-800">
                    <FileText className="h-6 w-6 mr-2 text-blue-600" /> Details de la Note d'Avancement (Tâche: {note.task_display_id || note.task})
                </DialogTitle>
                <DialogDescription>
                    Note du : {new Date(note.date).toLocaleDateString()} par {note.created_by_username || 'Système'}
                </DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Note :</h4>
                    <p className="text-sm text-gray-800 bg-slate-50 p-3 rounded-md whitespace-pre-wrap min-h-[60px]">
                        {note.note || <span className="italic text-gray-400">Aucun texte de note fourni.</span>}
                    </p>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Images :</h4>
                    {noteImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {noteImages.map((imageObj) => {
                                const rawImageUrlFromApi = imageObj.image_url;
                                const thumbnailUrl = getDisplayImageUrl(rawImageUrlFromApi);
                                const downloadUrl = getDisplayImageUrl(rawImageUrlFromApi);
                                const imageName = rawImageUrlFromApi ? rawImageUrlFromApi.split('/').pop() : `image_${imageObj.id}`;
                                const imageId = `note-image-${note.id}-${imageObj.id}`;
                                const errorTextId = `error-text-${imageId}`;

                                return (
                                    <div key={imageObj.id} className="relative group border rounded-md p-1.5 bg-slate-50 flex flex-col items-center justify-center aspect-[4/3]">
                                        <img
                                            id={imageId}
                                            src={thumbnailUrl}
                                            alt={`Image d'avancement ${imageObj.id}`}
                                            className="max-w-full max-h-full rounded-md object-contain cursor-pointer hover:opacity-90 transition-opacity mb-1"
                                            onClick={() => onOpenLightbox(rawImageUrlFromApi, `Image ${imageObj.id} pour la note ${note.id}`)}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                const errorTextEl = document.getElementById(errorTextId);
                                                if (errorTextEl) errorTextEl.style.display = 'block';
                                            }}
                                        />
                                        <p id={errorTextId} className="text-xs text-red-500 hidden text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-white rounded shadow">
                                            <AlertCircle className="inline h-4 w-4 mr-1"/> Erreur
                                        </p>
                                        <div className="flex space-x-1 mt-auto pt-1 w-full justify-center">
                                            <Button variant="ghost" size="sm" onClick={() => onOpenLightbox(rawImageUrlFromApi, `Image ${imageObj.id} pour la note ${note.id}`)} className="text-xs text-blue-600 hover:underline p-1 h-auto flex items-center" title="Voir l'image complète">
                                                <ZoomIn className="h-3 w-3 mr-0.5"/> Voir
                                            </Button>
                                            <a href={downloadUrl} download={imageName} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md text-xs font-medium h-auto p-1 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors" title="Telecharger l'image">
                                                <Download className="h-3 w-3 mr-0.5"/> Telecharger
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic bg-slate-50 p-3 rounded-md">Aucune image telechargee pour cette note.</p>
                    )}
                </div>
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Fermer</Button>
            </DialogFooter>
        </Dialog>
    );
};

export default AdvancementNoteDetailsModal;
