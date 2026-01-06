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
      EXTRACT COLLEGE DATA: '${category}'
      
      SOURCE CONTENT:
      """
      ${content}
      """

      STRICT EXTRACTION PROTOCOL:
      1. ANALYZE: Look for patterns resembling tables, lists, or announcements.
      2. INFER: If a specific field like 'branch' or 'year' is mentioned once at the top, apply it to all records in the text.
      3. DEFAULTS: If a required field is missing (e.g., room number or division), use "TBA" or "General" rather than skipping the record.
      4. NORMALIZATION: 
         - YEARS: Map to '1st Year', '2nd Year', '3rd Year', '4th Year'.
         - BRANCHES: Map to 'Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'.
         - DIVISIONS: Map to 'A' or 'B'.
      5. FORMAT: Return a valid JSON array matching the schema. If the source is totally irrelevant, return [].
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text || '[]';
    // Remove any markdown code block wrappers if the model accidentally included them
    const sanitizedJson = jsonText.replace(/```json|```/g, "").trim();
    const extracted = JSON.parse(sanitizedJson);
    
    if (!Array.isArray(extracted)) return [];

    console.log(`[AI Extraction] Success: Extracted ${extracted.length} items for ${category}`);

    return extracted.map((item: any) => ({
      ...item,
      id: generateId(),
      slots: item.slots ? item.slots.map((s: any) => ({ ...s, id: generateId() })) : undefined
    }));
  } catch (error) {
    console.error(`[AI Extraction] Error (${category}):`, error);
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
        day: { type: Type.STRING, description: 'Day of the week' },
        branch: { type: Type.STRING, description: 'Academic branch (Comp/IT/etc)' },
        year: { type: Type.STRING, description: 'Year (1st/2nd/3rd/4th Year)' },
        division: { type: Type.STRING, description: 'A or B' },
        slots: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING, description: 'Time range, e.g. 10:00 - 11:00' },
              subject: { type: Type.STRING, description: 'Subject name' },
              room: { type: Type.STRING, description: 'Classroom/Lab ID' },
              color: { type: Type.STRING, description: 'Hex or color name' }
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
        name: { type: Type.STRING, description: 'Name of scholarship' },
        amount: { type: Type.STRING, description: 'Amount or percentage' },
        deadline: { type: Type.STRING, description: 'Last date to apply' },
        eligibility: { type: Type.STRING, description: 'Brief requirements' },
        category: { type: Type.STRING, description: 'GIRLS or GENERAL' }
      },
      required: ["name", "amount", "deadline", "eligibility", "category"]
    }
  },
  'EVENT': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Event title' },
        date: { type: Type.STRING, description: 'Event date' },
        venue: { type: Type.STRING, description: 'Location' },
        description: { type: Type.STRING, description: 'Brief summary' },
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
        venue: { type: Type.STRING, description: 'Hall/Room' },
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
        role: { type: Type.STRING, description: 'Job role' },
        location: { type: Type.STRING, description: 'City/Remote' },
        stipend: { type: Type.STRING, description: 'Pay' },
        branch: { type: Type.STRING, description: 'Branch' },
        year: { type: Type.STRING, description: 'Year' }
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
        percentage: { type: Type.NUMBER, description: 'Percentage' },
        totalClasses: { type: Type.NUMBER, description: 'Total classes' },
        attendedClasses: { type: Type.NUMBER, description: 'Classes attended' },
        branch: { type: Type.STRING, description: 'Branch' },
        year: { type: Type.STRING, description: 'Year' }
      },
      required: ["subject", "percentage", "totalClasses", "attendedClasses", "branch", "year"]
    }
  }
};