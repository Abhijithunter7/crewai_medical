
import React, { useState } from 'react';
import { PatientProfile as PatientProfileType } from '../types';
import { summarizeDocument } from '../services/geminiService';
import Loader from './shared/Loader';

interface PatientProfileProps {
    profile: PatientProfileType;
    setProfile: React.Dispatch<React.SetStateAction<PatientProfileType>>;
}

const PatientProfile: React.FC<PatientProfileProps> = ({ profile, setProfile }) => {
  const [medicalDocs, setMedicalDocs] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleSummarize = async () => {
    if (!medicalDocs) return;
    setIsSummarizing(true);
    try {
        const summary = await summarizeDocument(medicalDocs);
        setProfile({ ...profile, medicalHistorySummary: summary });
    } catch (error) {
        console.error(error);
    } finally {
        setIsSummarizing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg h-full overflow-y-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Patient Onboarding & Data</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Patient Information</h3>
          <div className="space-y-3">
            <input type="text" name="name" placeholder="Full Name" value={profile.name} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-white text-slate-900 placeholder-slate-400" />
            <input type="text" name="dob" placeholder="Date of Birth (YYYY-MM-DD)" value={profile.dob} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-white text-slate-900 placeholder-slate-400" />
            <input type="text" name="bloodType" placeholder="Blood Type" value={profile.bloodType} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-white text-slate-900 placeholder-slate-400" />
            <textarea name="allergies" placeholder="Allergies" value={profile.allergies} onChange={handleInputChange} className="w-full p-2 border rounded-md h-24 bg-white text-slate-900 placeholder-slate-400" />
          </div>
        </div>
        <div>
            <h3 className="text-lg font-semibold mb-2">Upload Medical Documents</h3>
            <p className="text-xs text-slate-500 mb-2">For demo purposes, paste the text from your medical documents below.</p>
            <textarea
                placeholder="Paste medical history text here..."
                className="w-full p-2 border rounded-md h-36 bg-white text-slate-900 placeholder-slate-400"
                value={medicalDocs}
                onChange={(e) => setMedicalDocs(e.target.value)}
            />
            <button
                onClick={handleSummarize}
                disabled={isSummarizing || !medicalDocs}
                className="w-full mt-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors py-2 flex items-center justify-center disabled:bg-slate-400"
            >
                {isSummarizing ? <Loader /> : 'Generate AI Summary'}
            </button>
        </div>
      </div>
      <div className="mt-6 border-t pt-6">
        <h3 className="text-lg font-semibold mb-2">AI-Generated Medical Summary</h3>
        <div className="p-4 bg-slate-50 rounded-lg whitespace-pre-wrap text-sm text-slate-700 min-h-[100px]">
            {profile.medicalHistorySummary || "Summary will appear here after processing documents."}
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
