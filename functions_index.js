
/**
 * FIREBASE CLOUD FUNCTIONS - BACKEND AI LOGIC
 * Deploy this in your Firebase Functions folder.
 * It handles the 'processing_queue' and distributes data into categories.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { GoogleGenAI } = require("@google/genai");
const admin = require("firebase-admin");

admin.initializeApp();
const db = getFirestore();

// Gemini Initialization (Backend Version)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

exports.processAIQueue = onDocumentCreated("processing_queue/{docId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const { content, type } = snapshot.data();
  console.log(`Processing new ${type} upload: ${event.params.docId}`);

  try {
    const prompt = `
      Analyze this college campus data. 
      1. Extract structured information.
      2. Categorize it into EXACTLY ONE: 'attendance', 'timetable', 'scholarship', 'events', 'exams', 'internships'.
      3. Identify the target Branch (Comp, IT, Civil, Mech, Elect, AIDS, E&TC) and Year (1st Year, 2nd Year, 3rd Year, 4th Year) if applicable.
      
      Output ONLY a JSON object with this schema:
      {
        "category": string,
        "data": {
          "title": string,
          "subject": string (optional),
          "branch": string (optional),
          "year": string (optional),
          "venue": string (optional),
          "date": string (optional),
          "time": string (optional),
          "percentage": number (optional),
          "message": string (optional)
        }
      }

      INPUT CONTENT:
      ${content}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const aiResult = JSON.parse(response.text);
    const category = aiResult.category.toLowerCase();
    const finalData = {
      ...aiResult.data,
      timestamp: FieldValue.serverTimestamp(),
      sourceId: event.params.docId
    };

    // Save to the specific Firestore collection for real-time sync
    await db.collection(category).add(finalData);
    
    // Mark as processed
    await snapshot.ref.update({ status: 'completed', category });
    
    console.log(`Successfully categorized as: ${category}`);

  } catch (error) {
    console.error("AI Extraction Error:", error);
    await snapshot.ref.update({ status: 'failed', error: error.message });
  }
});
