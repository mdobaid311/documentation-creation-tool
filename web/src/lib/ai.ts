import Anthropic from "@anthropic-ai/sdk";

// Default to the most capable Claude model. Override with ANTHROPIC_MODEL if needed.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You are a technical documentation editor. You rewrite the instruction text for steps in a how-to guide.

For each step, produce a clear, formal, easy-to-understand instruction:
- Use a professional, instructional tone (e.g. "Click the ... button to ...").
- Keep it concise — one sentence where possible, never more than two.
- Preserve any text inside double quotes EXACTLY as written; these are UI element names (buttons, fields, menus) and must not be changed.
- Do not invent steps, details, values, or outcomes that are not implied by the original text.
- Keep the original meaning and the original order.

Return the rewritten text for every step, keyed by its original index.`;

/**
 * Rephrase a list of step instructions to be formal and understandable.
 * Returns a new array the same length/order as the input; on any per-item
 * failure the original text is kept.
 */
export async function rephraseSteps(texts: string[]): Promise<string[]> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  const numbered = texts.map((text, index) => ({ index, text }));

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content:
          "Rephrase each of these step instructions:\n\n" +
          JSON.stringify(numbered, null, 2),
      },
    ],
    // Structured output: guarantees the first text block is valid JSON
    // matching this schema, so we can map results back by index.
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  text: { type: "string" },
                },
                required: ["index", "text"],
                additionalProperties: false,
              },
            },
          },
          required: ["steps"],
          additionalProperties: false,
        },
      },
    },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model returned no text.");
  }

  const parsed = JSON.parse(textBlock.text) as {
    steps: { index: number; text: string }[];
  };

  const result = [...texts];
  for (const item of parsed.steps ?? []) {
    if (
      Number.isInteger(item.index) &&
      item.index >= 0 &&
      item.index < result.length &&
      typeof item.text === "string" &&
      item.text.trim()
    ) {
      result[item.index] = item.text.trim();
    }
  }
  return result;
}
