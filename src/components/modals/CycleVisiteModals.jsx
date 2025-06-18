// src/components/modals/CycleVisiteModals.jsx
import React, { useState, useEffect } from 'react';
import { RotateCcw, CheckCircle, X, Save, Info } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, Button, Input, Label, ErrorMessage } from '../ui';
import { cn } from '../../utils';

export const CycleVisiteModal = ({ isOpen, onClose, ordreImputation, onUpdateCycleVisite }) => {
    const [step, setStep] = useState(1);
    const [visitAccepted, setVisitAccepted] = useState(null);
    const [nextVisitDate, setNextVisitDate] = useState('');
    const [visitPerformedDate, setVisitPerformedDate] = useState(new Date().toISOString().split('T')[0]);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setVisitAccepted(null);
            setNextVisitDate('');
            setVisitPerformedDate(new Date().toISOString().split('T')[0]);
            setFormErrors({});
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen || !ordreImputation) return null;

    const handleDecision = (accepted) => {
        setVisitAccepted(accepted);
        setStep(2);
        setFormErrors({});
    };

    const validateStep2 = () => {
        const errors = {};
        if (!nextVisitDate) {
            errors.nextVisitDate = "La date de la prochaine visite est requise.";
        } else if (new Date(nextVisitDate) < new Date(new Date().toDateString())) {
            errors.nextVisitDate = "La date de la prochaine visite ne peut pas être dans le passé.";
        }
        if (!visitPerformedDate) {
            errors.visitPerformedDate = "La date de la visite effectuée est requise.";
        } else if (new Date(visitPerformedDate) > new Date(new Date().toDateString())) {
            errors.visitPerformedDate = "La date de la visite effectuée ne peut pas être dans le futur.";
        }
        if (nextVisitDate && visitPerformedDate && new Date(nextVisitDate) <= new Date(visitPerformedDate)) {
            errors.nextVisitDate = "La date de la prochaine visite doit être après la date de la visite effectuée.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateStep2()) return;
        setIsSubmitting(true);
        try {
            await onUpdateCycleVisite(ordreImputation.id_ordre, {
                visite_acceptee: visitAccepted,
                date_prochaine_visite: nextVisitDate,
                date_visite_effectuee: visitPerformedDate,
            });
            onClose();
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la visite de cycle:", error);
            setFormErrors({ submit: error.message || "Échec de la mise à jour. Veuillez réessayer." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose} className="max-w-md">
            <DialogHeader>
                <DialogTitle id={`cycle-visit-title-${ordreImputation.id_ordre}`} className="flex items-center">
                    <RotateCcw className="h-6 w-6 mr-2 text-blue-600" /> Enregistrer Visite de Cycle pour OI: {ordreImputation.value}
                </DialogTitle>
                <DialogDescription>
                    {step === 1 ? "Indiquez le résultat de la visite de cycle." : "Saisissez la date de la prochaine visite."}
                </DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-4">
                {formErrors.submit && <ErrorMessage message={formErrors.submit} className="text-center" />}
                {step === 1 && (
                    <div className="text-center space-y-3">
                        <p className="text-md font-medium text-gray-700">L'essai de visite pour l'Ordre d'Imputation "{ordreImputation.value}" a-t-il été accepté ?</p>
                        <div className="flex justify-center space-x-4 pt-2">
                            <Button onClick={() => handleDecision(true)} className="bg-green-600 hover:bg-green-700 text-white w-24"> <CheckCircle className="h-4 w-4 mr-2" /> Oui </Button>
                            <Button onClick={() => handleDecision(false)} variant="destructive" className="w-24"> <X className="h-4 w-4 mr-2" /> Non </Button>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="visitPerformedDate">Date de la visite effectuée/tentée :</Label>
                            <Input id="visitPerformedDate" type="date" value={visitPerformedDate} onChange={(e) => setVisitPerformedDate(e.target.value)} className={formErrors.visitPerformedDate ? 'ring-1 ring-red-500 border-red-500' : ''} />
                            <ErrorMessage message={formErrors.visitPerformedDate} />
                        </div>
                        <div>
                            <Label htmlFor="nextVisitDate">Date de la prochaine visite de cycle :</Label>
                            <Input id="nextVisitDate" type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} className={formErrors.nextVisitDate ? 'ring-1 ring-red-500 border-red-500' : ''} />
                            <ErrorMessage message={formErrors.nextVisitDate} />
                        </div>
                        <p className="text-sm text-gray-600"> Résultat de la visite actuelle : <span className={cn("font-semibold", visitAccepted ? "text-green-600" : "text-red-600")}> {visitAccepted ? "Acceptée" : "Échouée"} </span> </p>
                    </div>
                )}
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Annuler</Button>
                {step === 2 && (
                    <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                        {isSubmitting ? "Soumission..." : <><Save className="h-4 w-4 mr-2" /> Soumettre</>}
                    </Button>
                )}
            </DialogFooter>
        </Dialog>
    );
};

export const AdminCycleVisitInfoModal = ({ isOpen, onClose, info }) => {
    if (!isOpen || !info || !info.ordre) return null;
    const { ordre, message } = info;
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('fr-CA');
        } catch (e) {
            return 'Date invalide';
        }
    };
    return (
        <Dialog open={isOpen} onOpenChange={onClose} className="max-w-lg">
            <DialogHeader>
                <DialogTitle id={`admin-cycle-info-title-${ordre.id_ordre}`} className="flex items-center">
                    <Info className="h-6 w-6 mr-2 text-blue-600" /> Information: Mise à Jour Visite de Cycle
                </DialogTitle>
                <DialogDescription>
                    Détails de la mise à jour pour l'Ordre d'Imputation: <strong>{ordre.value}</strong>
                </DialogDescription>
            </DialogHeader>
            <DialogContent className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <h4 className="font-semibold text-sm text-blue-700 mb-1">Message de Notification:</h4>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{message || "Aucun message de notification spécifique."}</p>
                </div>
                <div className="border-t pt-3 space-y-1">
                    <p className="text-sm"><strong>Ordre d'Imputation:</strong> {ordre.value}</p>
                    <p className="text-sm"><strong>Date Prochaine Visite:</strong> {formatDate(ordre.date_prochain_cycle_visite)}</p>
                    <p className="text-sm"><strong>Date Dernière Visite Effectuée:</strong> {formatDate(ordre.date_derniere_visite_effectuee)}</p>
                    <p className="text-sm"><strong>Résultat Dernière Visite:</strong>
                        <span className={cn("font-semibold ml-1", ordre.dernier_cycle_visite_resultat === null || ordre.dernier_cycle_visite_resultat === undefined ? "text-gray-500" : ordre.dernier_cycle_visite_resultat ? "text-green-600" : "text-red-600")}>
                            {ordre.dernier_cycle_visite_resultat === null || ordre.dernier_cycle_visite_resultat === undefined ? "N/A" : ordre.dernier_cycle_visite_resultat ? "Acceptée" : "Échouée"}
                        </span>
                    </p>
                </div>
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Fermer</Button>
            </DialogFooter>
        </Dialog>
    );
};
