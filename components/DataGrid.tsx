import React, { useState, useMemo } from 'react';
import { SheetData, DataRow, ColumnInfo } from '../types';
import { Search, ChevronRight, ChevronDown, Layers, LayoutList, Image as ImageIcon, Box } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DataGridProps {
  data: SheetData;
  onSelectRow?: (row: DataRow, type: 'group' | 'item') => void;
  viewMode?: 'table' | 'gallery';
}

export const DataGrid: React.FC<DataGridProps> = ({ data, onSelectRow, viewMode = 'table' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isGroupedView, setIsGroupedView] = useState(true);
  const { t } = useLanguage();

  // Grouping Logic
  const roomCol = useMemo(() => 
    data.columns.find(c => /room|ห้อง|unit|no\.|เลขที่/i.test(c.name) && !/building|ตึก|อาคาร/i.test(c.name)), 
  [data.columns]);

  // Identify the column that serves as the source for images (Preview)
  const imageCol = useMemo(() => 
    data.columns.find(c => c.type === 'image') || 
    data.columns.find(c => c.type === 'string' && /url|link|img|pic|photo|รูป|ภาพ/i.test(c.name) && !/สภาพ|condition/i.test(c.name)),
  [data.columns]);

  const displayColumns = useMemo(() => {
    return data.columns.filter(col => 
      !/building|ตึก|อาคาร|tower|block|section|zone/i.test(col.name) &&
      col.type !== 'image' && // Hide explicit image columns from grid
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

  const isCapacityCol = (name: string) => /capacity|pax|people|person|guest|bed|เตียง|คน|ความจุ/i.test(name);
  const isConditionCol = (name: string) => /condition|status|สภาพ|สถานะ/i.test(name);

  // Grouping for Table View
  const groupedData = useMemo(() => {
    if (!roomCol || !isGroupedView) return null;
    
    // Structure: groups[key] = { rows, totals, staticValues, allImages: Set }
    const groups: Record<string, { 
        rows: DataRow[]; 
        totals: Record<string, number>; 
        staticValues: Record<string, string>; 
        allImages: Set<string>;
    }> = {};
    
    filteredRows.forEach(row => {
      const groupKey = String(row[roomCol.name] || 'Unknown').trim();
      
      if (!groups[groupKey]) {
          groups[groupKey] = { 
              rows: [], 
              totals: {}, 
              staticValues: {}, 
              allImages: new Set() 
          };
      }
      
      groups[groupKey].rows.push(row);
      
      // Collect ALL images for the group
      if (imageCol) {
         const val = String(row[imageCol.name] || '').trim();
         if (val) {
             const parts = val.split(',').map(s => s.trim()).filter(s => s.startsWith('http') || s.startsWith('www'));
             parts.forEach(p => groups[groupKey].allImages.add(p));
         }
      }

      displayColumns.forEach(col => {
        if (col.type === 'number') {
           const val = Number(row[col.name]) || 0;
           if (!isCapacityCol(col.name)) {
             groups[groupKey].totals[col.name] = (groups[groupKey].totals[col.name] || 0) + val;
           }
        }
      });
    });

    Object.values(groups).forEach(group => {
      displayColumns.forEach(col => {
        if (col.type === 'number') {
           if (isCapacityCol(col.name)) {
              const maxVal = Math.max(...group.rows.map(r => Number(r[col.name]) || 0));
              group.totals[col.name] = maxVal;
           }
        } else {
           const values = Array.from(new Set(group.rows.map(r => String(r[col.name] || '').trim()).filter(Boolean)));
           if (values.length > 0) {
              group.staticValues[col.name] = values.join(', ');
           }
        }
      });
    });

    return Object.entries(groups).sort((a, b) => 
      a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [filteredRows, roomCol, isGroupedView, displayColumns, data.columns, imageCol]);

  // Gallery Data Preparation (Grouped by Room if available)
  const galleryData = useMemo(() => {
    if (viewMode !== 'gallery') return [];

    // If grouping by room is possible
    if (roomCol) {
        const groups: Record<string, { 
            rows: DataRow[], 
            images: string[], 
            conditions: Set<string> 
        }> = {};

        filteredRows.forEach(row => {
            const roomName = String(row[roomCol.name] || 'Unknown').trim();
            if (!groups[roomName]) {
                groups[roomName] = { rows: [], images: [], conditions: new Set() };
            }
            groups[roomName].rows.push(row);

            // Collect Images
            if (imageCol) {
                const val = String(row[imageCol.name] || '').trim();
                if (val) {
                    const parts = val.split(',').map(s => s.trim()).filter(s => s.startsWith('http') || s.startsWith('www'));
                    groups[roomName].images.push(...parts);
                }
            }

            // Collect Conditions
            const conditionCol = data.columns.find(c => isConditionCol(c.name));
            if (conditionCol) {
                const cVal = String(row[conditionCol.name] || '').trim();
                // Handle multiple conditions in one cell (comma separated)
                cVal.split(',').forEach(c => {
                   const cleanC = c.trim();
                   if (cleanC) groups[roomName].conditions.add(cleanC);
                });
            }
        });

        return Object.entries(groups).map(([title, group]) => ({
            isGroup: true,
            title,
            count: group.rows.length,
            image: group.images[0] || null,
            allImages: new Set(group.images),
            conditions: Array.from(group.conditions),
            firstRow: group.rows[0]
        })).sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
    }

    // Fallback if no room column: Return individual items marked as not groups
    return filteredRows.map((row, idx) => ({
        isGroup: false,
        row,
        idx,
        title: roomCol ? String(row[roomCol.name]) : `Item ${idx + 1}`,
        image: imageCol ? (String(row[imageCol.name] || '').split(',').find(s => s.trim().startsWith('http')) || null) : null
    }));
  }, [viewMode, filteredRows, roomCol, imageCol, data.columns]);

  const toggleGroup = (groupKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupKey)) newSet.delete(groupKey);
    else newSet.add(groupKey);
    setExpandedGroups(newSet);
  };

  const handleGroupClick = (groupKey: string, firstRow: DataRow, allImages: Set<string>) => {
      if (onSelectRow) {
          const representativeRow = { ...firstRow };
          if (imageCol && allImages.size > 0) {
              representativeRow[imageCol.name] = Array.from(allImages).join(',');
          }
          onSelectRow(representativeRow, 'group');
      }
  };

  const renderStatusBadge = (value: string) => {
        let label = value;
        let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
        const v = value.toLowerCase();

        if (v.includes('ไม่มี') || v.includes('none') || v.includes('missing')) {
            label = t('statusNone');
            badgeClass = 'bg-slate-100 text-slate-500 border-slate-200'; 
        } else if (v.includes('บางส่วน') || v.includes('partially')) {
            label = t('statusPartial');
            badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        } else if (v.includes('ชำรุด') || v.includes('เสีย') || v.includes('broken') || v.includes('bad') || v.includes('damaged')) {
            label = t('statusDamaged');
            badgeClass = 'bg-red-100 text-red-700 border-red-200';
        } else if (v.includes('ดี') || v.includes('good') || v.includes('ปกติ') || v.includes('normal') || v.includes('เรียบร้อย')) {
            label = t('statusGood');
            badgeClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        }

        return (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border whitespace-nowrap shadow-sm ${badgeClass}`}>
                {label}
            </span>
        );
  };

  const renderCellContent = (col: ColumnInfo, value: any) => {
    if (col.type === 'image') return null;
    if (col.type === 'number' && typeof value === 'number') {
      return <span className="font-mono text-slate-700">{value.toLocaleString()}</span>;
    }

    const strVal = String(value || '');
    if (isConditionCol(col.name)) {
        const parts = strVal.split(/,\s*/).filter(Boolean);
        if (parts.length === 0) return <span className="opacity-50">-</span>;
        return <div className="flex flex-wrap gap-1">{parts.map((p, i) => <div key={i}>{renderStatusBadge(p)}</div>)}</div>;
    }
    return <span className="truncate max-w-[150px] block" title={strVal}>{strVal}</span>;
  };

  // --- GALLERY VIEW RENDERER ---
  if (viewMode === 'gallery') {
     return (
        <div className="flex flex-col h-full bg-slate-50">
             <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-10 flex gap-2">
                 <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg w-full focus:outline-none focus:border-indigo-500"
                    />
                </div>
             </div>
             <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                     {galleryData.map((item, idx) => {
                         // Common UI variables
                         const title = item.title;
                         const imgUrl = item.image;

                         // Logic for handling item vs group
                         if (item.isGroup) {
                             return (
                                 <div 
                                    key={idx} 
                                    onClick={() => handleGroupClick(title, item.firstRow, item.allImages)}
                                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group flex flex-col"
                                 >
                                     <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                         {imgUrl ? (
                                             <img src={imgUrl} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                         ) : (
                                             <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                 <Box className="w-10 h-10" />
                                             </div>
                                         )}
                                         
                                         {/* Top Right: Condition Badges Stack */}
                                         <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
                                             {item.conditions.slice(0, 3).map((cond, cIdx) => (
                                                 <div key={cIdx} className="opacity-90 hover:opacity-100 transition-opacity">
                                                     {renderStatusBadge(cond)}
                                                 </div>
                                             ))}
                                             {item.conditions.length > 3 && (
                                                <span className="px-1.5 py-0.5 bg-slate-800 text-white text-[9px] rounded-full opacity-80">+{item.conditions.length - 3} more</span>
                                             )}
                                         </div>

                                         {/* Bottom Right: Item Count */}
                                         <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full backdrop-blur-sm font-medium">
                                             {item.count} Items
                                         </div>
                                     </div>
                                     <div className="p-3">
                                         <h4 className="font-bold text-slate-800 text-sm truncate">{title}</h4>
                                         <p className="text-xs text-slate-500 mt-0.5">
                                            {item.count > 1 ? `${item.count} assets in room` : 'Single asset'}
                                         </p>
                                     </div>
                                 </div>
                             );
                         } else {
                             // Fallback for individual items (when no grouping column exists)
                             const subtitle = (data.columns.find(c => /name|desc|รายการ|ชื่อ/i.test(c.name)) ? String(item.row[data.columns.find(c => /name|desc|รายการ|ชื่อ/i.test(c.name))!.name]) : '');
                             const conditionCol = data.columns.find(c => isConditionCol(c.name));
                             const status = conditionCol ? String(item.row[conditionCol.name]) : '';

                             return (
                                 <div 
                                    key={idx} 
                                    onClick={() => onSelectRow && onSelectRow(item.row, 'item')}
                                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group flex flex-col"
                                 >
                                     <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                         {imgUrl ? (
                                             <img src={imgUrl} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                         ) : (
                                             <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                 <Box className="w-10 h-10" />
                                             </div>
                                         )}
                                         {status && (
                                             <div className="absolute top-2 right-2">
                                                 {renderStatusBadge(status)}
                                             </div>
                                         )}
                                     </div>
                                     <div className="p-3 flex-1 flex flex-col">
                                         <h4 className="font-bold text-slate-800 text-sm truncate">{title}</h4>
                                         {subtitle && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{subtitle}</p>}
                                     </div>
                                 </div>
                             )
                         }
                     })}
                 </div>
                 {galleryData.length === 0 && <div className="text-center p-10 text-slate-400">{t('noData')}</div>}
             </div>
        </div>
     );
  }

  // --- TABLE VIEW RENDERER ---
  if (!data.rows.length) return <div className="p-4 text-center text-slate-400 text-xs">{t('noData')}</div>;

  return (
    <div className="flex flex-col h-full bg-white font-sans text-xs">
      <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/30">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('searchPlaceholder')}
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
                groupedData.map(([roomName, { rows, totals, staticValues, allImages }]) => {
                  const isExpanded = expandedGroups.has(roomName);
                  return (
                    <React.Fragment key={roomName}>
                      {/* Group Header */}
                      <tr 
                        className={`transition-colors group ${isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}
                      >
                        <td 
                            onClick={(e) => toggleGroup(roomName, e)}
                            className="px-1 py-1.5 text-center w-6 cursor-pointer hover:text-indigo-600"
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3 text-indigo-500" /> : <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />}
                        </td>
                        {displayColumns.map((col, idx) => {
                          if (idx === 0) {
                            return (
                              <td key={col.name} 
                                  className="px-3 py-1.5 whitespace-nowrap cursor-pointer"
                                  onClick={() => handleGroupClick(roomName, rows[0], allImages)}
                              >
                                <div className="flex items-center gap-2">
                                  {/* Thumbnail removed from here to keep it clean, relying on top preview panel */}
                                  <span className="font-semibold text-slate-800 text-[11px] group-hover:text-indigo-700 transition-colors">{roomName}</span>
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">{rows.length}</span>
                                </div>
                              </td>
                            );
                          }
                          return (
                             <td key={col.name} 
                                 className="px-3 py-1.5 whitespace-nowrap text-[10px] text-slate-400 cursor-pointer"
                                 onClick={() => handleGroupClick(roomName, rows[0], allImages)}
                             >
                               {col.type === 'number' && totals[col.name] !== undefined ? (
                                   <span className="font-mono text-slate-600 font-medium">{totals[col.name].toLocaleString()}</span>
                               ) : (
                                   renderCellContent(col, staticValues[col.name])
                               )}
                             </td>
                          )
                        })}
                      </tr>

                      {/* Details */}
                      {isExpanded && rows.map((row, rIdx) => (
                        <tr 
                            key={`${roomName}-${rIdx}`} 
                            className="bg-slate-50/30 hover:bg-indigo-50/10 cursor-pointer"
                            onClick={() => onSelectRow && onSelectRow(row, 'item')}
                        >
                          <td className="w-6 border-l-2 border-indigo-100"></td>
                          {displayColumns.map((col) => {
                            return (
                              <td key={`${rIdx}-${col.name}`} className="px-3 py-1 whitespace-nowrap text-[10px] text-slate-600">
                                {renderCellContent(col, row[col.name])}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr><td colSpan={displayColumns.length + 1} className="p-4 text-center text-slate-400 text-[10px]">{t('noMatches')}</td></tr>
              )
            ) : (
              // Flat View
              filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-indigo-50/20 transition-colors cursor-pointer"
                    onClick={() => onSelectRow && onSelectRow(row, 'item')}
                  >
                    {!isGroupedView && roomCol && (
                       <td className="px-3 py-1.5 whitespace-nowrap text-[10px] font-medium text-slate-800 border-r border-slate-50">
                         {String(row[roomCol.name])}
                       </td>
                    )}
                    {displayColumns.map((col) => (
                      <td key={`${idx}-${col.name}`} className="px-3 py-1.5 whitespace-nowrap text-[10px] text-slate-600">
                         {renderCellContent(col, row[col.name])}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={displayColumns.length + (roomCol ? 1 : 0)} className="p-4 text-center text-slate-400 text-[10px]">{t('noMatches')}</td></tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};