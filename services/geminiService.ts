import { GoogleGenAI, Type } from "@google/genai";
import { Paper, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = "gemini-2.5-flash";

/**
 * Converts a user's natural language idea into a structured Arxiv API query.
 */
export const generateArxivQuery = async (userIdea: string): Promise<string> => {
  try {
    const prompt = `
      You are an expert academic researcher. 
      Convert the following user idea into a simplified, effective search query string optimized for the arXiv API.
      
      User Idea: "${userIdea}"
      
      Rules:
      1. Use standard Boolean operators (AND, OR) if necessary.
      2. Focus on the most important keywords.
      3. Use prefixes like 'all:' (all fields), 'ti:' (title), or 'abs:' (abstract) if specific targeting helps, but 'all:' is usually safest.
      4. Keep it concise to avoid zero results.
      5. Output ONLY the query string, no explanation. Do not add "search_query=" prefix.
      
      Example Input: "Machine learning for predicting stock prices using transformers"
      Example Output: all:"stock price" AND all:transformer AND (all:"machine learning" OR all:"deep learning")
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });

    return response.text?.trim() || userIdea;
  } catch (error) {
    console.error("Error generating query:", error);
    // Fallback to simple keyword extraction if AI fails
    return `all:${userIdea.split(' ').slice(0, 3).join(' AND all:')}`;
  }
};

/**
 * Analyzes a list of papers to provide insights relative to the user's original idea.
 */
export const analyzePapers = async (userIdea: string, papers: Paper[]): Promise<AnalysisResult> => {
  if (papers.length === 0) {
    return { summary: "No papers found.", keyTrends: [], suggestedDirections: [] };
  }

  // Prepare a condensed list for the context window
  const papersContext = papers.slice(0, 10).map((p, i) => 
    `[${i+1}] Title: ${p.title}\nAbstract: ${p.summary.substring(0, 300)}...`
  ).join("\n\n");

  const prompt = `
    User Idea: "${userIdea}"
    
    Here are top research papers found for this idea:
    ${papersContext}
    
    Task:
    1. Summarize how these papers address the user's idea in 1-2 sentences.
    2. Identify 3 key technical trends or methodologies mentioned.
    3. Suggest 2 potential future research directions or gaps based on these papers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyTrends: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedDirections: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "keyTrends", "suggestedDirections"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("No text response from Gemini");
  } catch (error) {
    console.error("Error analyzing papers:", error);
    return {
      summary: "Could not generate analysis at this time.",
      keyTrends: [],
      suggestedDirections: []
    };
  }
};
