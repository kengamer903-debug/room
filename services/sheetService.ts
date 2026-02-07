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

// Helper to transform Google Drive URLs to displayable images
// Exported so it can be used if needed, though mainly used internally here during transformation
export const transformImageUrl = (url: string): string => {
  if (!url) return '';
  let newUrl = url.trim();
  
  // Handle Google Drive
  if (newUrl.includes('drive.google.com')) {
    // Try to extract ID (matches between /d/ and /view or just a long alphanumeric string)
    const idMatch = newUrl.match(/\/d\/([-\w]{25,})/) || newUrl.match(/id=([-\w]{25,})/);
    if (idMatch && idMatch[1]) {
       const id = idMatch[1];
       // Use thumbnail API with higher resolution (w1000) for better quality in modal
       return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    // Fallback simple match if the above specific structure fails but looks like an ID
    const looseMatch = newUrl.match(/[-\w]{25,}/);
    if (looseMatch) {
       return `https://drive.google.com/thumbnail?id=${looseMatch[0]}&sz=w1000`;
    }
  }
  return newUrl;
};

const detectColumnType = (values: any[], headerName: string = ''): 'number' | 'date' | 'string' | 'image' => {
  // Priority 1: Strong Image Indicators
  // "รูป" (Photo) matches "รูปภาพ", "รูปถ่าย"
  // "ภาพ" (Image) matches "ภาพถ่าย" BUT MUST NOT match "สภาพ" (Condition)
  if (/image|photo|picture|img|รูป/i.test(headerName)) return 'image';
  if (/ภาพ/i.test(headerName) && !/สภาพ/i.test(headerName)) return 'image';

  // Priority 2: Force Condition/Status to String
  // This is CRITICAL: It prevents "สภาพอุปกรณ์" (Equipment Condition) from being detected as image or number
  if (/condition|status|สภาพ|สถานะ/i.test(headerName)) {
      return 'string';
  }

  // Priority 3: Soft check for URL/Link headers
  if (/url|link/i.test(headerName)) {
     const hasUrl = values.some(v => {
        const s = String(v).trim();
        return s.includes('http') || s.includes('www') || s.includes('drive.google.com');
     });
     if (hasUrl) return 'image';
  }

  // Filter out empty values
  const nonEmpty = values.filter(v => v !== '' && v !== null && v !== undefined);
  if (nonEmpty.length === 0) return 'string';

  // Priority 4: Check Content for Image URLs (Heuristic)
  const imageCount = nonEmpty.filter(v => {
    const s = String(v).trim();
    // Check for common image extensions OR Google Drive/Photos/Imgur domains
    return (s.startsWith('http') || s.startsWith('www')) && (
      s.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i) || 
      s.includes('drive.google.com') || 
      s.includes('googleusercontent.com') ||
      s.includes('imgur.com') ||
      s.includes('ibb.co') ||
      s.includes('photos.app.goo.gl')
    );
  }).length;
  
  // If we have distinct Google Drive links, it's almost certainly an image column
  const hasDriveLinks = nonEmpty.some(v => String(v).includes('drive.google.com'));
  
  if (hasDriveLinks && imageCount > 0) return 'image';
  if (imageCount > 0 && (imageCount / nonEmpty.length) >= 0.2) return 'image';

  // Check Number
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

    // Detect Types (Pass header name now)
    const columns: ColumnInfo[] = headers.map(header => {
      const sampleValues = rawRows.slice(0, 20).map(r => r[header]);
      return {
        name: header,
        type: detectColumnType(sampleValues, header)
      };
    });

    // Convert Data Types and Transform URLs
    const rows = rawRows.map(row => {
      const newRow: DataRow = { ...row };
      columns.forEach(col => {
        if (col.type === 'number') {
          const val = newRow[col.name];
          if (typeof val === 'string') {
            const cleanVal = val.replace(/,/g, '').replace(/[฿$]/g, '');
            newRow[col.name] = cleanVal === '' ? 0 : parseFloat(cleanVal);
          }
        } else if (col.type === 'image') {
          // Transform Google Drive links to usable image sources
          // NEW: Support multiple images in one cell (split by comma or newline)
          const rawVal = String(newRow[col.name] || '');
          if (rawVal) {
             const parts = rawVal.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
             const transformedParts = parts.map(p => transformImageUrl(p)).filter(Boolean);
             newRow[col.name] = transformedParts.join(',');
          } else {
             newRow[col.name] = '';
          }
        }
      });
      
      // Removed hardcoded 'Baan Din' override to ensure all data comes from the sheet
      // If you want Baan Din to have images, please add them to the sheet row.
      
      return newRow;
    });

    return { columns, rows };

  } catch (error) {
    console.error("Error fetching sheet data", error);
    throw error;
  }
};