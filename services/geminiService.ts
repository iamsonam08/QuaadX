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
    
    // Include all relevant data for the AI to have full context
    const cleanContext = {
      attendance: context.attendance,
      timetable: context.timetable,
      exams: context.exams,
      scholarships: context.scholarships,
      internships: context.internships,
      events: context.events,
      campusNotes: context.rawKnowledge, // Added this to help with campus map questions
    };
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: question,
      config: {
        systemInstruction: `You are VPai, the polite and helpful official AI companion for QuadX College.
        
        CONTEXT DATA FROM CAMPUS DATABASE:
        ${JSON.stringify(cleanContext, null, 2)}
        
        STRICT OPERATING PROCEDURES:
        1. PERSPECTIVE: Always speak politely as "VPai". Use "I" when referring to yourself.
        2. ACCURACY: Only provide information found in the CONTEXT DATA above. 
        3. FALLBACK: If the information is not present in the context, say: "I apologize, but I don't have that specific information in my current campus records."
        4. CONCISENESS: Keep answers short and direct. Avoid long introductions.
        5. FORMATTING: Use **bold** for dates, times, room numbers, and subject names. Use bullet points for lists.
        6. ATTENDANCE: When asked about attendance, provide a quick summary of the percentages for the requested subject or overall.
        7. TIMETABLE: Clearly state the time and room for classes.`,
        temperature: 0.2,
        topP: 0.8,
        topK: 40
      }
    });

    if (response && response.text) {
      return response.text.trim();
    }
    
    return "I'm sorry, I couldn't find an answer to that in our database.";
  } catch (error) {
    console.error("Gemini Assistant Error:", error);
    // Returning a slightly more descriptive error internally but keeping it polite
    return "I'm currently having a bit of trouble connecting to the campus brain. Could you try asking me again in a moment?";
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

      STRICT NORMALIZATION RULES (EXTREMELY IMPORTANT):
      1. BRANCH: Must be EXACTLY one of: 'Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'. 
         - Map 'Computer', 'CSE' to 'Comp'.
         - Map 'Information Technology' to 'IT'.
         - Map 'Mechanical' to 'Mech'.
         - Map 'Electrical' to 'Elect'.
         - Map 'Artificial Intelligence' to 'AIDS'.
         - Map 'Electronics', 'ENTC' to 'E&TC'.
      2. YEAR: Must be EXACTLY one of: '1st Year', '2nd Year', '3rd Year', '4th Year'.
         - Map 'FY', 'First Year' to '1st Year'.
         - Map 'SY', 'Second Year' to '2nd Year'.
         - Map 'TY', 'Third Year' to '3rd Year'.
         - Map 'LY', 'BE', 'Final Year' to '4th Year'.
      3. EVENT CATEGORY: Must be one of the Branches above OR 'General'.
      4. INFER missing fields based on context or headers.
      
      OUTPUT: Return ONLY a valid JSON array of objects matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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