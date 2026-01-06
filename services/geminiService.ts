import { GoogleGenAI, Type } from "@google/genai";
import { AppData } from "../types";

// Helper for generating unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * VPai Chat Assistant
 */
export async function askVPai(question: string, context: AppData): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanContext = {
      attendance: context.attendance,
      timetable: context.timetable,
      exams: context.exams,
      scholarships: context.scholarships,
      internships: context.internships,
      events: context.events,
    };
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: question,
      config: {
        systemInstruction: `You are VPai, the official AI for QuadX College.
        
        CONTEXT:
        ${JSON.stringify(cleanContext, null, 2)}
        
        STRICT RULES:
        1. Only answer using the CONTEXT provided.
        2. If info is missing, say: "Data not available in my current records."
        3. Be concise. Use **bold** for important dates/times/rooms.
        4. When asked about attendance, summarize the percentages.`,
        temperature: 0.1,
      }
    });

    return response.text?.trim() || "I'm having trouble retrieving that information.";
  } catch (error) {
    console.error("Gemini Assistant Error:", error);
    return "Campus AI is briefly offline. Please try again.";
  }
}

/**
 * AI Data Extraction with Normalization
 */
export async function extractCategoryData(category: string, content: string, mimeType: string = "text/plain"): Promise<any[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const schema = CATEGORY_SCHEMAS[category];
    if (!schema) return [];

    const prompt = `
      ACT AS A DATA EXTRACTION SPECIALIST FOR COLLEGE SYSTEMS.
      CATEGORY: '${category}'
      
      SOURCE DATA:
      """
      ${content}
      """

      INSTRUCTIONS:
      1. ANALYZE the source data above. It may be messy text, a table copy-paste, or an announcement.
      2. IDENTIFY columns or fields that map to the required schema.
      3. INFER values: If 'Branch' is mentioned at the top, apply it to all records in that block.
      4. DEFAULTS: If a required field (like room, division, or year) is missing, provide a logical default like "TBA" or "General" rather than failing.
      5. NORMALIZATION:
         - Years: Map to '1st Year', '2nd Year', '3rd Year', or '4th Year'.
         - Branches: Map to 'Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'.
         - Divisions: Map to 'A' or 'B'.
      6. RETURN: A valid JSON array of objects matching the schema. Return [] if the data is completely irrelevant.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = (response.text || '[]').replace(/```json|```/g, "").trim();
    const extracted = JSON.parse(jsonText);
    
    if (!Array.isArray(extracted)) return [];

    console.log(`[AI] Successfully extracted ${extracted.length} records for ${category}`);

    return extracted.map((item: any) => ({
      ...item,
      id: generateId(),
      slots: item.slots ? item.slots.map((s: any) => ({ ...s, id: generateId() })) : undefined
    }));
  } catch (error) {
    console.error(`[AI] Extraction Failed for ${category}:`, error);
    return [];
  }
}

/**
 * Stylize Map Image
 */
export async function stylizeMapImage(imageBase64: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' } },
          { text: 'Convert this campus map into a futuristic neon vector illustration. Remove all text labels.' }
        ]
      }
    });
    
    const candidates = response.candidates ?? [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) { 
    console.error("Map Stylization Error:", e);
    return null; 
  }
}

const CATEGORY_SCHEMAS: Record<string, any> = {
  'TIMETABLE': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.STRING, description: 'Day of week (Monday-Sunday)' },
        branch: { type: Type.STRING, description: 'College branch (e.g. Comp, IT)' },
        year: { type: Type.STRING, description: 'Academic year (e.g. 1st Year)' },
        division: { type: Type.STRING, description: 'A or B' },
        slots: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING, description: 'Duration (e.g. 9:00 - 10:00)' },
              subject: { type: Type.STRING, description: 'Subject name/code' },
              room: { type: Type.STRING, description: 'Classroom ID' },
              color: { type: Type.STRING, description: 'Hex color code' }
            },
            required: ["time", "subject", "room"]
          }
        }
      },
      required: ["day", "branch", "year", "division", "slots"]
    }
  },
  'SCHOLARSHIP': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Scholarship official name' },
        amount: { type: Type.STRING, description: 'Benefit amount' },
        deadline: { type: Type.STRING, description: 'Closing date' },
        eligibility: { type: Type.STRING, description: 'Requirements' },
        category: { type: Type.STRING, description: 'Must be GIRLS or GENERAL' }
      },
      required: ["name", "amount", "deadline", "eligibility", "category"]
    }
  },
  'EVENT': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Event name' },
        date: { type: Type.STRING, description: 'Event date' },
        venue: { type: Type.STRING, description: 'Location' },
        description: { type: Type.STRING, description: 'Summary' },
        category: { type: Type.STRING, description: 'Branch or General' }
      },
      required: ["title", "date", "venue", "description", "category"]
    }
  },
  'EXAM': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING, description: 'Subject' },
        date: { type: Type.STRING, description: 'Date' },
        time: { type: Type.STRING, description: 'Time' },
        venue: { type: Type.STRING, description: 'Hall number' },
        branch: { type: Type.STRING, description: 'Branch' },
        year: { type: Type.STRING, description: 'Year' },
        division: { type: Type.STRING, description: 'Division' }
      },
      required: ["subject", "date", "time", "venue", "branch", "year", "division"]
    }
  },
  'INTERNSHIP': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        company: { type: Type.STRING, description: 'Company name' },
        role: { type: Type.STRING, description: 'Job title' },
        location: { type: Type.STRING, description: 'City/Remote' },
        stipend: { type: Type.STRING, description: 'Monthly pay' },
        branch: { type: Type.STRING, description: 'Target branch' },
        year: { type: Type.STRING, description: 'Target year' }
      },
      required: ["company", "role", "location", "stipend", "branch", "year"]
    }
  },
  'ATTENDANCE': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING, description: 'Subject' },
        percentage: { type: Type.NUMBER, description: 'Percentage value' },
        totalClasses: { type: Type.NUMBER, description: 'Total classes' },
        attendedClasses: { type: Type.NUMBER, description: 'Classes attended' },
        branch: { type: Type.STRING, description: 'Student branch' },
        year: { type: Type.STRING, description: 'Student year' }
      },
      required: ["subject", "percentage", "totalClasses", "attendedClasses", "branch", "year"]
    }
  }
};