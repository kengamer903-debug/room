import React from 'react';
import { SheetData } from '../types';
import { Building2, ChevronDown } from 'lucide-react';

interface CategoryFilterProps {
  data: SheetData;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ data, selectedCategory, onSelectCategory }) => {
  // Identify the grouping column (Building/Tower/Section)
  const groupCol = data.columns.find(c => /building|ตึก|อาคาร|tower|block|section|zone/i.test(c.name));

  if (!groupCol) return null;

  // Get unique values and counts
  const groups = data.rows.reduce((acc, row) => {
    const val = String(row[groupCol.name] || 'Unknown').trim();
    acc[val] = (Number(acc[val]) || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedGroups = Object.entries(groups).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Building2 className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-slate-800">
           Filter by {groupCol.name}
        </h3>
      </div>
      
      <div className="relative max-w-sm">
        <select
          value={selectedCategory || ''}
          onChange={(e) => {
            const val = e.target.value;
            onSelectCategory(val === '' ? null : val);
          }}
          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium cursor-pointer hover:border-indigo-300"
        >
          <option value="">All Buildings ({data.rows.length} records)</option>
          {sortedGroups.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
          <ChevronDown className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};