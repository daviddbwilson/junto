---
name: junto
description: >
  Multi-model deep thinking for high-stakes decisions. Calls the Junto MCP
  "think" tool to consult 4 frontier AI models (GPT-5.2, Gemini 3 Pro,
  Grok 4, Claude Opus 4.5) in parallel and synthesize their responses.
  Use when: (1) the user says "think deeply", "use junto", "consult the
  panel", "I need to think about this", "high-stakes decision", "important
  decision", "think hard about", (2) the user faces a consequential
  decision — architecture choices, fundraising strategy, hiring decisions,
  product direction, legal/financial trade-offs, (3) the user explicitly
  asks for multi-model reasoning or wants more confidence than one model
  provides. NOT for: quick questions, simple lookups, code generation,
  or anything where speed matters more than depth.
---

## When to Use Junto

Invoke the `think` MCP tool when the stakes justify ~60-90 seconds of wait time and ~$0.10-$0.50 of cost. Good signals:

- The user explicitly asks for deep thinking or mentions Junto
- A decision is difficult to reverse (architecture, hiring, fundraising, legal)
- The user is weighing trade-offs with no obvious right answer
- Getting it wrong would be costly; getting it right matters a lot

Do NOT use Junto for routine tasks, simple code changes, or questions with clear answers.

## How to Invoke

Call the `think` MCP tool. Pass the user's prompt plus all relevant context as-is. Do NOT rewrite or summarize the user's prompt.

```
think({ prompt: "<user's full prompt with context>", pro: false })
```

- **`prompt`** (required): The question or decision. Include all relevant context — the model panel needs the same context you have.
- **`pro`** (optional, default false): Uses GPT-5.2 Pro instead of GPT-5.2. 5-10x slower and more expensive. Only for exceptional situations where the user explicitly requests maximum depth.

## Presenting Results

Return Junto's consolidated answer directly. Do not add preamble like "Here's what the panel thinks." The answer IS the answer — present it as your own response.

If models failed, the response will include a note at the end. No need to call extra attention to it.
