import { GoogleGenAI, Type } from "@google/genai";
import { AppData } from "../types";

// Helper for generating unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * VPai Chat Assistant
 * Uses Gemini 3 Pro for high-accuracy reasoning over campus records.
 */
export async function askVPai(question: string, context: AppData): Promise<string> {
  if (!question.trim()) return "I'm listening! What would you like to know about the campus?";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct a rich textual context for the AI
    const knowledgeParts: string[] = [];

    if (context.rawKnowledge && context.rawKnowledge.length > 0) {
      knowledgeParts.push("GENERAL CAMPUS NOTES:\n" + context.rawKnowledge.join("\n"));
    }
    if (context.attendance && context.attendance.length > 0) {
      knowledgeParts.push("ATTENDANCE RECORDS:\n" + context.attendance.map(a => `- ${a.subject}: ${a.percentage}% (${a.attendedClasses}/${a.totalClasses}) for ${a.branch} ${a.year}`).join("\n"));
    }
    if (context.timetable && context.timetable.length > 0) {
      knowledgeParts.push("TIMETABLE SCHEDULES:\n" + context.timetable.map(t => `- Day: ${t.day}, Branch: ${t.branch}, Year: ${t.year}, Div: ${t.division}. Classes: ${t.slots.map(s => `${s.time} - ${s.subject} (Room ${s.room})`).join(", ")}`).join("\n"));
    }
    if (context.exams && context.exams.length > 0) {
      knowledgeParts.push("EXAM SCHEDULES:\n" + context.exams.map(e => `- ${e.subject} on ${e.date} at ${e.time} in ${e.venue} (Target: ${e.branch} ${e.year} Div ${e.division})`).join("\n"));
    }
    if (context.scholarships && context.scholarships.length > 0) {
      knowledgeParts.push("SCHOLARSHIP OPPORTUNITIES:\n" + context.scholarships.map(s => `- ${s.name}: ${s.amount}, Ends: ${s.deadline}, For: ${s.eligibility}`).join("\n"));
    }
    if (context.internships && context.internships.length > 0) {
      knowledgeParts.push("INTERNSHIP/PLACEMENT LISTINGS:\n" + context.internships.map(i => `- ${i.company}: ${i.role} (${i.location}), Stipend: ${i.stipend}`).join("\n"));
    }
    if (context.events && context.events.length > 0) {
      knowledgeParts.push("CAMPUS EVENTS:\n" + context.events.map(e => `- ${e.title} on ${e.date} at ${e.venue}: ${e.description}`).join("\n"));
    }

    const campusKnowledge = knowledgeParts.length > 0 ? knowledgeParts.join("\n\n") : "No campus data available yet.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: question }] }],
      config: {
        systemInstruction: `You are VPai, the polite, professional, and helpful official AI companion for QuadX College.
        
        CAMPUS KNOWLEDGE BASE:
        ${campusKnowledge}
        
        YOUR CORE INSTRUCTIONS:
        1. IDENTITY: You are VPai. Always be student-centric and encouraging.
        2. DATA SOURCE: Use ONLY the CAMPUS KNOWLEDGE BASE provided above.
        3. ACCURACY: If the information is missing from the knowledge base, say: "I apologize, but I don't have that specific information in the official campus records yet."
        4. BREVITY: Keep answers short, accurate, and structured. Use bullet points for schedules or lists.
        5. FORMATTING: Use **bold** for subjects, times, room numbers, dates, and names.
        6. RELEVANCE: Only answer questions related to college life, academics, and the provided data.`,
        temperature: 0.2,
      }
    });

    return response.text?.trim() || "I'm sorry, I'm having trouble processing that request right now.";
  } catch (error) {
    console.error("VPai Connection Error:", error);
    return "I'm currently having trouble connecting to the campus neural network. Please try asking again in a moment!";
  }
}

/**
 * AI Data Extraction with Normalization
 * Improved to use Gemini 3 Pro for complex parsing and added missing schemas.
 */
export async function extractCategoryData(category: string, content: string, mimeType: string = "text/plain"): Promise<any[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const schema = CATEGORY_SCHEMAS[category];
    if (!schema) {
      console.warn(`No schema found for category: ${category}`);
      return [];
    }

    const prompt = `
      ACT AS A DATA EXTRACTION SPECIALIST FOR A COLLEGE DATABASE.
      CATEGORY: '${category}'
      
      INPUT CONTENT:
      """
      ${content}
      """

      INSTRUCTIONS:
      1. Carefully parse the input. It may be structured as 'Header: Value | Header: Value', CSV, or raw text.
      2. MAP values to the required JSON schema. 
      3. CRITICAL NORMALIZATION (Fix values if they are close but not exact):
         - Branch: Must be exactly one of: 'Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'.
         - Year: Must be exactly one of: '1st Year', '2nd Year', '3rd Year', '4th Year'.
         - Division: Must be 'A' or 'B'.
         - For Event Category: Must be one of the Branch names OR 'General'.
      4. DEFAULTS: If a field is missing, use reasonable defaults (e.g., Room: 'TBA', Time: 'TBA', Date: 'TBA').
      5. OUTPUT: Return ONLY a valid JSON array of objects.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro for better extraction logic
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, // Lower temperature for more consistent extraction
      },
    });

    const rawText = response.text || '[]';
    // Robust extraction of JSON array from potential AI chatter
    const jsonStart = rawText.indexOf('[');
    const jsonEnd = rawText.lastIndexOf(']') + 1;
    const sanitizedJson = (jsonStart !== -1 && jsonEnd > jsonStart) ? rawText.substring(jsonStart, jsonEnd) : '[]';
    
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
          { text: 'Redraw this campus map as a vibrant, colorful, futuristic high-tech vector illustration. Remove all textual labels and make it look amazing.' }
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
  },
  'CAMPUS_MAP': {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        info: { type: Type.STRING, description: "Textual description or fact about the campus layout/facilities." }
      },
      required: ["info"]
    }
  }
};