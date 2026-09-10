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

// Lazily create the client so a missing key only errors when an AI route is
// actually called — not at import time (which would break `next build` and any
// deploy while the AI keys are intentionally disabled).
let client = null;

const getClient = () => {
  if (client) return client;
  const apiKey = getAPIKey("details");
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }
  client = new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.OPEN_AI_BASE_URL,
    maxRetries: 0,
  });
  return client;
};

// Proxy defers instantiation until the first property access at request time.
const openai = new Proxy(
  {},
  {
    get: (_target, prop) => getClient()[prop],
  }
);

export default openai;
