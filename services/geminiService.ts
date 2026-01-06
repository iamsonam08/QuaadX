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
      Extract a JSON array of records for the college category: '${category}'.
      
      SOURCE DATA:
      ${content}

      INSTRUCTIONS:
      1. Map all relevant information from the source data into the schema provided.
      2. If data is messy (like a spreadsheet copy-paste), use your best judgment to find column headers.
      3. For YEARS: Always convert to '1st Year', '2nd Year', '3rd Year', or '4th Year'.
      4. For BRANCHES: Map to 'Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', or 'E&TC'.
      5. For DIVISIONS: Use 'A' or 'B'.
      6. For ATTENDANCE: If 'totalClasses' or 'attendedClasses' are missing but a percentage is given, assume 100 total classes and calculate attended.
      7. Return an EMPTY ARRAY [] if absolutely no data related to ${category} is found.
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
    const extracted = JSON.parse(jsonText);
    
    if (!Array.isArray(extracted)) return [];

    console.log(`AI extracted ${extracted.length} records for ${category}`);

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
        day: { type: Type.STRING, description: 'Full day name, e.g., Monday' },
        branch: { type: Type.STRING, description: 'Academic branch e.g. Comp, IT' },
        year: { type: Type.STRING, description: 'e.g. 1st Year, 2nd Year' },
        division: { type: Type.STRING, description: 'A or B' },
        slots: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING, description: 'Time duration, e.g. 09:00 - 10:00' },
              subject: { type: Type.STRING, description: 'Short subject name' },
              room: { type: Type.STRING, description: 'Room number or lab name' },
              color: { type: Type.STRING, description: 'A hex color or basic color name' }
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
        name: { type: Type.STRING, description: 'Official name of the scholarship' },
        amount: { type: Type.STRING, description: 'Financial benefit amount' },
        deadline: { type: Type.STRING, description: 'Last date to apply' },
        eligibility: { type: Type.STRING, description: 'Short eligibility criteria' },
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
        title: { type: Type.STRING, description: 'Name of the event' },
        date: { type: Type.STRING, description: 'Date of event' },
        venue: { type: Type.STRING, description: 'Location on campus' },
        description: { type: Type.STRING, description: 'Brief overview' },
        category: { type: Type.STRING, description: 'Branch name or General' }
      },
      required: ["title", "date", "venue", "description", "category"]
    }
  },
  'EXAM': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING, description: 'Exam subject' },
        date: { type: Type.STRING, description: 'Exam date' },
        time: { type: Type.STRING, description: 'Exam timing' },
        venue: { type: Type.STRING, description: 'Hall or room number' },
        branch: { type: Type.STRING, description: 'Academic branch' },
        year: { type: Type.STRING, description: 'Academic year' },
        division: { type: Type.STRING, description: 'Division A or B' }
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
        location: { type: Type.STRING, description: 'City or Remote' },
        stipend: { type: Type.STRING, description: 'Payment amount' },
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
        subject: { type: Type.STRING, description: 'Subject name' },
        percentage: { type: Type.NUMBER, description: 'Numerical percentage value' },
        totalClasses: { type: Type.NUMBER, description: 'Total classes conducted' },
        attendedClasses: { type: Type.NUMBER, description: 'Classes attended by student' },
        branch: { type: Type.STRING, description: 'Academic branch' },
        year: { type: Type.STRING, description: 'Academic year' }
      },
      required: ["subject", "percentage", "totalClasses", "attendedClasses", "branch", "year"]
    }
  }
};