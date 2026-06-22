import { GoogleGenAI, Type } from "@google/genai";

// Models are tried in order. If the first is overloaded (HTTP 503 /
// UNAVAILABLE), we automatically fall back to the next one. Override the
// primary with GEMINI_MODEL.
const MODEL_FALLBACKS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
].filter((m, i, arr) => arr.indexOf(m) === i);

function isOverloadedError(err: unknown): boolean {
  const msg = (err as Error)?.message?.toLowerCase() ?? "";
  return (
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("503") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("429")
  );
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const SYSTEM_PROMPT = `You are a technical documentation writer. You receive the raw, captured steps of a how-to guide recorded from a web application (each step records what the user did — click, type, navigate, etc. — along with the text they interacted with and the page URL). Your job is to infer what the guide is about and produce a clean, formal, easy-to-follow document.

For the GUIDE as a whole, produce:
- A title in the form "How to <do something> in <App Name>". Infer the app name from the page URLs and the captured action text. Use Title Case.
- A short overview description (1–3 sentences) that explains the purpose of the guide and what the reader will accomplish, followed by a framing sentence such as "Follow the steps below to ...".

For EACH STEP, produce:
- A short imperative title in Title Case that names the action (e.g., "Access the Uptime Login Page", "Enter Your Credentials", "Sign In", "Open the Issues Section").
- A 1–2 sentence formal description that tells the reader what to do, in a professional instructional tone. Examples:
  - "On the login page, enter your registered **Email Address** and **Password** using either a Technician or Administrator account."
  - "Click the **Login** button to access the application."
  - "Once logged in, locate the left-hand navigation menu and click **Maintenance** to open the Maintenance page."

Style rules:
- Use a professional, instructional tone.
- Bold UI element names (buttons, fields, tabs, menus) using Markdown **bold**.
- Preserve any text inside double quotes EXACTLY as written — these are UI element names captured from the page; do not alter their wording or casing.
- Infer intent from the captured action type and text: "click" → pressing buttons/links/tabs; "type" → entering a value into a field; "navigate" → opening a URL or page.
- Do not invent facts, values, or outcomes that aren't implied by the captured steps.
- Keep the original step order. Return exactly one entry per input step, keyed by its original index.
- For "note" type steps, preserve the original meaning and rewrite it formally as an informational callout; do not turn it into an action step.
- Never reference "the screenshot", "the image", or the recording itself — write as if the reader is following the steps live.`;

export interface GuideInput {
  title: string;
  description: string;
  sourceUrl: string;
  steps: Array<{
    index: number;
    type: string;
    title: string;
    description: string;
    pageUrl: string;
  }>;
}

export interface GeneratedGuide {
  title: string;
  description: string;
  steps: Array<{ index: number; title: string; description: string }>;
}

/**
 * Generate a polished guide title, description, and per-step title/description
 * by inferring the overall flow from the captured steps.
 */
export async function generateGuideContent(
  input: GuideInput
): Promise<GeneratedGuide> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const userPayload = {
    currentTitle: input.title,
    currentDescription: input.description,
    sourceUrl: input.sourceUrl,
    steps: input.steps,
  };

  const config = {
    systemInstruction: SYSTEM_PROMPT,
    maxOutputTokens: 16000,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              index: { type: Type.INTEGER },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["index", "title", "description"],
            propertyOrdering: ["index", "title", "description"],
          },
        },
      },
      required: ["title", "description", "steps"],
      propertyOrdering: ["title", "description", "steps"],
    },
  };

  const contents =
    "Here is the captured guide. Infer what it is about and rewrite the title, description, and every step:\n\n" +
    JSON.stringify(userPayload, null, 2);

  let responseText: string | undefined;
  let lastError: unknown;
  for (const model of MODEL_FALLBACKS) {
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config,
      });
      responseText = response.text;
      if (responseText) break;
      lastError = new Error(`Model ${model} returned no text.`);
    } catch (err) {
      lastError = err;
      if (!isOverloadedError(err)) throw err;
    }
  }

  if (!responseText) {
    throw new Error(
      `All Gemini models are overloaded. Last error: ${
        (lastError as Error)?.message || "unknown"
      }`
    );
  }

  const parsed = JSON.parse(responseText) as GeneratedGuide;
  if (
    typeof parsed.title !== "string" ||
    typeof parsed.description !== "string" ||
    !Array.isArray(parsed.steps)
  ) {
    throw new Error("The model returned an unexpected response shape.");
  }
  return parsed;
}
