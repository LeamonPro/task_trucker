// src/components/modals/ChangeOiHoursView.jsx
import React, { useState, useEffect } from 'react';
import { Hourglass, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button, Input, Select, Label, ErrorMessage } from '../ui';

const ChangeOiHoursView = ({ ordresImputation, onUpdateOiHours, isLoadingOis }) => {
    const [selectedOiId, setSelectedOiId] = useState('');
    const [currentOiHours, setCurrentOiHours] = useState('');
    const [newHours, setNewHours] = useState('');
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (selectedOiId) {
            const oi = ordresImputation.find(o => o.id_ordre === selectedOiId);
            if (oi) {
                setCurrentOiHours(oi.total_hours_of_work !== null && oi.total_hours_of_work !== undefined ? oi.total_hours_of_work.toString() : '');
                setNewHours(oi.total_hours_of_work !== null && oi.total_hours_of_work !== undefined ? oi.total_hours_of_work.toString() : '');
            } else {
                setCurrentOiHours('');
                setNewHours('');
            }
        } else {
            setCurrentOiHours('');
            setNewHours('');
        }
        setFormError('');
        setSuccessMessage('');
    }, [selectedOiId, ordresImputation]);

    const handleSubmit = async () => {
        setFormError('');
        setSuccessMessage('');
        if (!selectedOiId) {
            setFormError("Veuillez sélectionner un Ordre d'Imputation.");
            return;
        }
        if (!newHours || isNaN(parseFloat(newHours)) || parseFloat(newHours) < 0) {
            setFormError("Le nouveau nombre d'heures doit être un nombre positif.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onUpdateOiHours(selectedOiId, parseFloat(newHours));
            setSuccessMessage("Heures de travail mises à jour avec succès !");
        } catch (error) {
            console.error("Erreur lors de la mise à jour des heures de l'OI:", error);
            setFormError(error.message || "Échec de la mise à jour des heures. Veuillez réessayer.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-y-auto min-h-[calc(100vh-250px)] custom-scrollbar">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-6">
                <Hourglass className="h-6 w-6 mr-2 text-blue-600" />
                Modifier les Heures de Travail des Ordres d'Imputation
            </h2>
            <div className="space-y-4 p-4 border rounded-md bg-slate-50 shadow">
                <div>
                    <Label htmlFor="select-oi-for-hours">Sélectionner un Ordre d'Imputation</Label>
                    <Select
                        id="select-oi-for-hours"
                        value={selectedOiId}
                        onChange={(e) => setSelectedOiId(e.target.value)}
                        className={formError && !selectedOiId ? 'ring-1 ring-red-500 border-red-500' : ''}
                        disabled={isLoadingOis}
                    >
                        <option value="">-- Sélectionner un OI --</option>
                        {ordresImputation.map(oi => (
                            <option key={oi.id_ordre} value={oi.id_ordre}>{oi.value}</option>
                        ))}
                    </Select>
                    {formError && !selectedOiId && <ErrorMessage message={formError} />}
                </div>

                {selectedOiId && (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-700">
                            Heures de travail actuelles pour OI "{ordresImputation.find(o => o.id_ordre === selectedOiId)?.value || ''}" :
                            <span className="font-semibold ml-2">
                                {currentOiHours !== '' ? `${currentOiHours}h` : 'N/A'}
                            </span>
                        </p>
                        <div>
                            <Label htmlFor="new-hours">Nouveau nombre d'heures de travail</Label>
                            <Input
                                id="new-hours"
                                type="number"
                                step="0.01"
                                value={newHours}
                                onChange={(e) => {
                                    setNewHours(e.target.value);
                                    if (formError) setFormError('');
                                }}
                                placeholder="ex: 1500.25"
                                className={formError && newHours !== '' ? 'ring-1 ring-red-500 border-red-500' : ''}
                            />
                            {formError && newHours !== '' && <ErrorMessage message={formError} />}
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedOiId || newHours === '' || isNaN(parseFloat(newHours)) || parseFloat(newHours) < 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSubmitting ? 'Mise à jour...' : <><Save className="h-4 w-4 mr-2" /> Mettre à jour les heures</>}
                        </Button>
                        {successMessage && (
                            <p className="text-sm text-green-600 bg-green-100 p-3 rounded-md text-center">
                                <CheckCircle className="inline h-4 w-4 mr-1"/> {successMessage}
                            </p>
                        )}
                        {formError && !successMessage && (
                            <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">
                                <AlertTriangle className="inline h-4 w-4 mr-1"/> {formError}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangeOiHoursView;
