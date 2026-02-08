import React, { useMemo, useState, useRef, useEffect } from 'react';
import { SheetData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Map, Info, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface FloorPlanMapProps {
  data: SheetData;
  onSelectBuilding?: (buildingName: string) => void;
}

export const FloorPlanMap: React.FC<FloorPlanMapProps> = ({ data, onSelectBuilding }) => {
  const { t } = useLanguage();
  
  // --- Zoom & Pan State ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Data Logic ---
  const buildingCol = useMemo(() => 
    data.columns.find(c => /building|ตึก|อาคาร/i.test(c.name)), [data.columns]);
  
  const conditionCol = useMemo(() => 
    data.columns.find(c => /condition|status|สภาพ|สถานะ/i.test(c.name)), [data.columns]);

  const buildingStats = useMemo(() => {
    if (!buildingCol) return {};
    
    const stats: Record<string, { total: number, damaged: number, name: string }> = {};
    
    data.rows.forEach(row => {
      const rawName = String(row[buildingCol.name] || 'Unknown').trim();
      
      let key = rawName;
      // Regex mapping based on typical naming conventions (CB1..CB7)
      if (/1/.test(rawName)) key = 'CB1';
      else if (/2/.test(rawName)) key = 'CB2';
      else if (/3/.test(rawName)) key = 'CB3';
      else if (/4/.test(rawName)) key = 'CB4';
      else if (/5/.test(rawName)) key = 'CB5'; // Mapped to Building 5
      else if (/6/.test(rawName)) key = 'CB6';
      else if (/7/.test(rawName)) key = 'CB7';

      if (!stats[key]) stats[key] = { total: 0, damaged: 0, name: rawName };
      stats[key].total++;
      
      if (conditionCol) {
        const cond = String(row[conditionCol.name] || '').toLowerCase();
        if (cond.includes('ชำรุด') || cond.includes('damaged') || cond.includes('เสีย') || cond.includes('repair')) {
           stats[key].damaged++;
        }
      }
    });
    
    return stats;
  }, [data, buildingCol, conditionCol]);

  const getBuildingColor = (id: string) => {
    const stat = buildingStats[id];
    if (!stat || stat.total === 0) return { fill: '#1e293b', stroke: '#475569', opacity: 0.5 }; // No Data

    const damageRatio = stat.damaged / stat.total;
    if (damageRatio >= 0.3) return { fill: '#7f1d1d', stroke: '#ef4444', opacity: 0.9 }; // High Damage
    if (damageRatio > 0) return { fill: '#713f12', stroke: '#eab308', opacity: 0.9 }; // Some Damage
    return { fill: '#064e3b', stroke: '#10b981', opacity: 0.9 }; // Good
  };

  const buildings = [
    { id: 'CB2', name: t('building_CB2'), d: 'M220,40 L370,40 L370,200 L220,200 Z', textPos: { x: 295, y: 120 } },
    { id: 'CB1', name: t('building_CB1'), d: 'M150,230 L300,230 L300,550 L350,550 L350,650 L400,650 L400,730 L150,730 Z', textPos: { x: 225, y: 480 } },
    { id: 'CB3', name: t('building_CB3'), d: 'M310,210 L420,210 L420,390 L310,390 Z', textPos: { x: 365, y: 300 } },
    { id: 'CB4', name: t('building_CB4'), d: 'M425,190 L720,190 L720,570 L425,570 Z', textPos: { x: 572, y: 380 } },
    { id: 'CB5', name: t('building_CB5'), d: 'M380,660 L640,660 L640,740 L380,740 Z', textPos: { x: 510, y: 700 } },
    { id: 'CB6', name: t('building_CB6'), d: 'M400,815 L615,815 L615,925 L400,925 Z', textPos: { x: 507, y: 870 } },
    { id: 'CB7', name: t('building_CB7'), d: 'M200,760 L330,760 L330,860 L200,860 Z', textPos: { x: 265, y: 810 } },
    
    // Background Context Shapes
    { id: 'BG_TOP', name: '46', d: 'M475,20 L760,20 L760,140 L475,140 Z', isBg: true, textPos: { x: 617, y: 80 } },
    { id: 'BG_RIGHT_1', name: '44', d: 'M800,200 L870,200 L870,450 L800,450 Z', isBg: true, textPos: { x: 835, y: 325 } },
    { id: 'BG_RIGHT_2', name: '45', d: 'M870,180 L1000,180 L1000,450 L870,450 Z', isBg: true, textPos: { x: 935, y: 220 } },
    { id: 'BG_BOT_RIGHT', name: '42', d: 'M750,600 L1000,600 L1000,700 L750,700 Z', isBg: true, textPos: { x: 950, y: 650 } },
  ];

  const handleBuildingClick = (id: string, name: string) => {
      const dataName = buildingStats[id]?.name || name;
      if (onSelectBuilding) onSelectBuilding(dataName);
  };

  // --- Zoom Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    let newScale = scale + direction * zoomIntensity;
    newScale = Math.min(Math.max(0.5, newScale), 4); // Limit zoom 0.5x to 4x
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden flex flex-col relative group">
       {/* Controls Overlay */}
       <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          {/* Legend */}
          <div className="bg-slate-800/90 backdrop-blur p-3 rounded-lg border border-slate-700 shadow-xl mb-2">
              <h4 className="text-white text-xs font-bold mb-2 flex items-center gap-2">
                <Map className="w-3 h-3" /> {t('mapLegend')}
              </h4>
              <div className="space-y-2 text-[10px]">
                <div className="flex items-center gap-2 text-emerald-400">
                    <div className="w-3 h-3 bg-[#064e3b] border border-emerald-500 rounded-sm"></div>
                    <span>{t('normalCondition')}</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-400">
                    <div className="w-3 h-3 bg-[#713f12] border border-yellow-500 rounded-sm"></div>
                    <span>{t('someDefects')}</span>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                    <div className="w-3 h-3 bg-[#7f1d1d] border border-red-500 rounded-sm"></div>
                    <span>{t('criticalAttention')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-3 h-3 bg-slate-800 border border-slate-600 rounded-sm"></div>
                    <span>{t('noDataOther')}</span>
                </div>
              </div>
          </div>

          {/* Zoom Controls */}
          <div className="bg-slate-800/90 backdrop-blur p-1 rounded-lg border border-slate-700 shadow-xl flex flex-col items-center">
             <button onClick={() => setScale(s => Math.min(s + 0.2, 4))} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors" title={t('zoomIn')}>
               <ZoomIn className="w-4 h-4" />
             </button>
             <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors" title={t('zoomOut')}>
               <ZoomOut className="w-4 h-4" />
             </button>
             <div className="w-full h-px bg-slate-700 my-1"></div>
             <button onClick={resetZoom} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors" title={t('resetView')}>
               <RotateCcw className="w-4 h-4" />
             </button>
          </div>
       </div>

       {/* Map Container */}
       <div 
         ref={containerRef}
         className={`flex-1 w-full h-full overflow-hidden relative bg-slate-900 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
         onWheel={handleWheel}
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
       >
          <div 
            className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out origin-center"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            }}
          >
              <svg 
                viewBox="0 0 1000 1000" 
                className="w-full h-full max-w-[800px] max-h-[800px] select-none drop-shadow-2xl pointer-events-none" 
                style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}
              >
                {/* Enable pointer events on contents for clicking */}
                <g className="pointer-events-auto">
                    {/* Definitions for Glow Effects */}
                    <defs>
                        <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Roads / Context Lines */}
                    <path d="M50,100 L150,50 M140,50 L200,950 M400,950 L400,750" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.3" />
                    <path d="M750,700 L750,900 L1000,900" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.3" />

                    {buildings.map((b) => {
                        const isBg = !!b.isBg;
                        const statId = b.id;
                        const style = isBg ? { fill: 'none', stroke: '#94a3b8', opacity: 0.3 } : getBuildingColor(statId);
                        const stats = buildingStats[statId];

                        return (
                        <g 
                            key={b.id} 
                            onClick={(e) => {
                                if (!isBg && !isDragging) {
                                    e.stopPropagation();
                                    handleBuildingClick(statId, b.name);
                                }
                            }}
                            className={`transition-all duration-300 ${!isBg ? 'cursor-pointer hover:opacity-100' : ''}`}
                            style={{ transformOrigin: 'center' }}
                        >
                            <path 
                            d={b.d} 
                            fill={style.fill} 
                            stroke={style.stroke} 
                            strokeWidth={isBg ? 1 : 2}
                            className={!isBg ? "hover:brightness-125 hover:stroke-white transition-all" : ""}
                            />
                            
                            {/* Label */}
                            <text 
                                x={b.textPos.x} 
                                y={b.textPos.y} 
                                fill={isBg ? "#94a3b8" : "#fff"} 
                                textAnchor="middle" 
                                fontSize={isBg ? 20 : 16}
                                fontWeight={isBg ? "normal" : "bold"}
                                fontFamily="sans-serif"
                                className="pointer-events-none"
                                style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
                            >
                                {b.name}
                            </text>
                            
                            {/* Stat Badge */}
                            {!isBg && stats && stats.total > 0 && (
                                <text 
                                x={b.textPos.x} 
                                y={b.textPos.y + 20} 
                                fill={style.stroke} 
                                textAnchor="middle" 
                                fontSize="12"
                                fontFamily="monospace"
                                className="pointer-events-none"
                                >
                                {t('issuesCount', { damaged: stats.damaged, total: stats.total })}
                                </text>
                            )}
                        </g>
                        );
                    })}
                </g>
              </svg>
          </div>
       </div>
    </div>
  );
};