import React, { useEffect, useState } from 'react';
import { SheetData } from './types';
import { fetchSheetData } from './services/sheetService';
import { DashboardPanel } from './components/DashboardPanel';
import { LayoutDashboard, FileSpreadsheet, AlertTriangle, RefreshCw, Box } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const sheetData = await fetchSheetData();
      setData(sheetData);
    } catch (err) {
      console.error(err);
      setError("Failed to load Google Sheet data. Please ensure the sheet is published to web as CSV or accessible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Modern Header */}
      <header className="flex-none z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0">
        <div className="w-full px-6">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo / Brand */}
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                <Box className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
                  RMUTL Asset Analytics
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Civil Engineering Dept.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-lg border border-slate-200/50">
                 <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                 <span className="text-xs font-medium text-slate-500">
                   {loading ? 'Syncing...' : 'Live Data'}
                 </span>
              </div>

              <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>

              <a 
                href="https://docs.google.com/spreadsheets/d/11vduoiBj1WAQVzqtpPi4tz_XJcG9fx5tu3s5dGcIzfs/edit?usp=sharing" 
                target="_blank" 
                rel="noreferrer"
                className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Source
              </a>
              <button 
                onClick={loadData}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content (Full Width Layout) */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {loading && !data && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Box className="w-6 h-6 text-indigo-600/50" />
                </div>
            </div>
            <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading Asset Data...</p>
          </div>
        )}

        {error && (
           <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
             <div className="p-8 bg-white border border-red-100 rounded-2xl shadow-xl flex flex-col items-center max-w-md text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Connection Issue</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{error}</p>
                <button 
                    onClick={loadData} 
                    className="mt-6 px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                >
                    Retry Connection
                </button>
             </div>
           </div>
        )}

        {!loading && data && (
          // Full width Dashboard Panel
          <div className="w-full h-full flex flex-col z-10 bg-white relative">
              <DashboardPanel data={data} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;