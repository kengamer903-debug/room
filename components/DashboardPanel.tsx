import React, { useState, useMemo, useEffect } from 'react';
import { SheetData, DataRow } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DataGrid } from './DataGrid';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Building2, 
  LayoutGrid, 
  RotateCcw, 
  ImageIcon, 
  Maximize2, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Box,
  BarChart3,
  Filter
} from 'lucide-react';

interface DashboardPanelProps {
  data: SheetData;
}

// Modern Color Palette mapped to semantics
const COLORS: Record<string, string> = {
  'good': '#10b981', // Emerald 500
  'normal': '#10b981',
  'ok': '#10b981',
  'damaged': '#ef4444', // Red 500
  'broken': '#ef4444',
  'repair': '#f59e0b', // Amber 500
  'partial': '#f59e0b',
  'unknown': '#94a3b8', // Slate 400
  'default': '#6366f1'  // Indigo 500
};

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const ensureDisplayableUrl = (url: string): string => {
    if (!url) return '';
    if (url.includes('drive.google.com') && !url.includes('thumbnail')) {
         const idMatch = url.match(/\/d\/([-\w]{25,})/) || url.match(/id=([-\w]{25,})/);
         if (idMatch && idMatch[1]) {
             return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
         }
    }
    return url;
};

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ data }) => {
  const { t } = useLanguage();
  
  // --- 1. Data Analysis & Memoization ---
  const buildingCol = useMemo(() => 
    data.columns.find(c => /building|ตึก|อาคาร/i.test(c.name)), [data.columns]);
    
  const conditionCol = useMemo(() => 
    data.columns.find(c => /condition|status|สภาพ|สถานะ/i.test(c.name)), [data.columns]);
  
  const roomCol = useMemo(() => 
    data.columns.find(c => /room|ห้อง|unit|no\.|เลขที่/i.test(c.name)), [data.columns]);

  const explicitImageCols = useMemo(() =>
    data.columns.filter(c => c.type === 'image'), [data.columns]);

  // Unique Values
  const buildings = useMemo(() => {
    if (!buildingCol) return [];
    const set = new Set(data.rows.map(r => String(r[buildingCol.name] || 'Unknown').trim()));
    return Array.from(set).sort();
  }, [data.rows, buildingCol]);

  // --- 2. State Management ---
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null); // Null = All
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null); // Null = All
  
  // Image & Selection State
  const [selectedRowData, setSelectedRowData] = useState<DataRow | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // --- 3. Filtering Logic ---
  const filteredData = useMemo(() => {
    let rows = data.rows;
    if (buildingCol && selectedBuilding) {
      rows = rows.filter(r => String(r[buildingCol.name] || 'Unknown').trim() === selectedBuilding);
    }
    if (conditionCol && selectedCondition) {
      // Logic reversed to match localized keys if needed, but here we filter by original value
      // We need to map selectedCondition (localized) back to possible original values or 
      // safer: filter by the raw values but since we select from chart, chart uses localized names.
      // Complex part: The chart uses localized names. We need to map back.
      // SIMPLIFICATION: We will keep using raw keys for state if possible, but for now let's handle the UI selection.
      
      // Actually, let's make the chart use Localized Keys. Then filtering needs to check if the row's value maps to that key.
      const targetKey = selectedCondition; // This is "Good", "Bad" (Localized)
      
      rows = rows.filter(r => {
          const val = String(r[conditionCol.name] || 'Unknown').trim().toLowerCase();
          let localKey = 'Unknown';
          if (val.includes('ดี') || val.includes('good') || val.includes('ปกติ')) localKey = t('statusGood');
          else if (val.includes('ชำรุด') || val.includes('เสีย') || val.includes('damaged')) localKey = t('statusDamaged');
          else if (val.includes('บางส่วน') || val.includes('partial') || val.includes('repair')) localKey = t('statusPartial');
          else localKey = val; // Fallback
          
          return localKey === targetKey;
      });
    }
    return rows;
  }, [data.rows, buildingCol, conditionCol, selectedBuilding, selectedCondition, t]);

  const tableData = useMemo(() => ({ ...data, rows: filteredData }), [data, filteredData]);

  // --- 4. Statistics Calculation ---
  const stats = useMemo(() => {
    const total = data.rows.length;
    const current = filteredData.length;
    
    // Condition Breakdown for Chart
    const counts: Record<string, number> = {};
    const filteredForChart = buildingCol && selectedBuilding 
        ? data.rows.filter(r => String(r[buildingCol.name]).trim() === selectedBuilding)
        : data.rows;

    filteredForChart.forEach(r => {
      const val = conditionCol ? String(r[conditionCol.name] || 'Unknown').trim().toLowerCase() : 'Unknown';
      
      // Normalize to Localized Key
      let label = val;
      if (val.includes('ดี') || val.includes('good') || val.includes('ปกติ')) label = t('statusGood');
      else if (val.includes('ชำรุด') || val.includes('เสีย') || val.includes('damaged')) label = t('statusDamaged');
      else if (val.includes('บางส่วน') || val.includes('partial') || val.includes('repair')) label = t('statusPartial');
      else label = t('statusPartial'); // Fallback to repair/partial or keep raw if distinct
      
      counts[label] = (counts[label] || 0) + 1;
    });

    const chartData = Object.entries(counts)
      .map(([name, value]) => {
         // Determine color based on Localized Name
         let color = PALETTE[0];
         if (name === t('statusGood')) color = COLORS.good;
         else if (name === t('statusDamaged')) color = COLORS.damaged;
         else if (name === t('statusRepair') || name === t('statusPartial')) color = COLORS.repair;
         else color = PALETTE[Object.keys(counts).indexOf(name) % PALETTE.length];

         return { name, value, color };
      })
      .sort((a, b) => b.value - a.value);

    // KPI: Action Required (Damaged)
    const damagedCount = chartData
        .filter(d => d.color === COLORS.damaged || d.color === COLORS.repair)
        .reduce((acc, curr) => acc + curr.value, 0);

    return { total, current, chartData, damagedCount };
  }, [data.rows, filteredData, buildingCol, selectedBuilding, conditionCol, t]);

  // --- 5. Handlers ---
  const handleSelectRow = (row: DataRow, type: 'group' | 'item') => {
      setSelectedRowData(row);
      
      const images: string[] = [];
      const imageSet = new Set<string>();

      const processValue = (val: any) => {
          if (!val) return;
          const parts = String(val).split(',').map(s => s.trim());
          parts.forEach(p => {
             if (p.startsWith('http') || p.startsWith('www')) {
                 const isImageLike = p.includes('drive.google.com') || p.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i);
                 if (isImageLike) {
                     const displayUrl = ensureDisplayableUrl(p);
                     if (!imageSet.has(displayUrl)) {
                         imageSet.add(displayUrl);
                         images.push(displayUrl);
                     }
                 }
             }
          });
      };

      explicitImageCols.forEach(col => processValue(row[col.name]));
      if (images.length === 0) {
          data.columns.forEach(col => {
              if (col.type === 'string' && !explicitImageCols.includes(col)) processValue(row[col.name]);
          });
      }

      setPreviewImages(images);
      
      // Smart Title Logic
      let title = '';
      if (type === 'group' && roomCol) {
          title = String(row[roomCol.name] || 'Room Group');
      } else {
          // Try to find a 'Name' or 'Description' column
          const nameCol = data.columns.find(c => /name|item|desc|รายการ|ชื่อ/i.test(c.name));
          title = nameCol ? String(row[nameCol.name]) : 'Selected Item';
      }
      setPreviewTitle(title);
  };

  const openModal = (index: number) => {
      setModalImageIndex(index);
      setIsModalOpen(true);
  };

  // --- 6. Render Components ---

  // Custom Legend for Interactive Chart
  const RenderLegend = () => (
      <div className="flex flex-col gap-2 mt-4 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
          {stats.chartData.map((entry, idx) => {
              const isActive = selectedCondition === entry.name;
              return (
                  <button 
                      key={idx}
                      onClick={() => setSelectedCondition(isActive ? null : entry.name)}
                      className={`flex items-center justify-between w-full p-2 rounded-lg text-xs transition-all ${isActive ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}`}
                  >
                      <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></div>
                          <span className={`truncate ${isActive ? 'font-bold text-indigo-700' : 'text-slate-600'}`}>{entry.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-400">{entry.value}</span>
                  </button>
              );
          })}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans relative">
      
      {/* Top Bar: KPIs */}
      <div className="px-6 py-5 bg-white border-b border-slate-200 shadow-sm flex-none z-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Total Asset KPI */}
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-200 flex items-center justify-between relative overflow-hidden group">
                  <div className="relative z-10">
                      <p className="text-indigo-100 text-xs font-medium uppercase tracking-wider mb-1">{t('totalAssets')}</p>
                      <h3 className="text-3xl font-bold">{data.rows.length.toLocaleString()}</h3>
                      <p className="text-indigo-200 text-[10px] mt-1">{t('itemsInDb')}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm relative z-10">
                      <Box className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              </div>

              {/* Damaged KPI */}
              <div className="bg-white border border-red-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{t('attentionNeeded')}</p>
                      <h3 className="text-2xl font-bold text-slate-800">{stats.damagedCount.toLocaleString()}</h3>
                      <p className="text-red-500 text-[10px] font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {t('damagedRepair')}
                      </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
              </div>

              {/* Good KPI */}
              <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{t('goodCondition')}</p>
                      <h3 className="text-2xl font-bold text-slate-800">
                          {stats.chartData.filter(d => d.color === COLORS.good).reduce((a,b) => a + b.value, 0).toLocaleString()}
                      </h3>
                      <p className="text-emerald-500 text-[10px] font-medium mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {t('operational')}
                      </p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
              </div>

              {/* Buildings Count */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                   <div>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{t('locations')}</p>
                      <h3 className="text-2xl font-bold text-slate-800">{buildings.length}</h3>
                      <p className="text-slate-400 text-[10px] mt-1">{t('buildingsZones')}</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-lg">
                      <Building2 className="w-5 h-5 text-slate-400" />
                   </div>
              </div>
          </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT PANEL: Data & Filters (65-70%) */}
          <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200 relative">
              
              {/* Building Filter Bar (Tabs) */}
              <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center gap-3 overflow-x-auto scrollbar-hide flex-none">
                  <div className="flex items-center gap-2 pr-4 border-r border-slate-100 mr-2 flex-none">
                      <Filter className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-700 uppercase">{t('filter')}</span>
                  </div>
                  
                  <button
                      onClick={() => setSelectedBuilding(null)}
                      className={`flex-none px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedBuilding === null 
                          ? 'bg-slate-800 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                      {t('allBuildings')}
                  </button>
                  
                  {buildings.map(b => (
                      <button
                          key={b}
                          onClick={() => setSelectedBuilding(b)}
                          className={`flex-none px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                              selectedBuilding === b
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                      >
                          {b}
                      </button>
                  ))}
              </div>

              {/* Data Grid Area */}
              <div className="flex-1 overflow-hidden relative bg-slate-50/50">
                  <div className="absolute inset-0">
                       <DataGrid data={tableData} onSelectRow={handleSelectRow} />
                  </div>
              </div>
          </div>

          {/* RIGHT PANEL: Inspector & Charts (30-35%) */}
          <div className="w-[380px] flex-none bg-slate-50 border-l border-slate-200 flex flex-col overflow-y-auto custom-scrollbar">
              
              {/* Section 1: Chart & Analysis */}
              <div className="p-5 border-b border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-indigo-500" />
                          {t('conditionAnalysis')}
                      </h3>
                      {selectedCondition && (
                          <button 
                              onClick={() => setSelectedCondition(null)}
                              className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-red-500 bg-slate-50 px-2 py-1 rounded-md"
                          >
                              <X className="w-3 h-3" /> {t('clearFilter')}
                          </button>
                      )}
                  </div>
                  
                  <div className="flex flex-col items-center">
                      <div className="w-full h-[180px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={stats.chartData}
                                      innerRadius={55}
                                      outerRadius={75}
                                      paddingAngle={3}
                                      dataKey="value"
                                      stroke="none"
                                      onClick={(data) => setSelectedCondition(selectedCondition === data.name ? null : data.name)}
                                      cursor="pointer"
                                  >
                                      {stats.chartData.map((entry, index) => (
                                          <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color} 
                                            opacity={selectedCondition && selectedCondition !== entry.name ? 0.3 : 1}
                                          />
                                      ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                                  />
                              </PieChart>
                          </ResponsiveContainer>
                          {/* Center Label */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-3xl font-bold text-slate-800">{stats.current}</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Items</span>
                          </div>
                      </div>
                      
                      {/* Legend / Filter Control */}
                      <div className="w-full mt-2">
                          <p className="text-[10px] text-slate-400 text-center mb-2 font-medium">{t('clickToFilter')}</p>
                          <RenderLegend />
                      </div>
                  </div>
              </div>

              {/* Section 2: Selected Item Preview */}
              <div className="flex-1 p-5 flex flex-col">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <ImageIcon className="w-4 h-4 text-indigo-500" />
                      {t('assetInspector')}
                  </h3>

                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col h-full min-h-[300px]">
                      {previewImages.length > 0 ? (
                          <>
                              {/* Main Large Image */}
                              <div className="relative flex-1 rounded-xl overflow-hidden bg-slate-100 group border border-slate-100">
                                  <img 
                                      src={previewImages[0]} 
                                      alt="Preview" 
                                      className="w-full h-full object-contain"
                                      referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                      <button 
                                          onClick={() => openModal(0)}
                                          className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all bg-white/90 text-slate-800 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2"
                                      >
                                          <Maximize2 className="w-3.5 h-3.5" /> {t('fullView')}
                                      </button>
                                  </div>
                              </div>
                              
                              {/* Thumbnails (if > 1) */}
                              {previewImages.length > 1 && (
                                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
                                      {previewImages.slice(1).map((img, idx) => (
                                          <div 
                                            key={idx} 
                                            className="w-16 h-16 flex-none rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:ring-2 ring-indigo-500 transition-all"
                                            onClick={() => openModal(idx + 1)}
                                          >
                                              <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          </div>
                                      ))}
                                  </div>
                              )}

                              {/* Details Info */}
                              <div className="mt-4 pt-4 border-t border-slate-100">
                                  <h4 className="font-bold text-slate-800 text-sm mb-1">{previewTitle}</h4>
                                  <p className="text-xs text-slate-500">
                                      {selectedRowData && roomCol ? String(selectedRowData[roomCol.name]) : t('noLocationInfo')}
                                  </p>
                                  
                                  {selectedRowData && conditionCol && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-mono border border-slate-200">
                                              {String(selectedRowData[conditionCol.name])}
                                          </span>
                                      </div>
                                  )}
                              </div>
                          </>
                      ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-xl m-2">
                              <Box className="w-12 h-12 opacity-20" />
                              <div className="text-center">
                                  <p className="text-xs font-medium text-slate-400">{t('noItemSelected')}</p>
                                  <p className="text-[10px] mt-1">{t('selectRowHint')}</p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* Modal Lightbox */}
      {isModalOpen && previewImages.length > 0 && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 animate-fade-in">
              <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                  <X className="w-6 h-6" />
              </button>
              
              <div className="w-full max-w-5xl h-full flex flex-col items-center justify-center">
                  <img 
                      src={previewImages[modalImageIndex]} 
                      alt="Full View" 
                      className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                      referrerPolicy="no-referrer"
                  />
                  
                  {previewImages.length > 1 && (
                      <div className="mt-6 flex gap-3 overflow-x-auto max-w-full p-2">
                          {previewImages.map((img, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => setModalImageIndex(idx)}
                                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${modalImageIndex === idx ? 'border-indigo-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                              >
                                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </button>
                          ))}
                      </div>
                  )}
                  
                  <div className="mt-4 text-white text-center">
                      <h3 className="text-lg font-bold">{previewTitle}</h3>
                      <p className="text-white/60 text-sm">{t('imageCounter', { current: modalImageIndex + 1, total: previewImages.length })}</p>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};