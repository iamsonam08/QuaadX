
/**
 * FIREBASE CLOUD FUNCTIONS - BACKEND AI LOGIC
 * Deploy this in your Firebase Functions folder.
 * It handles the 'processing_queue' and distributes data into categories.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { GoogleGenAI } = require("@google/genai");
const admin = require("firebase-admin");
const fetch = require("node-fetch"); // Ensure node-fetch is in package.json

admin.initializeApp();
const db = getFirestore();

// Gemini Initialization (Backend Version)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

exports.processAIQueue = onDocumentCreated("processing_queue/{docId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const { content, fileUrl, mimeType, type } = snapshot.data();
  console.log(`Processing new ${type} upload: ${event.params.docId}`);

  try {
    let parts = [];
    const systemPrompt = `
      Analyze this college campus data. 
      1. Extract structured information with high precision.
      2. Categorize it into EXACTLY ONE: 'attendance', 'timetable', 'scholarships', 'events', 'exams', 'internships'.
      3. Identify target Branch (Comp, IT, Civil, Mech, Elect, AIDS, E&TC) and Year (1st Year, 2nd Year, 3rd Year, 4th Year).
      4. For Timetable, extract individual slots with time, subject, and room.
      5. For Attendance, extract subject, total classes, and attended classes.
      
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
          "totalClasses": number (optional),
          "attendedClasses": number (optional),
          "message": string (optional),
          "slots": Array<{ "time": string, "subject": string, "room": string }> (optional)
        }
      }
    `;

    parts.push({ text: systemPrompt });

    if (type === 'file' && fileUrl) {
      console.log(`Downloading file: ${fileUrl}`);
      const response = await fetch(fileUrl);
      const buffer = await response.buffer();
      const base64Data = buffer.toString('base64');
      
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    } else {
      parts.push({ text: `INPUT TEXT:\n${content}` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });

    const aiResult = JSON.parse(response.text);
    const category = aiResult.category.toLowerCase();
    
    // Normalize Category Name if AI used plural/singular variations
    const validCategories = ['attendance', 'timetable', 'scholarships', 'events', 'exams', 'internships'];
    const finalCategory = validCategories.includes(category) ? category : 'events';

    const finalData = {
      ...aiResult.data,
      timestamp: FieldValue.serverTimestamp(),
      sourceId: event.params.docId,
      processedAt: new Date().toISOString()
    };

    // Save to the specific Firestore collection for real-time sync
    await db.collection(finalCategory).add(finalData);
    
    // Mark as processed
    await snapshot.ref.update({ status: 'completed', category: finalCategory });
    
    console.log(`Successfully categorized as: ${finalCategory}`);

  } catch (error) {
    console.error("AI Extraction Error:", error);
    await snapshot.ref.update({ status: 'failed', error: error.message });
  }
});
