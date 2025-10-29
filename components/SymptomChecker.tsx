import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageAction, View, PatientProfile } from '../types';
import { runSymptomTriageGraph, extractInfoFromReport } from '../services/geminiService';
import Loader from './shared/Loader';
import { BotIcon, PaperclipIcon, SendIcon, UserIcon } from './shared/IconComponents';

interface SymptomCheckerProps {
  setActiveView: (view: View) => void;
  requestAppointment: (specialty: string) => void;
  updatePatientProfile: (updates: Partial<PatientProfile>) => void;
}

type GraphState = 'IDLE' | 'ANALYZING' | 'CLARIFYING' | 'RECOMMENDING';

const GraphStatusIndicator: React.FC<{ state: GraphState }> = ({ state }) => {
    const steps = [
        { id: 'ANALYZING', label: 'Analyze Input' },
        { id: 'CLARIFYING', label: 'Clarify Symptoms' },
        { id: 'RECOMMENDING', label: 'Formulate Recommendation' },
    ];

    const getStatus = (stepId: string): 'idle' | 'active' | 'done' | 'skipped' => {
        if (state === 'IDLE') return 'idle';

        const stateIndex = state === 'ANALYZING' ? 0 : state === 'CLARIFYING' ? 1 : 2;
        const stepIndex = stepId === 'ANALYZING' ? 0 : stepId === 'CLARIFYING' ? 1 : 2;

        if (stepIndex < stateIndex) {
            if (state === 'RECOMMENDING' && stepId === 'CLARIFYING') {
                return 'skipped';
            }
            return 'done';
        }
        if (stepIndex === stateIndex) {
            return 'active';
        }
        return 'idle';
    };

    return (
        <div className="flex items-center justify-center space-x-4 md:space-x-6 py-2 px-4 bg-slate-100 rounded-full my-3">
            {steps.map((step) => {
                const status = getStatus(step.id);
                return (
                    <div key={step.id} className="flex items-center text-xs font-medium">
                        <div className={`w-3 h-3 rounded-full mr-2 transition-all duration-300 ${
                            status === 'active' ? 'bg-green-500 animate-pulse scale-110' :
                            status === 'done' ? 'bg-green-500' :
                            status === 'skipped' ? 'bg-slate-300' :
                            'bg-slate-300'
                        }`}></div>
                        <span className={`transition-colors duration-300 ${
                            status === 'idle' ? 'text-slate-400' : 'text-slate-700'
                        }`}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};


const SymptomChecker: React.FC<SymptomCheckerProps> = ({ setActiveView, requestAppointment, updatePatientProfile }) => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: "Hello! I'm your AI Medical Assistant. Please describe your symptoms, and I'll ask some questions to understand your situation better. You can also upload a medical report for a quick analysis." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [graphState, setGraphState] = useState<GraphState>('IDLE');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setGraphState('ANALYZING');

    try {
      const triageResult = await runSymptomTriageGraph(newMessages);

      if (triageResult.decision === 'CLARIFY') {
        setGraphState('CLARIFYING');
      } else {
        setGraphState('RECOMMENDING');
      }

      setTimeout(() => {
        let aiMessage: Message;

        if (triageResult.decision === 'TRIAGE' && triageResult.specialty) {
            const actions: MessageAction[] = [
                { 
                    text: `Find a ${triageResult.specialty}`, 
                    style: 'primary', 
                    onClick: () => requestAppointment(triageResult.specialty) 
                },
                { text: 'No, thanks', style: 'secondary', onClick: () => {} },
            ];
            aiMessage = { sender: 'ai', text: `${triageResult.text}\n\nWould you like me to help you find a specialist?`, actions };
        } else {
            aiMessage = { sender: 'ai', text: triageResult.text };
        }
        
        setMessages([...newMessages, aiMessage]);
        setIsLoading(false);
        setGraphState('IDLE');
      }, 800);

    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { sender: 'ai', text: 'Sorry, something went wrong. Please try again.' }]);
      setIsLoading(false);
      setGraphState('IDLE');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isLoading) return;

    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (e.g., JPG, PNG).');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        if (imageDataUrl) {
            const userMessage: Message = { sender: 'user', text: `Uploaded ${file.name}`, image: imageDataUrl };
            const newMessages = [...messages, userMessage];
            setMessages(newMessages);
            analyzeReport(imageDataUrl, newMessages);
        }
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset file input
  };
  
  const analyzeReport = async (imageDataUrl: string, currentMessages: Message[]) => {
    setIsLoading(true);
    try {
        const [meta, base64Data] = imageDataUrl.split(',');
        const mimeType = meta.match(/:(.*?);/)?.[1];
        if (!mimeType || !base64Data) {
            throw new Error("Invalid image data URL.");
        }

        const extractedData = await extractInfoFromReport({ mimeType, data: base64Data });
        
        if (extractedData.patientProfile) {
            // Filter out empty values from the extracted profile before updating
            const profileUpdates = Object.fromEntries(
                Object.entries(extractedData.patientProfile).filter(([, value]) => value)
            );
            
            if (Object.keys(profileUpdates).length > 0) {
                updatePatientProfile(profileUpdates);
            }
        }
        
        let responseMessage: Message;
        const { summary, specialty, bookAppointment } = extractedData;

        if (bookAppointment) {
            const actions: MessageAction[] = [
                { 
                    text: 'Yes, find a doctor', 
                    style: 'primary', 
                    onClick: () => specialty ? requestAppointment(specialty) : setActiveView('scheduler') 
                },
                { text: 'No, thanks', style: 'secondary', onClick: () => {} },
            ];
            responseMessage = { sender: 'ai', text: `${summary}\n\nWould you like to book an appointment with a ${specialty || 'specialist'}?`, actions };
        } else {
            responseMessage = { sender: 'ai', text: summary };
        }
        setMessages([...currentMessages, responseMessage]);
    } catch (error) {
        console.error(error);
        setMessages([...currentMessages, { sender: 'ai', text: 'Sorry, I had trouble analyzing the report. Please try again.' }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 text-center">AI Symptom Checker & Triage</h2>
        <p className="text-sm text-slate-500 text-center">Describe your symptoms or upload a report to get a care recommendation.</p>
        {isLoading && <GraphStatusIndicator state={graphState} />}
      </div>
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <BotIcon />
                </div>
              )}
              <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {msg.image && (
                    <div className="mt-2">
                        <img src={msg.image} alt="Uploaded content" className="rounded-lg max-w-xs max-h-48" />
                    </div>
                )}
                {msg.actions && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {msg.actions.map((action, i) => (
                            <button key={i} onClick={action.onClick} className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                                action.style === 'primary' 
                                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                : 'bg-slate-300 text-slate-800 hover:bg-slate-400'
                            } transition-colors`}>
                                {action.text}
                            </button>
                        ))}
                    </div>
                )}
              </div>
               {msg.sender === 'user' && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center">
                  <UserIcon />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <BotIcon />
              </div>
              <div className="max-w-md p-3 rounded-2xl bg-slate-200 text-slate-800 rounded-bl-none">
                 <Loader />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="w-full py-3 pl-12 pr-12 text-sm text-slate-700 bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
          <button
            onClick={handleFileSelect}
            disabled={isLoading}
            className="absolute inset-y-0 left-0 flex items-center justify-center w-12 h-full text-slate-500 hover:text-blue-500 disabled:text-slate-400 transition-colors"
          >
            <PaperclipIcon />
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !input}
            className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-full text-blue-500 hover:text-blue-700 disabled:text-slate-400 transition-colors"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SymptomChecker;