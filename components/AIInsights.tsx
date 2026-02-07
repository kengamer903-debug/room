import React, { useState } from 'react';
import { SheetData } from '../types';
import { analyzeDashboardData } from '../services/geminiService';
import { Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface AIInsightsProps {
  data: SheetData;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ data }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeDashboardData(data);
      setAnalysis(result);
    } catch (err) {
      setError("Failed to generate analysis. Please check your API Key configuration.");
    } finally {
      setLoading(false);
    }
  };

  // Simple Markdown renderer replacement
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2"></div>;
      
      if (trimmed.startsWith('### ')) {
        return <h4 key={i} className="text-md font-bold text-slate-800 mt-3 mb-1">{trimmed.replace('### ', '')}</h4>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={i} className="text-lg font-bold text-indigo-900 mt-4 mb-2 pb-1 border-b border-indigo-100">{trimmed.replace('## ', '')}</h3>;
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return <p key={i} className="font-bold text-slate-800 mt-2">{trimmed.replace(/\*\*/g, '')}</p>;
      }
      if (trimmed.startsWith('- ')) {
        const content = trimmed.replace('- ', '');
        // Highlight bold parts inside list items
        const parts = content.split('**');
        return (
          <li key={i} className="ml-4 list-disc text-slate-700 mb-1 pl-1 marker:text-indigo-400">
            {parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-slate-900 font-semibold">{part}</strong> : part)}
          </li>
        );
      }
      return <p key={i} className="text-slate-600 mb-1 leading-relaxed">{trimmed.replace(/\*\*/g, '')}</p>;
    });
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl shadow-sm border border-indigo-100 mb-8 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-sm shadow-indigo-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">AI Data Analyst</h3>
            <p className="text-sm text-slate-500">Powered by Gemini 3 Flash</p>
          </div>
        </div>
        
        {!analysis && !loading && (
          <button 
            onClick={handleAnalyze}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Generate Insights
          </button>
        )}
        
        {analysis && !loading && (
           <button 
            onClick={handleAnalyze}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-xl border border-indigo-50 animate-pulse">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-indigo-900 font-medium text-lg">Analyzing your data...</p>
          <p className="text-indigo-500 text-sm mt-1">Detecting trends and anomalies</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Analysis Failed</p>
            <p className="text-sm opacity-90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {analysis && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in relative z-10">
           <div className="prose prose-indigo max-w-none text-sm sm:text-base">
             {renderContent(analysis)}
           </div>
        </div>
      )}
    </div>
  );
};