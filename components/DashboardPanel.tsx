import React, { useState, useMemo, useEffect } from 'react';
import { SheetData, DataRow } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DataGrid } from './DataGrid';
import { ChatAssistant } from './ChatAssistant';
import { FloorPlanMap } from './FloorPlanMap';
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
  Filter,
  Table as TableIcon,
  Map as MapIcon,
  Download,
  Calculator,
  History,
  CalendarDays,
  List,
  Zap,
  Home,
  ChevronRight
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
  'none': '#94a3b8', // Slate 400 (Grey for None)
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

  // Specific columns for the new requirements
  const electricCol = useMemo(() => 
    data.columns.find(c => /อุปกรณ์ไฟฟ้า|electric/i.test(c.name)), [data.columns]);

  const equipConditionCol = useMemo(() => 
    data.columns.find(c => /สภาพอุปกรณ์|equipment condition/i.test(c.name)) || conditionCol, [data.columns, conditionCol]);

  const roomConditionCol = useMemo(() => 
    data.columns.find(c => /สภาพห้อง|room condition/i.test(c.name)), [data.columns]);

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
  const [viewMode, setViewMode] = useState<'table' | 'gallery' | 'map'>('table');
  
  // Image & Selection State
  const [selectedRowData, setSelectedRowData] = useState<DataRow | null>(null);
  const [selectedRoomGroup, setSelectedRoomGroup] = useState<string | null>(null); // To track selected group (room)

  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [modalImages, setModalImages] = useState<string[]>([]); // New separate state for modal
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  
  const [inspectorTab, setInspectorTab] = useState<'details' | 'history'>('details');
  const [roomTab, setRoomTab] = useState<'items' | 'images'>('items');

  // --- 3. Filtering Logic ---
  
  // Helper for condition filtering
  const filterByCondition = (rows: DataRow[], conditionKey: string) => {
      return rows.filter(r => {
          if (!conditionCol) return true;
          const val = String(r[conditionCol.name] || 'Unknown').trim().toLowerCase();
          let localKey = 'Unknown';
          
          if (val.includes('ไม่มี') || val.includes('none') || val.includes('missing')) {
            localKey = t('statusNone');
          } else if (val.includes('ดี') || val.includes('good') || val.includes('ปกติ')) {
            localKey = t('statusGood');
          } else if (val.includes('บางส่วน') || val.includes('partial') || val.includes('repair')) {
            localKey = t('statusPartial');
          } else if (val.includes('ชำรุด') || val.includes('เสีย') || val.includes('damaged')) {
            localKey = t('statusDamaged');
          } else {
            localKey = t('statusPartial'); 
          }
          
          return localKey === conditionKey;
      });
  };

  const filteredData = useMemo(() => {
    let rows = data.rows;
    if (buildingCol && selectedBuilding) {
      // Fuzzy match for building selection from Map
      rows = rows.filter(r => {
          const bVal = String(r[buildingCol.name] || 'Unknown').trim();
          return bVal === selectedBuilding || (selectedBuilding.includes('CB') && bVal.includes(selectedBuilding.replace('CB', '')));
      });
    }
    if (conditionCol && selectedCondition) {
      rows = filterByCondition(rows, selectedCondition);
    }
    return rows;
  }, [data.rows, buildingCol, conditionCol, selectedBuilding, selectedCondition, t]);

  const tableData = useMemo(() => ({ ...data, rows: filteredData }), [data, filteredData]);
  
  // Map Data: Always includes all buildings (ignores selectedBuilding) but respects Condition Filter
  const mapData = useMemo(() => {
      let rows = data.rows;
      if (conditionCol && selectedCondition) {
         rows = filterByCondition(rows, selectedCondition);
      }
      return { ...data, rows };
  }, [data, conditionCol, selectedCondition, t]);

  // --- Group Items Logic (For Inspector List) ---
  const roomItems = useMemo(() => {
      if (!selectedRoomGroup || !roomCol) return [];
      return filteredData.filter(r => String(r[roomCol.name] || '') === selectedRoomGroup);
  }, [selectedRoomGroup, filteredData, roomCol]);

  // --- Room Images Logic (For Images Tab) ---
  const currentRoomImages = useMemo(() => {
    // Determine the active room name from either selection state
    let targetRoom = selectedRoomGroup;
    if (!targetRoom && selectedRowData && roomCol) {
       targetRoom = String(selectedRowData[roomCol.name] || '');
    }

    if (!targetRoom || !roomCol) return [];

    const images: { url: string; caption: string }[] = [];
    const seen = new Set<string>();

    filteredData
        .filter(r => String(r[roomCol.name] || '') === targetRoom)
        .forEach(row => {
            // Get item name for caption
            const nameCol = data.columns.find(c => /name|item|desc|รายการ|ชื่อ/i.test(c.name));
            const electricCol = data.columns.find(c => /อุปกรณ์ไฟฟ้า|electric/i.test(c.name));
            let itemName = 'Unknown';
            if (electricCol && row[electricCol.name]) itemName = String(row[electricCol.name]);
            else if (nameCol && row[nameCol.name]) itemName = String(row[nameCol.name]);

            explicitImageCols.forEach(col => {
                const val = String(row[col.name] || '');
                if (val) {
                    const urls = val.split(',').map(s => s.trim()).filter(s => s.startsWith('http'));
                    urls.forEach(url => {
                        const displayUrl = ensureDisplayableUrl(url);
                        if (!seen.has(displayUrl)) {
                            seen.add(displayUrl);
                            images.push({ url: displayUrl, caption: itemName });
                        }
                    });
                }
            });
        });
    return images;
  }, [selectedRowData, selectedRoomGroup, roomCol, filteredData, explicitImageCols, data.columns]);


  // --- Building Rooms Logic (For Inspector Overview) ---
  const buildingRooms = useMemo(() => {
    if (!selectedBuilding || !roomCol) return [];
    
    const rooms: Record<string, { count: number, damaged: number }> = {};
    
    // filteredData is already filtered by selectedBuilding (if set)
    filteredData.forEach(row => {
      const roomName = String(row[roomCol.name] || 'Unknown').trim();
      if (!rooms[roomName]) rooms[roomName] = { count: 0, damaged: 0 };
      
      rooms[roomName].count++;
      
      if (conditionCol) {
        const cond = String(row[conditionCol.name] || '').toLowerCase();
        if (cond.includes('ชำรุด') || cond.includes('damaged') || cond.includes('เสีย') || cond.includes('repair')) {
           rooms[roomName].damaged++;
        }
      }
    });

    return Object.entries(rooms)
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [filteredData, selectedBuilding, roomCol, conditionCol]);

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
      
      let label = val;
      if (val.includes('ไม่มี') || val.includes('none') || val.includes('missing')) {
        label = t('statusNone');
      } else if (val.includes('ดี') || val.includes('good') || val.includes('ปกติ')) {
        label = t('statusGood');
      } else if (val.includes('บางส่วน') || val.includes('partial') || val.includes('repair')) {
        label = t('statusPartial');
      } else if (val.includes('ชำรุด') || val.includes('เสีย') || val.includes('damaged')) {
        label = t('statusDamaged');
      } else {
        label = t('statusPartial'); 
      }
      
      counts[label] = (counts[label] || 0) + 1;
    });

    const chartData = Object.entries(counts)
      .map(([name, value]) => {
         let color = PALETTE[0];
         if (name === t('statusGood')) color = COLORS.good;
         else if (name === t('statusDamaged')) color = COLORS.damaged;
         else if (name === t('statusRepair') || name === t('statusPartial')) color = COLORS.repair;
         else if (name === t('statusNone')) color = COLORS.none;
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
      setInspectorTab('details'); // Reset tab
      
      if (type === 'group' && roomCol) {
          // GROUP SELECTION (ROOM)
          const roomName = String(row[roomCol.name] || '');
          setSelectedRoomGroup(roomName);
          setSelectedRowData(null); // Clear single item selection
          setPreviewTitle(roomName);
          setPreviewImages([]); // Images will be handled by list items
          setRoomTab('items'); // Reset room tab to items
      } else {
          // SINGLE ITEM SELECTION
          setSelectedRowData(row);
          // Note: We DO NOT clear selectedRoomGroup here to allow back navigation to the room list
          
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
          setModalImages(images); // Initialize modal with item images by default
          
          const nameCol = data.columns.find(c => /name|item|desc|รายการ|ชื่อ/i.test(c.name));
          
          // Use Electrical Equipment name if available, otherwise fallback to generic name
          let title = 'Selected Item';
          if (electricCol && row[electricCol.name]) {
              title = String(row[electricCol.name]);
          } else if (nameCol && row[nameCol.name]) {
              title = String(row[nameCol.name]);
          }
          setPreviewTitle(title);
      }
  };

  const handleExportCSV = () => {
     // Generate CSV content
     const headers = data.columns.map(c => c.name).join(',');
     const rows = filteredData.map(row => 
        data.columns.map(col => {
            let val = String(row[col.name] || '').replace(/"/g, '""');
            if (val.includes(',') || val.includes('\n')) val = `"${val}"`;
            return val;
        }).join(',')
     ).join('\n');
     
     const csvContent = `\uFEFF${headers}\n${rows}`;
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement('a');
     link.href = URL.createObjectURL(blob);
     link.download = `assets_export_${new Date().toISOString().slice(0,10)}.csv`;
     link.click();
  };

  const openModal = (index: number) => {
      setModalImages(previewImages);
      setModalImageIndex(index);
      setIsModalOpen(true);
  };

  const openModalWithImage = (url: string) => {
      setModalImages([url]); // Open specific image
      setModalImageIndex(0);
      setIsModalOpen(true);
  }

  const openGalleryModal = (index: number) => {
      setModalImages(currentRoomImages.map(i => i.url));
      setModalImageIndex(index);
      setIsModalOpen(true);
  }

  // --- Depreciation Calculator Helper ---
  const calculateDepreciation = (row: DataRow) => {
     const priceCol = data.columns.find(c => /price|cost|amount|ราคา|มูลค่า/i.test(c.name));
     const dateCol = data.columns.find(c => /date|acquired|วันที่|ได้รับ/i.test(c.name));
     
     if (!priceCol) return null;
     
     const price = Number(row[priceCol.name]) || 0;
     const purchaseDateStr = dateCol ? String(row[dateCol.name]) : null;
     const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date(); // Fallback if no date
     
     // Mock useful life (e.g., 5 years)
     const usefulLife = 5;
     const ageInMs = new Date().getTime() - purchaseDate.getTime();
     const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
     
     // Straight line
     let currentValue = price - (price * (ageInYears / usefulLife));
     if (currentValue < 0) currentValue = 1; // Scrap value

     return {
         originalPrice: price,
         purchaseDate: purchaseDateStr || 'N/A',
         age: ageInYears.toFixed(1),
         currentValue: currentValue.toFixed(0)
     };
  };
  
  const depInfo = selectedRowData ? calculateDepreciation(selectedRowData) : null;

  // --- Helper to Render Status Badge ---
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

  // --- 6. Render Components ---

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
      <ChatAssistant data={data} />
      
      {/* Top Bar: KPIs */}
      <div className="px-4 py-3 md:px-6 md:py-5 bg-white border-b border-slate-200 shadow-sm flex-none z-20">
          <div className="flex flex-nowrap md:grid md:grid-cols-4 gap-3 md:gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide snap-x">
              {/* Total Asset KPI */}
              <div className="min-w-[240px] md:min-w-0 snap-start bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-3 md:p-4 text-white shadow-lg shadow-indigo-200 flex items-center justify-between relative overflow-hidden group">
                  <div className="relative z-10 min-w-0">
                      <p className="text-indigo-100 text-[10px] md:text-xs font-medium uppercase tracking-wider mb-1 truncate">{t('totalAssets')}</p>
                      <h3 className="text-xl md:text-3xl font-bold truncate">{data.rows.length.toLocaleString()}</h3>
                      <p className="text-indigo-200 text-[9px] md:text-[10px] mt-1 truncate">{t('itemsInDb')}</p>
                  </div>
                  <div className="bg-white/20 p-2 md:p-3 rounded-lg backdrop-blur-sm relative z-10 flex-shrink-0">
                      <Box className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              </div>
              {/* Damaged KPI */}
              <div className="min-w-[240px] md:min-w-0 snap-start bg-white border border-red-100 rounded-xl p-3 md:p-4 shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                      <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider mb-1 truncate">{t('attentionNeeded')}</p>
                      <h3 className="text-lg md:text-2xl font-bold text-slate-800 truncate">{stats.damagedCount.toLocaleString()}</h3>
                      <p className="text-red-500 text-[9px] md:text-[10px] font-medium mt-1 flex items-center gap-1 truncate">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {t('damagedRepair')}
                      </p>
                  </div>
                  <div className="bg-red-50 p-2 md:p-3 rounded-lg flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                  </div>
              </div>
              {/* Good KPI */}
              <div className="min-w-[240px] md:min-w-0 snap-start bg-white border border-emerald-100 rounded-xl p-3 md:p-4 shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                      <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider mb-1 truncate">{t('goodCondition')}</p>
                      <h3 className="text-lg md:text-2xl font-bold text-slate-800 truncate">
                          {stats.chartData.filter(d => d.color === COLORS.good).reduce((a,b) => a + b.value, 0).toLocaleString()}
                      </h3>
                      <p className="text-emerald-500 text-[9px] md:text-[10px] font-medium mt-1 flex items-center gap-1 truncate">
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> {t('operational')}
                      </p>
                  </div>
                  <div className="bg-emerald-50 p-2 md:p-3 rounded-lg flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                  </div>
              </div>
              {/* Buildings Count */}
              <div className="min-w-[240px] md:min-w-0 snap-start bg-white border border-slate-200 rounded-xl p-3 md:p-4 shadow-sm flex items-center justify-between">
                   <div className="min-w-0">
                      <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider mb-1 truncate">{t('locations')}</p>
                      <h3 className="text-lg md:text-2xl font-bold text-slate-800 truncate">{buildings.length}</h3>
                      <p className="text-slate-400 text-[9px] md:text-[10px] mt-1 truncate">{t('buildingsZones')}</p>
                   </div>
                   <div className="bg-slate-50 p-2 md:p-3 rounded-lg flex-shrink-0">
                      <Building2 className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                   </div>
              </div>
          </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* LEFT PANEL: Data & Filters */}
          <div className="flex-1 flex flex-col min-w-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 relative order-1 lg:order-1">
              
              {/* Toolbar */}
              <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-3 overflow-x-auto scrollbar-hide flex-none">
                  <div className="flex items-center gap-2">
                       <div className="flex items-center gap-2 pr-4 border-r border-slate-100 mr-2 flex-none">
                          <Filter className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-700 uppercase hidden md:inline">{t('filter')}</span>
                       </div>
                       
                       <button onClick={() => setSelectedBuilding(null)} className={`flex-none px-4 py-1.5 rounded-full text-xs font-medium transition-all ${selectedBuilding === null ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t('allBuildings')}</button>
                       {buildings.map(b => (
                          <button key={b} onClick={() => setSelectedBuilding(b)} className={`flex-none px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${selectedBuilding === b ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}>{b}</button>
                       ))}
                  </div>

                  <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                      <button 
                         onClick={() => setViewMode('table')} 
                         className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                         title={t('tableView')}
                      >
                         <TableIcon className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={() => setViewMode('gallery')} 
                         className={`p-1.5 rounded-lg transition-colors ${viewMode === 'gallery' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                         title={t('galleryView')}
                      >
                         <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={() => setViewMode('map')} 
                         className={`p-1.5 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                         title={t('floorPlanView')}
                      >
                         <MapIcon className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={handleExportCSV} 
                         className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors ml-1"
                         title={t('exportCSV')}
                      >
                         <Download className="w-4 h-4" />
                      </button>
                  </div>
              </div>

              {/* Data Area */}
              <div className="flex-1 overflow-hidden relative bg-slate-50/50">
                  <div className="absolute inset-0">
                       {viewMode === 'map' ? (
                          <FloorPlanMap 
                             data={mapData} // Use mapData to show all buildings on map (not filtered by building selection)
                             onSelectBuilding={(buildingName) => {
                                // Toggle behavior: if same building, reset to null
                                if (selectedBuilding === buildingName) {
                                    setSelectedBuilding(null);
                                } else {
                                    setSelectedBuilding(buildingName);
                                }
                                // Reset drill-downs
                                setSelectedRoomGroup(null);
                                setSelectedRowData(null);
                             }} 
                          />
                       ) : (
                          <DataGrid 
                             data={tableData} 
                             onSelectRow={handleSelectRow} 
                             viewMode={viewMode === 'gallery' ? 'gallery' : 'table'}
                          />
                       )}
                  </div>
              </div>
          </div>

          {/* RIGHT PANEL: Inspector & Charts */}
          <div className="h-[40%] lg:h-full w-full lg:w-[380px] flex-none bg-slate-50 lg:border-l border-slate-200 flex flex-col overflow-y-auto custom-scrollbar order-2 lg:order-2 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] lg:shadow-none z-30">
              
              {/* Section 1: Chart */}
              <div className="p-5 border-b border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
                          <BarChart3 className="w-4 h-4 text-indigo-500" />
                          {t('conditionAnalysis')}
                      </h3>
                      {selectedCondition && (
                          <button onClick={() => setSelectedCondition(null)} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-red-500 bg-slate-50 px-2 py-1 rounded-md"><X className="w-3 h-3" /> {t('clearFilter')}</button>
                      )}
                  </div>
                  <div className="flex flex-col items-center">
                      <div className="w-full h-[150px] md:h-[180px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={stats.chartData} innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none" onClick={(data) => setSelectedCondition(selectedCondition === data.name ? null : data.name)} cursor="pointer">
                                      {stats.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} opacity={selectedCondition && selectedCondition !== entry.name ? 0.3 : 1} />)}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontSize: '12px', fontWeight: 600 }} />
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-2xl md:text-3xl font-bold text-slate-800">{stats.current}</span>
                              <span className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-widest">Items</span>
                          </div>
                      </div>
                      <div className="w-full mt-2"><RenderLegend /></div>
                  </div>
              </div>

              {/* Section 2: Inspector Tabs */}
              <div className="flex-1 p-5 flex flex-col">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm md:text-base">
                      <ImageIcon className="w-4 h-4 text-indigo-500" />
                      {t('assetInspector')}
                  </h3>

                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col h-full min-h-[300px]">
                      {/* CASE 1: ROOM GROUP SELECTED */}
                      {selectedRoomGroup && !selectedRowData && (
                        <div className="flex-1 flex flex-col">
                           <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                              <button onClick={() => setSelectedRoomGroup(null)} className="text-slate-400 hover:text-slate-600 mr-2"><RotateCcw className="w-3.5 h-3.5" /></button>
                              <div className="flex-1">
                                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <List className="w-4 h-4 text-indigo-500" />
                                    {selectedRoomGroup}
                                  </h4>
                              </div>
                              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{roomItems.length} Items</span>
                           </div>

                           {/* Tabs for Room View */}
                           <div className="flex border-b border-slate-100 mb-3 items-center">
                               <button onClick={() => setRoomTab('items')} className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${roomTab === 'items' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400'}`}>{t('tabItems')}</button>
                               <button onClick={() => setRoomTab('images')} className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${roomTab === 'images' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400'}`}>{t('tabImages')}</button>
                           </div>

                           {roomTab === 'items' && (
                               <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                  {roomItems.map((item, idx) => {
                                     const nameCol = data.columns.find(c => /name|item|desc|รายการ|ชื่อ/i.test(c.name));
                                     
                                     // Prioritize Electrical Equipment Name
                                     let name = `Item ${idx+1}`;
                                     if (electricCol && item[electricCol.name]) {
                                         name = String(item[electricCol.name]);
                                     } else if (nameCol && item[nameCol.name]) {
                                         name = String(item[nameCol.name]);
                                     }

                                     const status = conditionCol ? String(item[conditionCol.name]) : '';
                                     
                                     // Extract first image if any
                                     let thumbUrl = null;
                                     explicitImageCols.forEach(col => {
                                        if(!thumbUrl) {
                                          const val = String(item[col.name] || '');
                                          if (val.includes('http')) thumbUrl = ensureDisplayableUrl(val.split(',')[0]);
                                        }
                                     });

                                     return (
                                        <div 
                                          key={idx} 
                                          onClick={() => handleSelectRow(item, 'item')}
                                          className="flex items-start gap-3 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                                        >
                                           <div className="w-10 h-10 rounded bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                                              {thumbUrl ? (
                                                 <img src={thumbUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                              ) : (
                                                 <div className="w-full h-full flex items-center justify-center"><Box className="w-4 h-4 text-slate-300" /></div>
                                              )}
                                           </div>
                                           <div className="min-w-0 flex-1">
                                              <p className="text-xs font-medium text-slate-700 truncate">{name}</p>
                                              <div className="mt-1">{renderStatusBadge(status)}</div>
                                           </div>
                                        </div>
                                     )
                                  })}
                               </div>
                           )}

                           {roomTab === 'images' && (
                               <div className="flex-1 overflow-y-auto p-1">
                                    {currentRoomImages.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {currentRoomImages.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group cursor-pointer" onClick={() => openGalleryModal(idx)}>
                                                    <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {img.caption}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                            <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                                            <span className="text-xs">No images in this room</span>
                                        </div>
                                    )}
                               </div>
                           )}
                        </div>
                      )}

                      {/* CASE 2: SINGLE ITEM SELECTED */}
                      {selectedRowData && (
                          <>
                             {/* Tabs */}
                             <div className="flex border-b border-slate-100 mb-3 items-center">
                                 <button onClick={() => setSelectedRowData(null)} className="text-slate-400 hover:text-slate-600 mr-3 pb-2"><RotateCcw className="w-3.5 h-3.5" /></button>
                                 <button onClick={() => setInspectorTab('details')} className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${inspectorTab === 'details' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400'}`}>{t('tabDetails')}</button>
                                 <button onClick={() => setInspectorTab('history')} className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${inspectorTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400'}`}>{t('tabHistory')}</button>
                             </div>

                             {inspectorTab === 'details' && (
                                 <div className="flex-1 overflow-y-auto">
                                     {/* Image Preview */}
                                     {previewImages.length > 0 ? (
                                        <div className="relative rounded-xl overflow-hidden bg-slate-100 group border border-slate-100 min-h-[150px] mb-3">
                                            <img src={previewImages[0]} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <button onClick={() => openModal(0)} className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all bg-white/90 text-slate-800 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2"><Maximize2 className="w-3.5 h-3.5" /> {t('fullView')}</button>
                                            </div>
                                        </div>
                                     ) : (
                                        <div className="h-[150px] bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 mb-3"><ImageIcon className="w-8 h-8 opacity-20" /></div>
                                     )}
                                     
                                     <h4 className="font-bold text-slate-800 text-sm mb-1">{previewTitle}</h4>
                                     <p className="text-xs text-slate-500 mb-2">{selectedRowData && roomCol ? String(selectedRowData[roomCol.name]) : t('noLocationInfo')}</p>
                                     
                                     {/* New Details Section */}
                                     <div className="space-y-3 mt-4">
                                          {electricCol && (
                                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                  <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs uppercase font-semibold">
                                                      <Zap className="w-3.5 h-3.5" />
                                                      <span>อุปกรณ์ไฟฟ้า</span>
                                                  </div>
                                                  <div className="text-slate-800 font-medium">
                                                      {String(selectedRowData[electricCol.name] || '-')}
                                                  </div>
                                              </div>
                                          )}
                                          
                                          <div className="grid grid-cols-2 gap-3">
                                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                  <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs uppercase font-semibold">
                                                      <Box className="w-3.5 h-3.5" />
                                                      <span>สภาพอุปกรณ์</span>
                                                  </div>
                                                  <div>
                                                      {renderStatusBadge(String(selectedRowData[equipConditionCol?.name || conditionCol?.name || 'Unknown']))}
                                                  </div>
                                              </div>

                                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                  <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs uppercase font-semibold">
                                                      <Home className="w-3.5 h-3.5" />
                                                      <span>สภาพห้อง</span>
                                                  </div>
                                                  <div>
                                                      {roomConditionCol 
                                                        ? renderStatusBadge(String(selectedRowData[roomConditionCol.name])) 
                                                        : <span className="text-slate-400 text-xs">-</span>
                                                      }
                                                  </div>
                                              </div>
                                          </div>
                                     </div>
                                 </div>
                             )}

                             {inspectorTab === 'history' && (
                                 <div className="flex-1 overflow-y-auto p-1">
                                     <div className="mb-4">
                                         <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 mb-2"><History className="w-3.5 h-3.5 text-indigo-500" /> {t('depreciation')}</h4>
                                         {depInfo ? (
                                             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                                                 <div className="flex justify-between text-xs"><span className="text-slate-500">{t('purchasePrice')}</span><span className="font-mono">{depInfo.originalPrice.toLocaleString()}</span></div>
                                                 <div className="flex justify-between text-xs"><span className="text-slate-500">{t('purchaseDate')}</span><span className="font-mono">{depInfo.purchaseDate}</span></div>
                                                 <div className="flex justify-between text-xs"><span className="text-slate-500">{t('yearsOld')}</span><span className="font-mono">{depInfo.age}</span></div>
                                                 <div className="border-t border-slate-200 pt-2 flex justify-between text-xs font-bold text-indigo-700"><span>{t('currentValue')}</span><span>{Number(depInfo.currentValue).toLocaleString()}</span></div>
                                             </div>
                                         ) : (
                                             <div className="text-center py-6 text-xs text-slate-400">Missing price or date data</div>
                                         )}
                                     </div>
                                 </div>
                             )}
                          </>
                      )}

                      {/* CASE 3: BUILDING SELECTED -> SHOW ROOM LIST */}
                      {!selectedRoomGroup && !selectedRowData && selectedBuilding && (
                          <div className="flex-1 flex flex-col">
                             <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                                  <div>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('locations')}</span>
                                      <h4 className="font-bold text-slate-800 text-base flex items-center gap-2 mt-0.5">
                                          <Building2 className="w-4 h-4 text-indigo-500" />
                                          {selectedBuilding}
                                      </h4>
                                  </div>
                                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200">
                                      {buildingRooms.length} Zones
                                  </span>
                             </div>
                             
                             <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                                 {buildingRooms.map((room, idx) => (
                                     <button 
                                        key={idx}
                                        onClick={() => {
                                            setSelectedRoomGroup(room.name);
                                            setPreviewTitle(room.name);
                                            setSelectedRowData(null);
                                        }}
                                        className="w-full bg-white border border-slate-200 p-3 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all group text-left flex items-center justify-between"
                                     >
                                         <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                 {room.name.replace(/[^0-9]/g, '').slice(-3) || 'RM'}
                                             </div>
                                             <div>
                                                 <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{room.name}</div>
                                                 <div className="text-[11px] text-slate-400">{room.count} Assets</div>
                                             </div>
                                         </div>
                                         
                                         {room.damaged > 0 ? (
                                             <div className="flex flex-col items-end">
                                                 <div className="text-red-500 text-[10px] font-bold flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                     <AlertTriangle className="w-3 h-3" /> {room.damaged}
                                                 </div>
                                             </div>
                                         ) : (
                                             <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-50" />
                                         )}
                                     </button>
                                 ))}
                                 {buildingRooms.length === 0 && (
                                     <div className="text-center py-10 text-slate-400 text-xs">No rooms found in this building.</div>
                                 )}
                             </div>
                          </div>
                      )}

                      {/* CASE 4: NOTHING SELECTED */}
                      {!selectedRowData && !selectedRoomGroup && !selectedBuilding && (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-xl m-2">
                              <Box className="w-10 h-10 md:w-12 md:h-12 opacity-20" />
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
      {isModalOpen && modalImages.length > 0 && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 animate-fade-in">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"><X className="w-6 h-6" /></button>
              <div className="w-full max-w-5xl h-full flex flex-col items-center justify-center">
                  <img src={modalImages[modalImageIndex]} alt="Full View" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" referrerPolicy="no-referrer" />
                  {modalImages.length > 1 && (
                      <div className="mt-6 flex gap-3 overflow-x-auto max-w-full p-2">
                          {modalImages.map((img, idx) => (
                              <button key={idx} onClick={() => setModalImageIndex(idx)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${modalImageIndex === idx ? 'border-indigo-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}><img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" /></button>
                          ))}
                      </div>
                  )}
                  <div className="mt-4 text-white text-center">
                      <h3 className="text-lg font-bold">{previewTitle}</h3>
                      <p className="text-white/60 text-sm">{t('imageCounter', { current: modalImageIndex + 1, total: modalImages.length })}</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};