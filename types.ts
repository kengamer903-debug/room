export interface DataRow {
  [key: string]: string | number | null;
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'image';
}

export interface SheetData {
  columns: ColumnInfo[];
  rows: DataRow[];
}

export interface KPIMetric {
  label: string;
  value: string | number;
  change?: number; // percent change
  trend?: 'up' | 'down' | 'neutral';
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}