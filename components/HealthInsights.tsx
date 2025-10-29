
import React, { useState } from 'react';
import { getHealthInsight } from '../services/geminiService';
import Loader from './shared/Loader';

const HealthInsights: React.FC = () => {
    const [diaryEntry, setDiaryEntry] = useState('');
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pastInsights, setPastInsights] = useState<string[]>([]);

    const handleGenerateInsight = async () => {
        if (!diaryEntry) return;
        setIsLoading(true);
        setInsight('');
        try {
            const newInsight = await getHealthInsight(diaryEntry);
            setInsight(newInsight);
            setPastInsights(prev => [newInsight, ...prev].slice(0, 3)); // Keep last 3
            setDiaryEntry('');
        } catch (error) {
            console.error(error);
            setInsight('Failed to generate an insight. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-lg h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Personalized Health Insights</h2>
            <p className="text-sm text-slate-500 mb-4">
                Log your daily activity, mood, or any health-related notes to receive personalized tips and motivation.
            </p>
            <textarea
                placeholder="How are you feeling today? Any activities or meals to note?"
                className="w-full p-2 border rounded-md h-32 mb-2"
                value={diaryEntry}
                onChange={(e) => setDiaryEntry(e.target.value)}
            />
            <button
                onClick={handleGenerateInsight}
                disabled={isLoading || !diaryEntry}
                className="w-full bg-blue-500 text-white rounded-md py-2 flex items-center justify-center hover:bg-blue-600 transition disabled:bg-slate-400"
            >
                {isLoading ? <Loader /> : 'Generate My Insight'}
            </button>
            {insight && (
                <div className="mt-6 border-t pt-6">
                    <h3 className="text-lg font-semibold mb-2">Today's Insight</h3>
                    <div className="p-4 bg-indigo-50 text-indigo-800 rounded-lg whitespace-pre-wrap">
                        {insight}
                    </div>
                </div>
            )}
             {pastInsights.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Recent Insights</h3>
                    <div className="space-y-2">
                        {pastInsights.map((ins, i) => (
                             <div key={i} className="p-3 bg-slate-100 rounded-md text-sm text-slate-600 opacity-80">
                                {ins.substring(0, 150)}...
                            </div>
                        ))}
                    </div>
                </div>
             )}
        </div>
    );
};

export default HealthInsights;
