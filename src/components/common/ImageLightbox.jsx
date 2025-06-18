// src/components/common/ImageLightbox.jsx
import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { DJANGO_DOMAIN_URL } from '../../api/api';

const ImageLightbox = ({ src, alt, isOpen, onClose }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setHasError(false);
        }
    }, [isOpen, src]);

    if (!isOpen || !src) return null;

    const getFullImageUrl = (urlPart) => {
        if (!urlPart) return '';
        if (urlPart.startsWith('http://') || urlPart.startsWith('https://') || urlPart.startsWith('data:')) {
            return urlPart;
        }
        const domain = DJANGO_DOMAIN_URL.endsWith('/') ? DJANGO_DOMAIN_URL.slice(0, -1) : DJANGO_DOMAIN_URL;
        const path = urlPart.startsWith('/') ? urlPart : `/${urlPart}`;
        return `${domain}${path}`;
    };

    const imageUrlToLoad = getFullImageUrl(src);

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0" onClick={onClose} role="dialog" aria-modal="true" aria-label="Visionneuse d'image">
            <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-lg shadow-2xl flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
                {hasError ? (
                    <div className="text-center text-red-600 p-8">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
                        <p className="font-semibold">Impossible de charger l'image.</p>
                        <p className="text-xs text-gray-500 mt-1">L'URL de l'image est peut-être incorrecte ou le fichier est inaccessible.</p>
                        <p className="text-xs text-gray-400 mt-2 break-all">URL Tentée: {imageUrlToLoad}</p>
                        {src && imageUrlToLoad !== src && (
                            <p className="text-xs text-gray-400 mt-1 break-all">URL Fournie à la Lightbox: {src}</p>
                        )}
                    </div>
                ) : (
                    <img
                        src={imageUrlToLoad}
                        alt={alt}
                        className="block max-w-full max-h-[85vh] object-contain rounded"
                        onError={() => setHasError(true)}
                    />
                )}
                <button onClick={onClose} className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full p-1.5 shadow-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" aria-label="Fermer la visionneuse">
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default ImageLightbox;
