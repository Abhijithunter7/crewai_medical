import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Message, ExtractedReportData } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a placeholder check. In a real environment, the key would be set.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "YOUR_API_KEY" });
const model = "gemini-2.5-flash";

// --- LangGraph Simulation for Symptom Triage ---

export interface TriageResult {
  decision: 'TRIAGE' | 'CLARIFY';
  text: string;
  specialty?: string;
}

const formatHistoryForPrompt = (history: Message[]): string => {
  return history.map(msg => `${msg.sender === 'user' ? 'Patient' : 'Assistant'}: ${msg.text}`).join('\n');
};

const generateText = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API error in generateText:", error);
        return "Sorry, I'm having trouble processing your request. Please try again later.";
    }
}

// LangGraph Simulation: Node 1 (Router)
const routeSymptomQuery = async (historyText: string, assistantTurns: number): Promise<'TRIAGE' | 'CLARIFY'> => {
    const prompt = `You are an expert medical triage router. Your job is to analyze a conversation and decide if there is enough information to provide a recommendation for a level of care.
The conversation is between a patient and an AI assistant. The assistant has already asked ${assistantTurns} clarifying question(s).

Conversation:
---
${historyText}
---

Your goal is to reach a recommendation within 2-3 total questions.
- If you have enough information to make a recommendation, respond with ONLY the word 'TRIAGE'.
- If the assistant has already asked 2 or more questions, you should strongly prefer to 'TRIAGE' unless critical information is missing (e.g., duration of a severe symptom, presence of fever with a rash).
- Otherwise, if you absolutely need more information to make a safe recommendation, respond with ONLY the word 'CLARIFY'.`;
    
    const result = await generateText(prompt);
    // Be robust with the model's output
    if (result.toUpperCase().includes('TRIAGE')) return 'TRIAGE';
    return 'CLARIFY';
};

// LangGraph Simulation: Node 2a (Clarification Agent)
const askClarifyingQuestion = async (historyText: string): Promise<string> => {
    const prompt = `You are a helpful medical assistant trying to reach a diagnosis recommendation quickly. Based on the conversation so far, ask the MOST CRITICAL clarifying question to help you make a decision.
Your question should be targeted to narrow down the possibilities significantly. Avoid generic questions like "anything else?". Be direct and concise. Ask only one question.

Conversation:
---
${historyText}
---

Your single, critical clarifying question:`;
    return await generateText(prompt);
};

// LangGraph Simulation: Node 2b (Triage Agent)
const provideTriageRecommendation = async (historyText: string): Promise<string> => {
    const prompt = `You are a helpful medical assistant. Based on the detailed conversation with a patient, your task is to provide a final care recommendation.

Conversation:
---
${historyText}
---

Your response must strictly follow this structure:
1.  A clear recommendation. It MUST be one of these three options: 'Self-care', 'Telehealth Consultation', or 'Urgent Care'.
2.  A brief, easy-to-understand explanation for your recommendation based on the symptoms provided.
3.  A clear disclaimer: "Please remember, this is not a medical diagnosis. Consult with a qualified healthcare professional for any medical advice."

After the disclaimer, add a new line with the following exact format:
SPECIALTY: [The most relevant specialty, e.g., Cardiology, Dermatology, General Physician]

Do not provide a medical diagnosis or prescribe medication.`;
    return await generateText(prompt);
};

export const runSymptomTriageGraph = async (history: Message[]): Promise<TriageResult> => {
    // This function orchestrates the graph logic.
    const historyText = formatHistoryForPrompt(history);
    // The initial AI message is a greeting, not a question. So we subtract it from the count.
    const assistantTurns = history.filter(msg => msg.sender === 'ai').length - 1;
    const route = await routeSymptomQuery(historyText, assistantTurns);

    console.log(`[LangGraph Simulation] Route: ${route}, Turns: ${assistantTurns}`);

    if (route === 'TRIAGE') {
        const fullResponse = await provideTriageRecommendation(historyText);
        const specialtyMatch = fullResponse.match(/SPECIALTY:\s*(.*)/);
        const specialty = specialtyMatch ? specialtyMatch[1].trim() : undefined;
        const text = fullResponse.replace(/SPECIALTY:\s*(.*)/, '').trim();

        return { decision: 'TRIAGE', text, specialty };
    } else {
        const text = await askClarifyingQuestion(historyText);
        return { decision: 'CLARIFY', text };
    }
};

export const extractInfoFromReport = async (imageData: { mimeType: string; data: string }): Promise<ExtractedReportData> => {
  const imagePart = {
    inlineData: {
      mimeType: imageData.mimeType,
      data: imageData.data,
    },
  };

  const textPart = {
    text: `Analyze the attached medical report image. Extract the key medical summary and any patient profile information you can find.`,
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise summary of the report including Doctor's Name, Key Symptoms/Diagnosis, Prescribed Medications, and Follow-up recommendations. Use bullet points with \\n for newlines."
            },
            specialty: {
              type: Type.STRING,
              description: "The single most relevant medical specialty for a follow-up (e.g., Cardiology, Dermatology)."
            },
            bookAppointment: {
              type: Type.BOOLEAN,
              description: "Set to true if a follow-up is recommended or makes sense based on the report."
            },
            patientProfile: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Patient's Full Name (if available). If not found, return an empty string." },
                dob: { type: Type.STRING, description: "Patient's Date of Birth in YYYY-MM-DD format (if available). If not found, return an empty string." },
                bloodType: { type: Type.STRING, description: "Patient's Blood Type (if available). If not found, return an empty string." },
                allergies: { type: Type.STRING, description: "A comma-separated list of patient's allergies (if available). If not found, return an empty string." },
              },
            }
          },
          required: ["summary", "specialty", "bookAppointment", "patientProfile"]
        }
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Gemini API error in extractInfoFromReport:", error);
    return {
        summary: "Sorry, I couldn't read the medical report. Please ensure it's a clear image.",
        specialty: "",
        bookAppointment: false,
        patientProfile: {},
    };
  }
};


export const summarizeDocument = async (text: string): Promise<string> => {
  const prompt = `Summarize the following medical document. Extract key information such as diagnosed conditions, major surgeries, allergies, and current medications into a clear, concise summary. Use bullet points for lists. Medical document: "${text}"`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API error in summarizeDocument:", error);
    return "Could not summarize document.";
  }
};

export const checkDrugInteractions = async (meds: string[]): Promise<string> => {
  if (meds.length < 2) return "Please provide at least two medications to check for interactions.";
  const prompt = `Research and identify any potential moderate to severe drug interactions for the following list of medications: ${meds.join(', ')}. For each potential interaction, provide a brief, easy-to-understand explanation. If no significant interactions are found, state that clearly.`;
   try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API error in checkDrugInteractions:", error);
    return "Could not check for drug interactions at this time.";
  }
};

export const analyzeConsultationNotes = async (imageData: { mimeType: string; data: string }): Promise<{ summary: string; actionItems: string[] }> => {
  const imagePart = {
    inlineData: {
      mimeType: imageData.mimeType,
      data: imageData.data,
    },
  };

  const textPart = {
    text: `You are an AI Scribe. Analyze the attached doctor's consultation notes image. First, provide a concise summary of the consultation. Second, extract all patient action items into a list. If there are no clear action items, return an empty list for actionItems.`,
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise summary of the consultation from the notes."
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              },
              description: "A list of patient action items extracted from the notes. Return an empty array if none are found."
            }
          },
          required: ["summary", "actionItems"]
        }
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Gemini API error in analyzeConsultationNotes:", error);
    return { summary: "Could not analyze the consultation notes from the image.", actionItems: [] };
  }
};

export const getHealthInsight = async (diaryEntry: string): Promise<string> => {
    const prompt = `Based on the following patient diary entry, provide a short, personalized health tip and a motivational message. The tone should be supportive and encouraging. Diary entry: "${diaryEntry}"`;
     try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API error in getHealthInsight:", error);
        return "Could not generate a health insight at this moment.";
    }
};