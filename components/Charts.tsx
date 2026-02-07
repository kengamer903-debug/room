import React from 'react';
import { SheetData } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

interface ChartsProps {
  data: SheetData;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Charts: React.FC<ChartsProps> = ({ data }) => {
  const numericColumns = data.columns.filter(c => c.type === 'number');
  const dateColumn = data.columns.find(c => c.type === 'date' || c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('time'));
  const categoryColumn = data.columns.find(c => c.type === 'string' && !c.name.toLowerCase().includes('id'));

  if (numericColumns.length === 0) return null;

  const targetMetric = numericColumns[0].name; // Use first numeric column for values

  // Prepare Time Series Data (if date column exists)
  let timeSeriesData: any[] = [];
  if (dateColumn) {
    // Group by date
    const grouped = data.rows.reduce((acc, row) => {
      const date = String(row[dateColumn.name]);
      const val = Number(row[targetMetric]) || 0;
      acc[date] = (Number(acc[date]) || 0) + val;
      return acc;
    }, {} as Record<string, number>);
    
    timeSeriesData = Object.entries(grouped)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-20); // Last 20 data points for readability
  } else {
    // Fallback: Use row index
    timeSeriesData = data.rows.slice(0, 20).map((row, i) => ({
      date: `Row ${i+1}`,
      value: row[targetMetric]
    }));
  }

  // Prepare Categorical Data (Top 5 categories)
  let categoryData: any[] = [];
  if (categoryColumn) {
     const grouped = data.rows.reduce((acc, row) => {
      const cat = String(row[categoryColumn.name]);
      const val = Number(row[targetMetric]) || 0;
      // Use direct assignment to avoid TS issues with indexed access accumulation
      acc[cat] = (Number(acc[cat]) || 0) + val;
      return acc;
    }, {} as Record<string, number>);

    categoryData = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 6);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Line Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{dateColumn ? `Trends over Time` : `Data Series`} ({targetMetric})</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" hide={timeSeriesData.length > 10} tick={{fontSize: 12, fill: '#64748b'}} />
              <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" name={targetMetric} stroke="#6366f1" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart / Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{categoryColumn ? `Top ${categoryColumn.name} by ${targetMetric}` : 'Distribution'}</h3>
        <div className="h-80 w-full">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#64748b'}} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Not enough categorical data to display.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};