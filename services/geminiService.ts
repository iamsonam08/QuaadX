import { GoogleGenAI, Type } from "@google/genai";
import { AppData } from "../types";

// We use a lazy initialization pattern to ensure the GoogleGenAI instance is only 
// created when needed, which avoids top-level execution issues during build time.
let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Vite's 'define' will replace process.env.API_KEY with the actual value or an empty string.
    const apiKey = process.env.API_KEY || "";
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * VPai Chat Assistant
 */
export async function askVPai(question: string, context: AppData) {
  if (!process.env.API_KEY) {
    return "AI Error: API Key not found. Please check your environment variables.";
  }

  try {
    const ai = getAI();
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
export async function extractCategoryData(category: string, content: string, mimeType: string = "text/plain") {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  
  const ai = getAI();
  const schema = CATEGORY_SCHEMAS[category];
  if (!schema) return [];

  const normalizationPrompt = `
    Extract structured JSON data for the college category: '${category}'.
    
    STRICT NORMALIZATION RULES:
    - YEARS: Convert 'FE' to '1st Year', 'SE' to '2nd Year', 'TE' to '3rd Year', 'BE' to '4th Year'.
    - BRANCHES: Use only these keys: 'Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'. 
    - DAYS: Use full names: 'Monday', 'Tuesday', etc.
    - DIVISIONS: Use 'A' or 'B'.
    
    Return a valid JSON array. If no records are found, return [].
  `;

  const parts: any[] = [{ text: normalizationPrompt }];

  if (mimeType.startsWith('image/')) {
    parts.push({
      inlineData: {
        data: content.includes(',') ? content.split(',')[1] : content,
        mimeType: mimeType
      }
    });
  } else {
    parts.push({ text: `INPUT SOURCE DATA:\n${content}` });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text || '[]';
    const extracted = JSON.parse(jsonText);
    
    return extracted.map((item: any) => ({
      ...item,
      id: generateId(),
      slots: item.slots ? item.slots.map((s: any) => ({ ...s, id: generateId() })) : undefined
    }));
  } catch (error) {
    console.error(`Gemini Extraction Error (${category}):`, error);
    return [];
  }
}

export async function stylizeMapImage(imageBase64: string): Promise<string | null> {
  if (!process.env.API_KEY) return null;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' } },
          { text: 'Convert this campus map into a futuristic neon vector illustration. Remove all text labels.' }
        ]
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) { return null; }
}

const CATEGORY_SCHEMAS: Record<string, any> = {
  'TIMETABLE': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.STRING },
        branch: { type: Type.STRING },
        year: { type: Type.STRING },
        division: { type: Type.STRING },
        slots: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              subject: { type: Type.STRING },
              room: { type: Type.STRING },
              color: { type: Type.STRING }
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
        name: { type: Type.STRING },
        amount: { type: Type.STRING },
        deadline: { type: Type.STRING },
        eligibility: { type: Type.STRING },
        category: { type: Type.STRING, description: 'Must be "GIRLS" or "GENERAL"' }
      },
      required: ["name", "amount", "deadline", "eligibility", "category"]
    }
  },
  'EVENT': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        date: { type: Type.STRING },
        venue: { type: Type.STRING },
        description: { type: Type.STRING },
        category: { type: Type.STRING, description: 'Branch name or "General"' }
      },
      required: ["title", "date", "venue", "description", "category"]
    }
  },
  'EXAM': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        date: { type: Type.STRING },
        time: { type: Type.STRING },
        venue: { type: Type.STRING },
        branch: { type: Type.STRING },
        year: { type: Type.STRING },
        division: { type: Type.STRING }
      },
      required: ["subject", "date", "time", "venue", "branch", "year", "division"]
    }
  },
  'INTERNSHIP': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        company: { type: Type.STRING },
        role: { type: Type.STRING },
        location: { type: Type.STRING },
        stipend: { type: Type.STRING },
        branch: { type: Type.STRING },
        year: { type: Type.STRING }
      },
      required: ["company", "role", "location", "stipend", "branch", "year"]
    }
  },
  'ATTENDANCE': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        percentage: { type: Type.NUMBER },
        totalClasses: { type: Type.NUMBER },
        attendedClasses: { type: Type.NUMBER },
        branch: { type: Type.STRING },
        year: { type: Type.STRING }
      },
      required: ["subject", "percentage", "totalClasses", "attendedClasses", "branch", "year"]
    }
  }
};