import { SheetData, DataRow, ColumnInfo } from '../types';

const SHEET_ID = '11vduoiBj1WAQVzqtpPi4tz_XJcG9fx5tu3s5dGcIzfs';
// Using the Google Visualization API endpoint (gviz) usually provides better CORS support for public sheets than /export
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

const parseCSVLine = (text: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      // Check for escaped quote (two double quotes)
      if (inQuote && text[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      result.push(current); // Don't trim inside parsing to preserve spaces in data
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.trim()); // Trim final results
};

const detectColumnType = (values: any[]): 'number' | 'date' | 'string' => {
  // Filter out empty values
  const nonEmpty = values.filter(v => v !== '' && v !== null && v !== undefined);
  if (nonEmpty.length === 0) return 'string';

  // Check Number
  // Remove commas and currency symbols for the check
  const cleanValues = nonEmpty.map(v => String(v).replace(/,/g, '').replace(/[฿$]/g, '').trim());
  const isNumber = cleanValues.every(v => !isNaN(parseFloat(v)) && isFinite(Number(v)));
  if (isNumber) return 'number';

  // Check Date
  const isDate = nonEmpty.every(v => {
    const d = new Date(v);
    return !isNaN(d.getTime()) && String(v).length > 4 && (String(v).includes('/') || String(v).includes('-'));
  });
  if (isDate) return 'date';

  return 'string';
};

export const fetchSheetData = async (): Promise<SheetData> => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    const lines = text.split('\n');
    
    if (lines.length < 2) return { columns: [], rows: [] };

    // Extract headers (first row)
    const rawHeaders = parseCSVLine(lines[0]);
    const headers = rawHeaders.map(h => h.replace(/^"|"$/g, ''));
    
    // Parse rows
    const rawRows = lines.slice(1).map(line => {
      if (!line.trim()) return null;
      const values = parseCSVLine(line);
      const row: DataRow = {};
      
      headers.forEach((header, index) => {
        let val = values[index];
        if (val && val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        row[header] = val || '';
      });
      return row;
    }).filter(r => r !== null) as DataRow[];

    // Detect Types
    const columns: ColumnInfo[] = headers.map(header => {
      const sampleValues = rawRows.slice(0, 20).map(r => r[header]);
      return {
        name: header,
        type: detectColumnType(sampleValues)
      };
    });

    // Convert Data Types
    const rows = rawRows.map(row => {
      const newRow: DataRow = { ...row };
      columns.forEach(col => {
        if (col.type === 'number') {
          const val = newRow[col.name];
          if (typeof val === 'string') {
            const cleanVal = val.replace(/,/g, '').replace(/[฿$]/g, '');
            newRow[col.name] = cleanVal === '' ? 0 : parseFloat(cleanVal);
          }
        }
      });
      return newRow;
    });

    return { columns, rows };

  } catch (error) {
    console.error("Error fetching sheet data", error);
    throw error;
  }
};