
import React, { useState } from 'react';
import { Medication } from '../types';
import { checkDrugInteractions } from '../services/geminiService';
import Loader from './shared/Loader';

interface MedicationManagerProps {
    medications: Medication[];
    setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
}

const MedicationManager: React.FC<MedicationManagerProps> = ({ medications, setMedications }) => {
    const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '' });
    const [interactionResult, setInteractionResult] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    const handleAddMedication = () => {
        if (!newMed.name || !newMed.dosage || !newMed.frequency) {
            alert("Please fill all medication fields.");
            return;
        }
        setMedications([...medications, { ...newMed, id: Date.now() }]);
        setNewMed({ name: '', dosage: '', frequency: '' });
    };

    const handleInteractionCheck = async () => {
        setIsChecking(true);
        setInteractionResult('');
        try {
            const result = await checkDrugInteractions(medications.map(m => m.name));
            setInteractionResult(result);
        } catch (error) {
            console.error(error);
            setInteractionResult('An error occurred while checking for interactions.');
        } finally {
            setIsChecking(false);
        }
    };
    
    return (
        <div className="p-6 bg-white rounded-2xl shadow-lg h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Medication & Adherence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Current Prescriptions</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {medications.length > 0 ? medications.map(med => (
                            <div key={med.id} className="p-3 bg-slate-50 rounded-md">
                                <p className="font-semibold">{med.name}</p>
                                <p className="text-sm text-slate-600">{med.dosage}, {med.frequency}</p>
                            </div>
                        )) : <p className="text-slate-500 text-sm">No medications added.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Add New Medication</h3>
                    <div className="space-y-2">
                        <input type="text" placeholder="Medication Name" value={newMed.name} onChange={(e) => setNewMed({...newMed, name: e.target.value})} className="w-full p-2 border rounded-md bg-white text-slate-900 placeholder-slate-400" />
                        <input type="text" placeholder="Dosage (e.g., 50mg)" value={newMed.dosage} onChange={(e) => setNewMed({...newMed, dosage: e.target.value})} className="w-full p-2 border rounded-md bg-white text-slate-900 placeholder-slate-400" />
                        <input type="text" placeholder="Frequency (e.g., Once a day)" value={newMed.frequency} onChange={(e) => setNewMed({...newMed, frequency: e.target.value})} className="w-full p-2 border rounded-md bg-white text-slate-900 placeholder-slate-400" />
                        <button onClick={handleAddMedication} className="w-full bg-blue-500 text-white rounded-md py-2 hover:bg-blue-600 transition">Add Medication</button>
                    </div>
                </div>
            </div>
            <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">AI Drug Interaction Checker</h3>
                <button
                    onClick={handleInteractionCheck}
                    disabled={isChecking || medications.length < 2}
                    className="bg-green-500 text-white rounded-md py-2 px-4 hover:bg-green-600 transition disabled:bg-slate-400 flex items-center justify-center"
                >
                    {isChecking ? <Loader /> : 'Check for Interactions'}
                </button>
                {interactionResult && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg whitespace-pre-wrap text-sm text-amber-800">
                        <p className="font-bold mb-2">Interaction Report:</p>
                        {interactionResult}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedicationManager;