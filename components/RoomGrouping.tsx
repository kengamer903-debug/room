import React, { useMemo, useState } from 'react';
import { SheetData, DataRow } from '../types';
import { Home, ChevronDown, ChevronUp, DollarSign, Activity, Calendar } from 'lucide-react';

interface RoomGroupingProps {
  data: SheetData;
}

export const RoomGrouping: React.FC<RoomGroupingProps> = ({ data }) => {
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  // 1. Identify Room Column
  const roomCol = useMemo(() => {
    return data.columns.find(c => /room|ห้อง|unit|no\.|เลขที่/i.test(c.name) && !/building|ตึก|อาคาร/i.test(c.name));
  }, [data.columns]);

  // 2. Identify Numeric Columns for aggregation (exclude Year/Month if they are numbers)
  const metricCols = useMemo(() => {
    return data.columns.filter(c => 
      c.type === 'number' && 
      !/year|month|date|id|ปี|เดือน/i.test(c.name)
    );
  }, [data.columns]);

  // 3. Identify Date/Period Column for the details view
  const periodCol = useMemo(() => {
    return data.columns.find(c => /date|time|month|period|วันที่|เดือน|งวด/i.test(c.name)) || data.columns[0];
  }, [data.columns]);

  // 4. Group Data
  const groupedData = useMemo(() => {
    if (!roomCol) return [];

    const groups: Record<string, DataRow[]> = {};
    data.rows.forEach(row => {
      const roomVal = String(row[roomCol.name] || 'Unknown').trim();
      if (!groups[roomVal]) groups[roomVal] = [];
      groups[roomVal].push(row);
    });

    // Calculate aggregations
    return Object.entries(groups).map(([room, rows]) => {
      const stats = metricCols.map(col => {
        const sum = rows.reduce((acc, r) => acc + (Number(r[col.name]) || 0), 0);
        return {
          name: col.name,
          sum,
          avg: sum / rows.length
        };
      });
      return { room, rows, stats };
    }).sort((a, b) => {
       // Try natural sort for room numbers (e.g. 101, 102, 110 instead of 101, 110, 102)
       return a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [data, roomCol, metricCols]);

  if (!roomCol) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Home className="w-5 h-5 text-indigo-600" />
        Room Summary ({groupedData.length})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedData.map((group) => {
          const isExpanded = expandedRoom === group.room;
          
          return (
            <div 
              key={group.room} 
              className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${isExpanded ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md col-span-1 md:col-span-2 lg:col-span-3' : 'border-slate-200 shadow-sm hover:border-indigo-300'}`}
            >
              {/* Card Header */}
              <button 
                onClick={() => setExpandedRoom(isExpanded ? null : group.room)}
                className="w-full text-left p-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Room</span>
                    <h4 className="text-xl font-bold text-slate-800">{group.room}</h4>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                   {/* Mini Summary for collapsed view */}
                   {!isExpanded && group.stats.length > 0 && (
                     <div className="hidden sm:flex flex-col items-end mr-2">
                       <span className="text-xs text-slate-400">Total {group.stats[0].name}</span>
                       <span className="font-bold text-slate-700">
                         {group.stats[0].sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                       </span>
                     </div>
                   )}
                   {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </button>

              {/* Card Body - Stats Grid */}
              <div className="p-4 border-t border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Records</p>
                      <p className="font-bold text-slate-800 text-lg">{group.rows.length}</p>
                   </div>
                   {group.stats.slice(0, 5).map((stat, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1 truncate" title={stat.name}>Total {stat.name}</p>
                        <p className="font-bold text-slate-800 text-lg">
                          {stat.sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                   ))}
                </div>

                {/* Expanded Details Table */}
                {isExpanded && (
                  <div className="mt-4 animate-fade-in">
                    <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      History Detail
                    </h5>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{periodCol?.name || 'Period'}</th>
                            {metricCols.map(col => (
                              <th key={col.name} className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">{col.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {group.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-slate-800 font-medium">
                                {String(row[periodCol?.name] || '-')}
                              </td>
                              {metricCols.map(col => (
                                <td key={col.name} className="px-4 py-2 text-sm text-slate-600 text-right font-mono">
                                  {(Number(row[col.name]) || 0).toLocaleString()}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};