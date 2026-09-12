import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * AI assistant backend — modeled on OpenPencil's BYOK AI chat
 * (upstream/src/app/ai/providers): the user's own provider key is used
 * server-side and never stored. Supports OpenRouter (default), OpenAI,
 * and Anthropic-compatible endpoints.
 */

const SYSTEM_PROMPT = `You are Node's design assistant, embedded in a browser-based vector design editor. You modify the user's design by returning JSON plans.

Respond with ONLY a JSON object (no markdown fences, no prose before or after):
{
  "say": "<one or two friendly sentences about what you did>",
  "ops": [ ... ]
}

Op schema:
- {"op":"create","type":"frame|rect|ellipse|line|arrow|text|polygon","name":"...",x,y,w,h,"fill":"#hex","stroke":"#hex","radius":n,"opacity":0..1}
- {"op":"update","id":"<node id>","<field>":value, ...}
- {"op":"delete","id":"<node id>"}

Rules:
- Canvas coords: x right, y down. Stay within 0..1200 x 0..800 unless asked.
- Create text nodes with explicit w. Every create op must include x, y, w, h (line/arrow: h 0).
- Colors as hex (#8b5cf6 is the app's accent violet).
- To restyle existing nodes, use update with their id from the provided selection/document list.
- Keep plans small: 1-15 ops. No comments, no trailing commas.`;

export const chat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    apiKey: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    context: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const key = args.apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error(
        "No AI key available. Add your OpenRouter API key in Settings, or set OPENROUTER_API_KEY.",
      );
    }
    const provider = args.provider ?? "openrouter";
    const model = args.model ?? "anthropic/claude-3.5-sonnet";

    const endpoints: Record<string, string> = {
      openrouter: "https://openrouter.ai/api/v1/chat/completions",
      openai: "https://api.openai.com/v1/chat/completions",
      anthropic: "https://api.anthropic.com/v1/messages",
    };
    const url = endpoints[provider] ?? endpoints.openrouter;

    const msgs = args.context
      ? [{ role: "user" as const, content: args.context }, ...args.messages]
      : args.messages;

    let body: unknown;
    let headers: Record<string, string>;
    if (provider === "anthropic") {
      headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      };
      body = {
        model: model.includes("/") ? model.split("/")[1] : model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: msgs,
      };
    } else {
      headers = {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      };
      body = {
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...msgs],
        max_tokens: 2048,
        temperature: 0.4,
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `AI provider error ${res.status}: ${text.slice(0, 300) || res.statusText}`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      content?: { text?: string }[];
    };
    const content =
      data.choices?.[0]?.message?.content ?? data.content?.[0]?.text ?? "";
    if (!content) throw new Error("AI provider returned an empty response.");
    return content;
  },
});
