import { GoogleGenAI, Type } from "@google/genai";
import { AppData } from "../types";

// Helper for generating unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * VPai Chat Assistant
 */
export async function askVPai(question: string, context: AppData): Promise<string> {
  try {
    // Initialize the AI client
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct a textual knowledge base from the available documents
    // This is more resilient than JSON stringification for system instructions
    const knowledgeParts: string[] = [];

    if (context.rawKnowledge && context.rawKnowledge.length > 0) {
      knowledgeParts.push("GENERAL CAMPUS NOTES:\n" + context.rawKnowledge.join("\n"));
    }
    if (context.attendance && context.attendance.length > 0) {
      knowledgeParts.push("ATTENDANCE RECORDS:\n" + context.attendance.map(a => `- ${a.subject}: ${a.percentage}% (${a.attendedClasses}/${a.totalClasses}) for ${a.branch} ${a.year}`).join("\n"));
    }
    if (context.timetable && context.timetable.length > 0) {
      knowledgeParts.push("TIMETABLE SCHEDULES:\n" + context.timetable.map(t => `- ${t.day} for ${t.branch} ${t.year} Div ${t.division}: ${t.slots.map(s => `${s.time} ${s.subject} (Room ${s.room})`).join(", ")}`).join("\n"));
    }
    if (context.exams && context.exams.length > 0) {
      knowledgeParts.push("EXAM SCHEDULES:\n" + context.exams.map(e => `- ${e.subject} on ${e.date} at ${e.time} in ${e.venue} (${e.branch} ${e.year})`).join("\n"));
    }
    if (context.scholarships && context.scholarships.length > 0) {
      knowledgeParts.push("SCHOLARSHIP OPPORTUNITIES:\n" + context.scholarships.map(s => `- ${s.name}: ${s.amount}, Deadline: ${s.deadline}, Eligibility: ${s.eligibility}`).join("\n"));
    }
    if (context.internships && context.internships.length > 0) {
      knowledgeParts.push("INTERNSHIP/PLACEMENT LISTINGS:\n" + context.internships.map(i => `- ${i.company} - ${i.role} in ${i.location}, Stipend: ${i.stipend}`).join("\n"));
    }
    if (context.events && context.events.length > 0) {
      knowledgeParts.push("CAMPUS EVENTS:\n" + context.events.map(e => `- ${e.title} on ${e.date} at ${e.venue}: ${e.description}`).join("\n"));
    }

    const fullKnowledgeBase = knowledgeParts.length > 0 ? knowledgeParts.join("\n\n") : "No specific records available in the database yet.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: question }] }],
      config: {
        systemInstruction: `You are VPai, the polite and helpful official AI companion for QuadX College.
        
Use the following CAMPUS KNOWLEDGE BASE to answer questions accurately and concisely.

CAMPUS KNOWLEDGE BASE:
${fullKnowledgeBase}

STRICT GUIDELINES:
1. ALWAYS be polite and professional.
2. If the answer is NOT in the knowledge base, politely say: "I apologize, but I don't have that specific information in my records yet."
3. Keep answers SHORT and accurate.
4. Use **bold** for key info like times, rooms, subjects, and dates.
5. Use bullet points for lists.`,
        temperature: 0.1,
      }
    });

    if (response && response.text) {
      return response.text.trim();
    }
    
    return "I apologize, I'm having trouble formulating a response. Could you try asking in a different way?";
  } catch (error) {
    console.error("VPai Connection Error:", error);
    return "I'm currently having a bit of trouble connecting to my campus records. Please try asking me again in a moment!";
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