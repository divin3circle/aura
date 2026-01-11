import OpenAI from "openai";

const getAPIKey = (type) => {
  switch (type) {
    case "main":
      return process.env.GEMINI_API_KEY;
    case "backup":
      return process.env.BACKUP_GEMINI_API_KEY;
    case "details":
      return process.env.PRODUCT_DETAILS_GENERATION_API_KEY;
    default:
      return null;
  }
};

const apiKey = getAPIKey("details");

if (!apiKey) {
  throw new Error("OpenAI API key is not configured.");
}

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: process.env.OPEN_AI_BASE_URL,
  maxRetries: 0,
});

export default openai;
