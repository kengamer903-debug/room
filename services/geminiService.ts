import { GoogleGenAI } from "@google/genai";
import { SheetData, ColumnInfo } from '../types';

// Use gemini-3-flash-preview for fast analysis
const MODEL_NAME = 'gemini-3-flash-preview';

export const analyzeDashboardData = async (data: SheetData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare a summary of the data to fit in context
  const headers = data.columns.map(c => c.name).join(', ');
  const rowCount = data.rows.length;
  
  // aggregate some stats for numeric columns
  const numericColumns = data.columns.filter(c => c.type === 'number');
  const stats = numericColumns.map(col => {
    const values = data.rows.map(r => r[col.name] as number);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    return `${col.name}: Sum=${sum.toFixed(2)}, Avg=${avg.toFixed(2)}, Max=${max}`;
  }).join('\n');

  // Take a sample of first 10 rows for context
  const sampleRows = data.rows.slice(0, 10).map(r => JSON.stringify(r)).join('\n');

  const prompt = `
    You are a data analyst. Analyze the following dataset from a Google Sheet.
    
    **Dataset Metadata:**
    - Total Rows: ${rowCount}
    - Columns: ${headers}
    
    **Numeric Column Statistics:**
    ${stats}
    
    **First 10 Rows Sample:**
    ${sampleRows}
    
    **Instructions:**
    1. Identify key trends in the data.
    2. Point out any interesting outliers or anomalies if visible in the stats.
    3. Suggest 2-3 actionable insights based on this data.
    4. Keep the tone professional but easy to read.
    5. Format the output with clear Markdown headings and bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to generate insights. Please try again later.";
  }
};

export const chatWithData = async (data: SheetData, history: {role: 'user'|'model', text: string}[], userMessage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Create a summarized context of the data
    // We cannot send all rows, so we send headers, stats, and a sample
    const headers = data.columns.map(c => c.name).join(', ');
    
    // Calculate simple stats for context
    const conditionCol = data.columns.find(c => /condition|status|สภาพ|สถานะ/i.test(c.name));
    let conditionSummary = "Condition Status Summary: N/A";
    
    if (conditionCol) {
        const counts: Record<string, number> = {};
        data.rows.forEach(r => {
            const val = String(r[conditionCol.name] || 'Unknown');
            counts[val] = (counts[val] || 0) + 1;
        });
        conditionSummary = "Condition Counts: " + JSON.stringify(counts);
    }
    
    const rowCount = data.rows.length;
    const sampleRows = data.rows.slice(0, 5).map(r => JSON.stringify(r)).join('\n');

    const systemInstruction = `
        You are a helpful AI assistant for an Asset Management Dashboard.
        You have access to a dataset summary:
        - Total Items: ${rowCount}
        - Columns: ${headers}
        - ${conditionSummary}
        - Sample Data: ${sampleRows}

        Answer the user's questions about this data. 
        If they ask for specific calculations that you can't do precisely with just the summary, 
        give an estimate or explain how they can find it in the dashboard (e.g. "You can filter by 'Building' to see...").
        Keep answers concise and helpful. Reply in the same language as the user (Thai or English).
    `;

    try {
        const chat = ai.chats.create({
            model: MODEL_NAME,
            config: {
                systemInstruction: systemInstruction,
            },
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            }))
        });

        const result = await chat.sendMessage({ message: userMessage });
        return result.text || "I couldn't generate a response.";
    } catch (error) {
        console.error("Chat Error:", error);
        return "Sorry, I encountered an error analyzing your request.";
    }
};
