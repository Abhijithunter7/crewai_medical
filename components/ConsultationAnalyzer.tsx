import React, { useState, useRef } from 'react';
import { Consultation } from '../types';
import { analyzeConsultationNotes } from '../services/geminiService';
import Loader from './shared/Loader';
import { PaperclipIcon } from './shared/IconComponents';

interface ConsultationAnalyzerProps {
    consultations: Consultation[];
    setConsultations: React.Dispatch<React.SetStateAction<Consultation[]>>;
}

const ConsultationAnalyzer: React.FC<ConsultationAnalyzerProps> = ({ consultations, setConsultations }) => {
    const [doctorName, setDoctorName] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isAnalyzing) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (e.g., JPG, PNG).');
            return;
        }

        if (!doctorName) {
            alert("Please provide the doctor's name before uploading notes.");
            event.target.value = ''; // Reset file input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target?.result as string;
            if (imageDataUrl) {
                analyzeImage(imageDataUrl, file.name);
            }
        };
        reader.readAsDataURL(file);
        event.target.value = ''; // Reset file input
    };
    
    const analyzeImage = async (imageDataUrl: string, fileName: string) => {
        setIsAnalyzing(true);
        try {
            const [meta, base64Data] = imageDataUrl.split(',');
            const mimeType = meta.match(/:(.*?);/)?.[1];
            if (!mimeType || !base64Data) {
                throw new Error("Invalid image data URL.");
            }

            const { summary, actionItems } = await analyzeConsultationNotes({ mimeType, data: base64Data });
            const newConsultation: Consultation = {
                id: Date.now(),
                date: new Date().toLocaleDateString(),
                doctorName,
                notes: `Analyzed from uploaded image: ${fileName}`,
                summary,
                actionItems
            };
            setConsultations([newConsultation, ...consultations]);
            setDoctorName('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    return (
        <div className="p-6 bg-white rounded-2xl shadow-lg h-full overflow-y-auto flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
                 <h2 className="text-xl font-bold text-slate-800 mb-4">Post-Consultation Automation</h2>
                 <h3 className="text-lg font-semibold mb-2">Add New Consultation</h3>
                 <div className="space-y-3">
                    <input type="text" placeholder="Doctor's Name" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="w-full p-2 border rounded-md" />
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    <button
                        onClick={handleFileSelect}
                        disabled={isAnalyzing || !doctorName}
                        className="w-full bg-blue-500 text-white rounded-md py-2 flex justify-center items-center hover:bg-blue-600 transition disabled:bg-slate-400"
                    >
                        {isAnalyzing ? <Loader /> : (
                            <div className="flex items-center">
                                <PaperclipIcon />
                                <span className="ml-2">Upload & Analyze Notes</span>
                            </div>
                        )}
                    </button>
                </div>
                <h3 className="text-lg font-semibold mt-6 mb-2">Past Consultations</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {consultations.map(c => (
                        <div key={c.id} onClick={() => setSelectedConsultation(c)} className="cursor-pointer p-2 bg-slate-100 rounded-md hover:bg-blue-100">
                           <p className="font-semibold">{c.date} - Dr. {c.doctorName}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-6">
                 <h2 className="text-xl font-bold text-slate-800 mb-4">Consultation Details</h2>
                 {selectedConsultation ? (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{selectedConsultation.date} with Dr. {selectedConsultation.doctorName}</h3>
                        <div>
                            <h4 className="font-bold text-slate-700">AI Summary</h4>
                            <p className="p-3 bg-slate-50 rounded-md text-sm">{selectedConsultation.summary}</p>
                        </div>
                         <div>
                            <h4 className="font-bold text-slate-700">Patient Action Items</h4>
                            <ul className="p-3 bg-green-50 rounded-md text-sm list-disc list-inside space-y-1">
                                {selectedConsultation.actionItems.length > 0 ? selectedConsultation.actionItems.map((item, i) => (
                                    <li key={i}>{item}</li>
                                )) : <li>No specific action items were identified.</li>}
                            </ul>
                        </div>
                    </div>
                 ) : (
                    <p className="text-slate-500 text-center mt-10">Select a past consultation to view details.</p>
                 )}
            </div>
        </div>
    );
};

export default ConsultationAnalyzer;