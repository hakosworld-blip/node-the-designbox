// Anti-prompt-injection defenses for Vector, Node's AI design assistant.
//
// Threat model: user messages, node names, and document text are untrusted.
// They must never be able to change Vector's behavior, extract the system
// prompt, or push the model into producing anything other than the strict
// design-op JSON plan. Defense happens in layers:
//   1. Detection — flag messages that try to override Vector's instructions.
//   2. Sanitization — truncate and clean anything embedded in model context.
//   3. Whitelisting — aiOps.validateOp drops every field outside the op schema
//      (this module adds length caps and dangerous-content rejection there).

/** Patterns that indicate an attempt to hijack or override the assistant. */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts?|rules?|directions?)/i,
  /disregard\s+(all\s+|the\s+|any\s+)?(previous|prior|above|your)\s+(instructions|prompts?|rules?)/i,
  /forget\s+(everything|all|your)\s+(you|instructions|rules|training)/i,
  /(new|updated|revised|better)\s+(system\s+)?(instructions|prompt|rules)\s*[:：]/i,
  /you\s+are\s+now\s+(a|an|the)\s/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a|an)/i,
  /act\s+as\s+(a|an|if\s+you\s+are)\s/i,
  /(reveal|show|print|repeat|output|repeat\s+the\s+text\s+above)\b[^]{0,40}(system\s+prompt|initial\s+prompt|your\s+instructions|developer\s+message)/i,
  /system\s+prompt\b/i,
  /developer\s+mode\b/i,
  /\bDAN\s+mode\b/i,
  /jailbreak\b/i,
  /do\s+anything\s+now\b/i,
  /(read|fetch|download|open)\s+(the\s+)?(file|url|http)/i,
  /https?:\/\/\S+/i,
  /javascript\s*:/i,
  /<script\b/i,
  /(api[_\s-]?key|secret|password|credential)s?\s*[:：]/i,
  /(export|send|upload|exfiltrate|post)\b[^]{0,30}(data|design|file|document)\b[^]{0,30}(to|somewhere|outside)/i,
];

export interface InjectionScan {
  suspicious: boolean;
  matched: string | null;
}

/** Scan untrusted text for prompt-injection attempts. */
export function scanForInjection(text: string): InjectionScan {
  for (const re of INJECTION_PATTERNS) {
    const m = text.match(re);
    if (m) return { suspicious: true, matched: m[0].slice(0, 80) };
  }
  return { suspicious: false, matched: null };
}

/**
 * Clean untrusted text before it is embedded in model context:
 * strips control characters and collapse-able whitespace, then caps length.
 */
export function sanitizeContextText(text: string, maxLen = 200): string {
  const cleaned = text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

/** User-visible notice shown when Vector's guardrails detect tampering. */
export const INJECTION_NOTICE =
  "Security notice: Vector ignores instructions that try to override its role or access anything outside your design. It only produces design edits.";
