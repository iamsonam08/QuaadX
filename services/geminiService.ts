import { GoogleGenAI, Type } from "@google/genai";
import { AppData } from "../types";

// Helper for generating unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * VPai Chat Assistant
 */
export async function askVPai(question: string, context: AppData): Promise<string> {
  try {
    // Initialize the AI client inside the function to ensure the most up-to-date API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare a clean, compact context for the AI
    const campusContext = {
      attendance: context.attendance || [],
      timetable: context.timetable || [],
      exams: context.exams || [],
      scholarships: context.scholarships || [],
      internships: context.internships || [],
      events: context.events || [],
      campusNotes: context.rawKnowledge || [],
    };
    
    // Use gemini-3-pro-preview for complex reasoning over the campus database
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: question }] }],
      config: {
        systemInstruction: `You are VPai, the polite, professional, and helpful official AI companion for QuadX College.
        
        YOUR CAMPUS DATABASE (CONTEXT):
        ${JSON.stringify(campusContext)}
        
        YOUR CORE INSTRUCTIONS:
        1. IDENTITY: Introduce yourself as VPai only if asked. Always be polite and student-centric.
        2. DATA SOURCE: Use ONLY the provided context above to answer. If information isn't there, politely state: "I don't have that specific detail in our official campus records yet."
        3. ACCURACY: Provide specific names, times, rooms, and percentages exactly as they appear in the data.
        4. BREVITY: Keep answers short, accurate, and easy to read. Use bullet points for lists.
        5. FORMATTING: Use **bold** for subjects, dates, room numbers, and important values.
        6. ATTENDANCE: When asked about attendance, summarize the percentage and class count for that subject.
        7. TIMETABLE: Clearly state class timings and locations.`,
        temperature: 0.1, // Lower temperature for higher factual accuracy
        topP: 0.9,
      }
    });

    if (response && response.text) {
      return response.text.trim();
    }
    
    return "I apologize, I'm finding it difficult to retrieve that information right now. Could you please rephrase your question?";
  } catch (error) {
    console.error("VPai Connection Error:", error);
    return "I'm currently having a bit of trouble connecting to the campus records. Please try asking me again in a moment, and I'll be happy to help!";
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
      ACT AS A DATA EXTRACTION EXPERT.
      CATEGORY: '${category}'
      
      INPUT DATA:
      """
      ${content}
      """

      STRICT NORMALIZATION RULES:
      1. BRANCH: Must be EXACTLY one of: 'Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'. 
      2. YEAR: Must be EXACTLY one of: '1st Year', '2nd Year', '3rd Year', '4th Year'.
      3. EVENT CATEGORY: Must be one of the Branches above OR 'General'.
      
      OUTPUT: Return ONLY a valid JSON array of objects matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const rawText = response.text || '[]';
    const jsonStart = rawText.indexOf('[');
    const jsonEnd = rawText.lastIndexOf(']') + 1;
    const sanitizedJson = jsonStart !== -1 ? rawText.substring(jsonStart, jsonEnd) : '[]';
    
    const extracted = JSON.parse(sanitizedJson);
    
    if (!Array.isArray(extracted)) return [];

    return extracted.map((item: any) => ({
      ...item,
      id: generateId(),
      slots: item.slots ? item.slots.map((s: any) => ({ ...s, id: generateId() })) : undefined
    }));
  } catch (error) {
    console.error(`[AI Extraction Error] ${category}:`, error);
    return [];
  }
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
        title: { type: Type.STRING },
        date: { type: Type.STRING },
        venue: { type: Type.STRING },
        description: { type: Type.STRING },
        category: { 
          type: Type.STRING, 
          description: "Must be exactly one of: 'General', 'Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'" 
        }
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