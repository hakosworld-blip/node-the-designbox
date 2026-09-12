# upstream/ — OpenPencil reference snapshot

Source: https://github.com/open-pencil/open-pencil (MIT License, see `LICENSE`).

This is a **read-only reference snapshot** of the OpenPencil repository (an
open-source, AI-native design editor). It is **not** bundled into Node's build,
imported by the app, or shipped to production.

It exists so Node's integrations can be modeled on OpenPencil's proven
architecture. Ported ideas (reimplemented for Node's React + Convex stack):

| OpenPencil concept | Where | Node adaptation |
| --- | --- | --- |
| `analyze colors/typography/spacing` CLI | `packages/core/src/tools/analyze/*` | `src/lib/designTokens.ts` |
| `export -f jsx --style tailwind` | `packages/core/src/io/formats/jsx/export.ts` | `src/lib/designToJsx.ts` |
| AI chat with 100+ design tools (⌘J) | `src/app/ai/*` | `src/lib/aiOps.ts` + `src/convex/ai.ts` + `src/components/AiPanel.tsx` |
| BYOK providers (OpenRouter, Anthropic, OpenAI…) | `src/app/ai/providers/*` | BYOK key per-request or `OPENROUTER_API_KEY` server-side |

To update the snapshot: download the master tarball from GitHub and extract
here. Safe to delete entirely — nothing in `src/` or `convex/` references it.
