import React, { useState, useMemo, useEffect } from 'react';
import { SheetData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DataGrid } from './DataGrid';
import { Building2, Tag, LayoutGrid, RotateCcw, Filter } from 'lucide-react';

interface DashboardPanelProps {
  data: SheetData;
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ data }) => {
  // 1. Identify Key Columns
  const buildingCol = useMemo(() => 
    data.columns.find(c => /building|ตึก|อาคาร/i.test(c.name)), [data.columns]);
    
  const conditionCol = useMemo(() => 
    data.columns.find(c => /condition|status|สภาพ|สถานะ/i.test(c.name)), [data.columns]);

  // 2. Extract Unique Values
  const buildings = useMemo(() => {
    if (!buildingCol) return [];
    const set = new Set(data.rows.map(r => String(r[buildingCol.name] || 'Unknown').trim()));
    return Array.from(set).sort();
  }, [data.rows, buildingCol]);

  const conditions = useMemo(() => {
    if (!conditionCol) return [];
    const set = new Set(data.rows.map(r => String(r[conditionCol.name] || 'Blank').trim()));
    return Array.from(set).sort();
  }, [data.rows, conditionCol]);

  // 3. State
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set());
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());

  // Initialize
  useEffect(() => {
    setSelectedBuildings(new Set(buildings));
  }, [buildings]);

  useEffect(() => {
    setSelectedConditions(new Set(conditions));
  }, [conditions]);

  // Enhanced Toggle Logic: Click to Isolate / Toggle
  const toggleBuilding = (b: string) => {
    const isAllSelected = selectedBuildings.size === buildings.length;
    
    if (isAllSelected) {
      // Isolation Mode: If all are selected, clicking one isolates it
      setSelectedBuildings(new Set([b]));
    } else {
      const next = new Set(selectedBuildings);
      if (next.has(b)) {
        next.delete(b);
        // If deselecting results in empty, reset to ALL
        if (next.size === 0) {
          setSelectedBuildings(new Set(buildings));
        } else {
          setSelectedBuildings(next);
        }
      } else {
        next.add(b);
        setSelectedBuildings(next);
      }
    }
  };

  const toggleCondition = (c: string) => {
    const isAllSelected = selectedConditions.size === conditions.length;

    if (isAllSelected) {
       // Isolation Mode
       setSelectedConditions(new Set([c]));
    } else {
       const next = new Set(selectedConditions);
       if (next.has(c)) {
         next.delete(c);
         if (next.size === 0) {
           setSelectedConditions(new Set(conditions));
         } else {
           setSelectedConditions(next);
         }
       } else {
         next.add(c);
         setSelectedConditions(next);
       }
    }
  };

  const selectAllBuildings = () => setSelectedBuildings(new Set(buildings));
  const selectAllConditions = () => setSelectedConditions(new Set(conditions));

  // 4. Filter Data
  const filteredData = useMemo(() => {
    let rows = data.rows;
    if (buildingCol) {
      rows = rows.filter(r => selectedBuildings.has(String(r[buildingCol.name] || 'Unknown').trim()));
    }
    if (conditionCol) {
      rows = rows.filter(r => selectedConditions.has(String(r[conditionCol.name] || 'Blank').trim()));
    }
    return rows;
  }, [data.rows, buildingCol, conditionCol, selectedBuildings, selectedConditions]);

  const tableData = useMemo(() => ({ ...data, rows: filteredData }), [data, filteredData]);

  // 5. Chart Data
  const chartData = useMemo(() => {
    if (!conditionCol) return [];
    const counts: Record<string, number> = {};
    filteredData.forEach(r => {
      const val = String(r[conditionCol.name] || 'Blank').trim();
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, conditionCol]);

  const totalCount = filteredData.length;
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg border border-slate-700">
          <p className="font-semibold mb-1">{payload[0].name}</p>
          <p>Count: {payload[0].value}</p>
          <p className="text-slate-400">{(payload[0].percent * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans overflow-hidden">
      
      {/* 1. Ultra-Compact Header */}
      <div className="flex-none px-4 py-3 bg-white border-b border-slate-200 shadow-sm z-20">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="p-1 bg-indigo-50 rounded-md">
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-xs font-bold text-slate-800 leading-none">Overview</h2>
                </div>
            </div>
            
            <div className="flex gap-4">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Total</span>
                    <span className="text-sm font-bold text-slate-700">{data.rows.length}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] text-emerald-500 font-semibold uppercase">Filtered</span>
                    <span className="text-sm font-bold text-emerald-600">{totalCount}</span>
                </div>
            </div>
         </div>
      </div>

      {/* 2. Compact Visualization Area (Fixed Height 180px) */}
      <div className="flex-none h-[180px] flex border-b border-slate-200 bg-white z-10">
         
         {/* Chart Section */}
         <div className="w-[35%] border-r border-slate-100 flex flex-col items-center justify-center p-2 bg-slate-50/20 relative">
             <div className="absolute top-1.5 left-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
             <div className="w-full h-[100px] relative mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <span className="text-sm font-bold text-slate-700">{totalCount}</span>
                </div>
             </div>
             {/* Tiny Legend */}
             <div className="w-full mt-1 px-1 max-h-[50px] overflow-y-auto scrollbar-none">
                 <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                    {chartData.map((entry, index) => (
                       <div key={entry.name} className="flex items-center gap-1">
                           <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[index % PALETTE.length]}}></div>
                           <span className="text-[9px] text-slate-600 truncate max-w-[50px]" title={entry.name}>{entry.name}</span>
                       </div>
                    ))}
                 </div>
             </div>
         </div>

         {/* Filters Section */}
         <div className="w-[65%] flex flex-col p-2 bg-white">
             {/* Buildings */}
             <div className="flex-1 overflow-hidden flex flex-col mb-1.5">
                 <div className="flex justify-between items-center mb-1 flex-none">
                    <span className="text-[9px] font-bold text-slate-600 uppercase flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> Buildings
                    </span>
                    <button 
                        onClick={selectAllBuildings} 
                        className={`p-0.5 rounded transition-colors ${selectedBuildings.size === buildings.length ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                        title="Reset (Select All)"
                    >
                        <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                 </div>
                 <div className="flex-1 overflow-y-auto pr-1 content-start custom-scrollbar">
                     <div className="flex flex-wrap gap-1">
                        {buildings.map(b => {
                           const isSelected = selectedBuildings.has(b);
                           return (
                               <button
                                  key={b}
                                  onClick={() => toggleBuilding(b)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${
                                      isSelected 
                                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                  }`}
                               >
                                  {b}
                               </button>
                           )
                        })}
                     </div>
                 </div>
             </div>

             <div className="h-px bg-slate-100 flex-none mb-1.5"></div>
             
             {/* Conditions */}
             <div className="flex-none">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-slate-600 uppercase flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Condition
                    </span>
                    <button 
                        onClick={selectAllConditions} 
                        className={`p-0.5 rounded transition-colors ${selectedConditions.size === conditions.length ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                        title="Reset (Select All)"
                    >
                        <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                 </div>
                 <div className="flex flex-wrap gap-1">
                     {conditions.map((c, idx) => {
                           const isSelected = selectedConditions.has(c);
                           const color = PALETTE[idx % PALETTE.length];
                           return (
                               <button
                                  key={c}
                                  onClick={() => toggleCondition(c)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all flex items-center gap-1 ${
                                      isSelected 
                                      ? 'bg-white text-slate-800 border-slate-300 shadow-sm ring-1 ring-slate-100' 
                                      : 'bg-slate-50 text-slate-400 border-transparent opacity-60 hover:opacity-100'
                                  }`}
                               >
                                  <div className={`w-1 h-1 rounded-full ${isSelected ? '' : 'opacity-50'}`} style={{ backgroundColor: color }}></div>
                                  <span className={isSelected ? '' : 'line-through decoration-slate-300'}>{c}</span>
                               </button>
                           )
                       })}
                 </div>
             </div>
         </div>
      </div>

      {/* 3. Table Section (Fills remaining height) */}
      <div className="flex-1 overflow-hidden relative bg-slate-50 p-2">
           <div className="absolute inset-2 top-0 bottom-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
               <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-none">
                  <div className="flex items-center gap-1.5">
                     <Filter className="w-3 h-3 text-slate-400" />
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Data Grid</span>
                  </div>
               </div>
               <div className="flex-1 overflow-hidden">
                   <DataGrid data={tableData} />
               </div>
           </div>
      </div>

    </div>
  );
};
