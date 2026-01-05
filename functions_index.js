
/**
 * FIREBASE CLOUD FUNCTIONS - BACKEND AI LOGIC (ESM VERSION)
 * This file is intended for deployment to Firebase Functions (v2).
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import fetch from "node-fetch";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processAIQueue = onDocumentCreated("processing_queue/{docId}", async (event) => {
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
      console.log(`Downloading and processing file: ${fileUrl}`);
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

    const aiResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });

    const aiResult = JSON.parse(aiResponse.text);
    const category = aiResult.category.toLowerCase();
    
    // Normalize Category Name
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
    
    // Mark as processed in the queue
    await snapshot.ref.update({ status: 'completed', category: finalCategory });
    
    console.log(`Successfully categorized as: ${finalCategory}`);

  } catch (error) {
    console.error("AI Extraction Error:", error);
    await snapshot.ref.update({ status: 'failed', error: error.message });
  }
});
