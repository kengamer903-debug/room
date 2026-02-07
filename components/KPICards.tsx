import React from 'react';
import { SheetData } from '../types';
import { TrendingUp, Users, Activity, Database, DollarSign, Package } from 'lucide-react';

interface KPICardsProps {
  data: SheetData;
}

export const KPICards: React.FC<KPICardsProps> = ({ data }) => {
  const numericColumns = data.columns.filter(c => c.type === 'number');
  
  // Helper to find column excluding specific names
  const findCol = (keywords: string[], excludeName?: string) => 
    numericColumns.find(c => 
      c.name !== excludeName && 
      keywords.some(k => c.name.toLowerCase().includes(k.toLowerCase()))
    );
  
  const totalRows = data.rows.length;
  
  // 1. Room Count (Replaces Total Records)
  // Attempt to find a Room/Unit column to count unique entries
  const roomKeywords = ['room', 'ห้อง', 'unit', 'no.', 'เลขที่'];
  const roomCol = data.columns.find(c => 
    roomKeywords.some(k => c.name.toLowerCase().includes(k)) && 
    !/building|ตึก|อาคาร|floor|ชั้น|capacity|ความจุ|คน/i.test(c.name)
  );

  let countLabel = "จำนวนห้องทั้งหมด";
  let countValue = "";

  if (roomCol) {
    // Count unique rooms
    const uniqueRooms = new Set(data.rows.map(r => String(r[roomCol.name] || '').trim()).filter(Boolean));
    countValue = `${uniqueRooms.size.toLocaleString()} ห้อง`;
  } else {
    // Fallback: Count rows as rooms
    countValue = `${totalRows.toLocaleString()} ห้อง`;
  }

  const countMetric = {
    label: countLabel,
    value: countValue,
    icon: <Database className="w-5 h-5 text-blue-600" />,
    color: "bg-blue-50"
  };

  // 2. Primary Metric (Money/Main)
  // Prioritize explicit money terms
  const moneyKeywords = ['revenue', 'sales', 'price', 'cost', 'expense', 'profit', 'ยอดขาย', 'ราคา', 'ต้นทุน', 'ค่าใช้จ่าย', 'จำนวนเงิน', 'income', 'baht', 'บาท', 'billing', 'invoice', 'fee', 'total', 'ยอดรวม'];
  let primaryCol = findCol(moneyKeywords);
  
  // If no money column, take the first numeric column available
  if (!primaryCol && numericColumns.length > 0) {
    primaryCol = numericColumns[0];
  }

  let primaryMetric = null;
  if (primaryCol) {
    const sum = data.rows.reduce((acc, row) => acc + (Number(row[primaryCol.name]) || 0), 0);
    primaryMetric = {
      label: `Total ${primaryCol.name}`,
      value: sum.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />, 
      color: "bg-emerald-50"
    };
  }

  // 3. Secondary Metric (Capacity/People/Count focus)
  // Keywords: capacity, people, pax, unit, qty, amount, จำนวน, bed, room
  const capacityKeywords = ['capacity', 'pax', 'people', 'person', 'guest', 'member', 'จำนวนคน', 'ผู้เข้าพัก', 'รับได้', 'bed', 'เตียง', 'occupancy', 'unit', 'qty', 'quantity', 'amount', 'จำนวน', 'count', 'ความจุ'];
  
  let secondaryCol = findCol(capacityKeywords, primaryCol?.name);
  
  // If no specific capacity column found, just take the next available numeric column that isn't the primary
  if (!secondaryCol && numericColumns.length > 1) {
    secondaryCol = numericColumns.find(c => c.name !== primaryCol?.name);
  }

  let secondaryMetric = null;
  if (secondaryCol) {
    const totalSum = data.rows.reduce((acc, row) => acc + (Number(row[secondaryCol.name]) || 0), 0);
    
    // Custom label logic based on user request
    let label = `Total ${secondaryCol.name}`;
    let valueDisplay = totalSum.toLocaleString(undefined, { maximumFractionDigits: 0 });

    // Check for capacity/quantity keywords to apply specific Thai label and unit
    const isCapacityRelated = secondaryCol.name.includes('จำนวน') || 
                              secondaryCol.name.toLowerCase().includes('capacity') || 
                              secondaryCol.name.includes('ความจุ') ||
                              secondaryCol.name.toLowerCase().includes('pax') ||
                              secondaryCol.name.includes('คน');

    if (isCapacityRelated) {
      label = 'สามารถบรรจุคนได้';
      valueDisplay = `${valueDisplay} คน`;
    }

    secondaryMetric = {
      label: label,
      value: valueDisplay,
      icon: <Users className="w-5 h-5 text-purple-600" />,
      color: "bg-purple-50"
    };
  }
  
  // 4. Categorical Count (Unique values of first string column)
  const stringCol = data.columns.find(c => 
    c.type === 'string' && 
    !c.name.toLowerCase().includes('date') && 
    !c.name.toLowerCase().includes('time') && 
    !c.name.toLowerCase().includes('id') &&
    !c.name.toLowerCase().includes('desc')
  );
  
  let categoryMetric = null;
  if (stringCol) {
    const unique = new Set(data.rows.map(r => r[stringCol.name]));
    
    let label = `Unique ${stringCol.name}`;
    
    // Check if it's a building column for the requested Thai label
    if (/building|ตึก|อาคาร|tower/i.test(stringCol.name)) {
      label = "จำนวนตึกทั้งหมด";
    } else {
      // Append 's' only if it looks like English word
      if (/^[a-zA-Z\s]+$/.test(stringCol.name)) {
        label += 's';
      }
    }

    categoryMetric = {
      label: label,
      value: unique.size.toLocaleString(),
      icon: <TrendingUp className="w-5 h-5 text-orange-600" />,
      color: "bg-orange-50"
    };
  }

  const metrics = [countMetric, primaryMetric, secondaryMetric, categoryMetric].filter(Boolean);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, idx) => (
        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-all duration-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{metric?.label}</p>
            <h3 className="text-2xl font-bold text-slate-800">{metric?.value}</h3>
          </div>
          <div className={`p-3 rounded-lg ${metric?.color}`}>
            {metric?.icon}
          </div>
        </div>
      ))}
    </div>
  );
};