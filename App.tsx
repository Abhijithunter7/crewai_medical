
import React, { useState } from 'react';
import { Appointment, Consultation, Medication, PatientProfile, View } from './types';
import SymptomChecker from './components/SymptomChecker';
import Scheduler from './components/Scheduler';
import PatientProfileComponent from './components/PatientProfile';
import MedicationManager from './components/MedicationManager';
import ConsultationAnalyzer from './components/ConsultationAnalyzer';
import HealthInsights from './components/HealthInsights';
import { CalendarIcon, FileTextIcon, PillIcon, SparklesIcon, StethoscopeIcon, UserIcon } from './components/shared/IconComponents';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('symptom-checker');
    const [initialSpecialty, setInitialSpecialty] = useState<string>('');
    
    // Shared state for the application
    const [patientProfile, setPatientProfile] = useState<PatientProfile>({
        name: 'Alex Doe', dob: '1990-05-15', bloodType: 'O+', allergies: 'Peanuts', medicalHistorySummary: ''
    });
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [consultations, setConsultations] = useState<Consultation[]>([]);

    const requestAppointment = (specialty: string) => {
        setInitialSpecialty(specialty);
        setActiveView('scheduler');
    };

    const updatePatientProfile = (updates: Partial<PatientProfile>) => {
        setPatientProfile(prevProfile => ({ ...prevProfile, ...updates }));
    };

    const renderView = () => {
        switch (activeView) {
            case 'symptom-checker': 
                return <SymptomChecker setActiveView={setActiveView} requestAppointment={requestAppointment} updatePatientProfile={updatePatientProfile} />;
            case 'scheduler': 
                return <Scheduler 
                            appointments={appointments} 
                            setAppointments={setAppointments} 
                            patientName={patientProfile.name} 
                            initialSpecialty={initialSpecialty}
                            onInitialSearchDone={() => setInitialSpecialty('')}
                       />;
            case 'patient-profile': 
                return <PatientProfileComponent profile={patientProfile} setProfile={setPatientProfile} />;
            case 'medication-manager': 
                return <MedicationManager medications={medications} setMedications={setMedications} />;
            case 'consultation-analyzer': 
                return <ConsultationAnalyzer consultations={consultations} setConsultations={setConsultations} />;
            case 'health-insights': 
                return <HealthInsights />;
            default: 
                return <SymptomChecker setActiveView={setActiveView} requestAppointment={requestAppointment} updatePatientProfile={updatePatientProfile} />;
        }
    };

    const NavItem = ({ view, label, icon }: { view: View; label: string; icon: React.ReactNode }) => (
        <button
            onClick={() => setActiveView(view)}
            className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                activeView === view
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-blue-100 hover:text-blue-700'
            }`}
        >
            {icon}
            <span className="ml-3 font-medium">{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            <aside className="w-64 bg-white p-4 flex-shrink-0 shadow-lg">
                <div className="flex items-center mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                        <StethoscopeIcon/>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">MedCrew AI</h1>
                </div>
                <nav className="space-y-2">
                    <NavItem view="symptom-checker" label="Symptom Checker" icon={<StethoscopeIcon />} />
                    <NavItem view="scheduler" label="Scheduler" icon={<CalendarIcon />} />
                    <NavItem view="patient-profile" label="Patient Profile" icon={<UserIcon />} />
                    <NavItem view="medication-manager" label="Medications" icon={<PillIcon />} />
                    <NavItem view="consultation-analyzer" label="Consultations" icon={<FileTextIcon />} />
                    <NavItem view="health-insights" label="Health Insights" icon={<SparklesIcon />} />
                </nav>
            </aside>
            <main className="flex-1 p-6 overflow-hidden">
                <div className="h-full">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default App;