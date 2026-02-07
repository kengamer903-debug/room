import React, { useState, useMemo } from 'react';
import { SheetData, DataRow } from '../types';
import { Search, ChevronRight, ChevronDown, Layers, LayoutList } from 'lucide-react';

interface DataGridProps {
  data: SheetData;
}

export const DataGrid: React.FC<DataGridProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isGroupedView, setIsGroupedView] = useState(true);

  // Grouping Logic
  const roomCol = useMemo(() => 
    data.columns.find(c => /room|ห้อง|unit|no\.|เลขที่/i.test(c.name) && !/building|ตึก|อาคาร/i.test(c.name)), 
  [data.columns]);

  const displayColumns = useMemo(() => {
    return data.columns.filter(col => 
      !/building|ตึก|อาคาร|tower|block|section|zone/i.test(col.name) &&
      (isGroupedView && roomCol ? col.name !== roomCol.name : true)
    );
  }, [data.columns, isGroupedView, roomCol]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return data.rows;
    const lowerTerm = searchTerm.toLowerCase();
    return data.rows.filter(row => 
      Object.values(row).some(val => String(val).toLowerCase().includes(lowerTerm))
    );
  }, [data.rows, searchTerm]);

  const groupedData = useMemo(() => {
    if (!roomCol || !isGroupedView) return null;
    const groups: Record<string, { rows: DataRow[]; totals: Record<string, number>; staticValues: Record<string, string> }> = {};
    
    filteredRows.forEach(row => {
      const groupKey = String(row[roomCol.name] || 'Unknown').trim();
      if (!groups[groupKey]) groups[groupKey] = { rows: [], totals: {}, staticValues: {} };
      groups[groupKey].rows.push(row);
      displayColumns.forEach(col => {
        if (col.type === 'number') {
           const val = Number(row[col.name]) || 0;
           groups[groupKey].totals[col.name] = (groups[groupKey].totals[col.name] || 0) + val;
        }
      });
    });

    Object.values(groups).forEach(group => {
      displayColumns.forEach(col => {
        const values = new Set(group.rows.map(r => String(r[col.name] || '')));
        if (values.size === 1) group.staticValues[col.name] = String(group.rows[0][col.name] || '');
      });
    });

    return Object.entries(groups).sort((a, b) => 
      a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [filteredRows, roomCol, isGroupedView, displayColumns]);

  const toggleGroup = (groupKey: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupKey)) newSet.delete(groupKey);
    else newSet.add(groupKey);
    setExpandedGroups(newSet);
  };

  if (!data.rows.length) return <div className="p-4 text-center text-slate-400 text-xs">No data</div>;

  return (
    <div className="flex flex-col h-full bg-white font-sans text-xs">
      {/* Compact Search Bar */}
      <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/30">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 pr-2 py-1 text-[10px] bg-white border border-slate-200 rounded-md w-full focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 h-7"
          />
        </div>
        {roomCol && (
            <button
              onClick={() => setIsGroupedView(!isGroupedView)}
              className="p-1 rounded-md border border-slate-200 hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors"
              title={isGroupedView ? "Flat View" : "Grouped View"}
            >
              {isGroupedView ? <Layers className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
            </button>
        )}
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-slate-100 border-separate border-spacing-0">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm shadow-slate-100/50">
            <tr>
              {isGroupedView && roomCol && <th className="px-2 py-2 w-6 border-b border-slate-200 bg-slate-50"></th>}
              {!isGroupedView && roomCol && (
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200">
                  {roomCol.name}
                </th>
              )}
              {displayColumns.map((col) => (
                <th
                  key={col.name}
                  className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200"
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {isGroupedView && groupedData ? (
              groupedData.length > 0 ? (
                groupedData.map(([roomName, { rows, totals, staticValues }]) => {
                  const isExpanded = expandedGroups.has(roomName);
                  return (
                    <React.Fragment key={roomName}>
                      {/* Group Header */}
                      <tr 
                        onClick={() => toggleGroup(roomName)}
                        className={`cursor-pointer transition-colors group ${isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-1 py-1.5 text-center w-6">
                          {isExpanded ? <ChevronDown className="w-3 h-3 text-indigo-500" /> : <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />}
                        </td>
                        {displayColumns.map((col, idx) => {
                          if (idx === 0) {
                            return (
                              <td key={col.name} className="px-3 py-1.5 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 text-[11px]">{roomName}</span>
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">{rows.length}</span>
                                </div>
                              </td>
                            );
                          }
                          return (
                             <td key={col.name} className="px-3 py-1.5 whitespace-nowrap text-[10px] text-slate-400">
                               {col.type === 'number' && totals[col.name] ? (
                                   <span className="font-mono text-slate-600 font-medium">{totals[col.name].toLocaleString()}</span>
                               ) : (
                                   <span className="opacity-50 truncate max-w-[100px] block" title={staticValues[col.name]}>{staticValues[col.name]}</span>
                               )}
                             </td>
                          )
                        })}
                      </tr>

                      {/* Details */}
                      {isExpanded && rows.map((row, rIdx) => (
                        <tr key={`${roomName}-${rIdx}`} className="bg-slate-50/30 hover:bg-indigo-50/10">
                          <td className="w-6 border-l-2 border-indigo-100"></td>
                          {displayColumns.map((col) => {
                            const isStatic = staticValues[col.name] !== undefined;
                            const shouldHide = isStatic && rows.length > 1;
                            return (
                              <td key={`${rIdx}-${col.name}`} className="px-3 py-1 whitespace-nowrap text-[10px] text-slate-600">
                                {shouldHide ? (
                                  <span className="text-slate-200 select-none">"</span>
                                ) : (
                                  col.type === 'number' && typeof row[col.name] === 'number' 
                                    ? <span className="font-mono text-slate-700">{(row[col.name] as number).toLocaleString()}</span>
                                    : <span className="truncate max-w-[150px] block" title={String(row[col.name])}>{String(row[col.name])}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr><td colSpan={displayColumns.length + 1} className="p-4 text-center text-slate-400 text-[10px]">No matches</td></tr>
              )
            ) : (
              // Flat View
              filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                    {!isGroupedView && roomCol && (
                       <td className="px-3 py-1.5 whitespace-nowrap text-[10px] font-medium text-slate-800 border-r border-slate-50">
                         {String(row[roomCol.name])}
                       </td>
                    )}
                    {displayColumns.map((col) => (
                      <td key={`${idx}-${col.name}`} className="px-3 py-1.5 whitespace-nowrap text-[10px] text-slate-600">
                         {col.type === 'number' && typeof row[col.name] === 'number' 
                          ? <span className="font-mono">{(row[col.name] as number).toLocaleString()}</span>
                          : <span className="truncate max-w-[150px] block" title={String(row[col.name])}>{String(row[col.name] || '')}</span>}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={displayColumns.length + (roomCol ? 1 : 0)} className="p-4 text-center text-slate-400 text-[10px]">No matches</td></tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
