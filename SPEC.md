# Junto — Multi-Model Thinking MCP Server

> "Junto" — named after Benjamin Franklin's club for mutual improvement. A group of diverse minds, convened to think better together.

## What Is This?

An MCP server tool that orchestrates multiple frontier AI models (GPT-5.2, Gemini, Grok, Claude) to provide deeper, more robust thinking for high-stakes decisions. It runs models in parallel and synthesizes their outputs into a more considered answer than any single model would produce.

**Depth over speed. Confidence in high-stakes moments.**

## Who Is This For?

Power users — founders, engineers, researchers, builders — who makes consequential decisions and wants to stress-test their thinking. The kind of person who would convene a room of smart advisors before making a big call, except the advisors are frontier AI models.

## Core Value Proposition

Better quality thinking on hard problems by harnessing the collective intelligence of multiple frontier models. When you invoke `think`, you get back an answer that:

- Has been independently considered by 4 different model architectures from 4 different providers
- Cross-references reasoning across models (consensus = higher confidence)
- Filters out individual model hallucinations or weak spots
- Synthesizes the strongest elements into a single, polished response

---

## Architecture

### How It Works

```
User prompt
    │
    ├──→ GPT-5.2 (reasoning: high) ──→ response 1 ─┐
    ├──→ Gemini 3 Pro              ──→ response 2 ─┤
    ├──→ Grok 4                    ──→ response 3 ─┤  (all 4 in parallel)
    └──→ Claude Opus 4.6           ──→ response 4 ─┘
                                                     │
         Consolidator (Claude Opus 4.6) ◄────────────┘
         receives: original prompt + all 4 + synthesis meta-prompt
              │
              ▼
         Single synthesized answer
```

5 API calls per query. All through OpenRouter.

### Model Panel

All models are accessed through **OpenRouter** (`https://openrouter.ai/api/v1`), providing a single API key and billing point. 4 providers for maximum architectural diversity.

| Role | Model | OpenRouter ID | Config |
|------|-------|---------------|--------|
| Thinker 1 | OpenAI GPT-5.2 | `openai/gpt-5.2` | `reasoning.effort: "high"` |
| Thinker 2 | Google Gemini 3 Pro | `google/gemini-3-pro-preview` | — |
| Thinker 3 | xAI Grok 4 | `x-ai/grok-4` | — |
| Thinker 4 | Anthropic Claude Opus 4.6 | `anthropic/claude-opus-4-6` | — |
| **Consolidator** | Anthropic Claude Opus 4.6 | `anthropic/claude-opus-4-6` | — |

**Why these models?** Architectural diversity maximizes the value of parallel thinking. Each model comes from a different company with different training data, RLHF approaches, and capability profiles. The consolidator uses Opus 4.5 because synthesis requires the deepest judgment.

**GPT-5.2 reasoning:** Reasoning is OFF by default on GPT-5.2 — you must explicitly set `reasoning.effort`. We use `"high"`, which allocates ~80% of the token budget to chain-of-thought reasoning. This is the whole point: depth over speed.

**Cost estimate:** ~$0.10–$0.50 per query depending on prompt/response length. Pro mode with GPT-5.2 Pro is significantly more expensive (~12x for the GPT slot).

### Pro Mode

A single optional boolean toggles the GPT slot:

- **Standard (`pro: false`):** Uses `openai/gpt-5.2`
- **Pro (`pro: true`):** Uses `openai/gpt-5.2-pro` — reasoning is mandatory (minimum medium effort), 12x more expensive. For exceptional prompts only.

### The Synthesis Prompt

The core meta-prompt that instructs the consolidator to synthesize responses:

```
Your task:

<taskInstructions>
{original_prompt}
</taskInstructions>

<responses>

<1>
{response}
</1>

<2>
{response}
</2>

<3>
{response}
</3>

<4>
{response}
</4>

</responses>

4 AI models have already attempted to complete this task.

Notes on the AI responses:

- They are from different AI models with different architectures, capabilities,
  training datasets, and training data cutoff dates.
- Some responses might include out-of-date information, incorrect information,
  or "hallucinations" — all else being equal, information shared by more models
  is likely to be more reliable.
- For tasks requiring sophisticated reasoning or writing code: some, most, or
  even all responses may contain errors. Even if all models have consensus on
  something, they might still be wrong.
- Less is sometimes more: the best possible response _might_ be more
  concise/incisive than any of the responses.

Therefore:

- You may choose to incorporate elements from one or more responses, or
  choose/tweak the best one, or start from scratch.
- Think critically. Use good judgment.

Do not reference the other AI responses in your final consolidated response.
You may format with markdown if helpful. No preamble if possible, although
you may use <thinking> tags as much as you want if it'll help.

Now, complete the task:
```

### MCP Tool Interface

**Server name:** `junto`
**Tool name:** `think`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | yes | The question, task, or decision to think deeply about |
| `pro` | boolean | no (default: false) | Use GPT-5.2 Pro — 12x more expensive, for exceptional prompts only |

Returns: The consolidated response as text content.

### Environment Variable Overrides

| Env Var | Default | Purpose |
|---------|---------|---------|
| `OPENROUTER_API_KEY` | (required) | OpenRouter API key |
| `JUNTO_GPT_MODEL` | `openai/gpt-5.2` | Override the GPT model slot |
| `JUNTO_GPT_PRO_MODEL` | `openai/gpt-5.2-pro` | Override the GPT Pro model slot |

So when GPT-5.3 drops, you just change the env var — no code changes needed.

---

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js (ES modules) | MCP SDK is TypeScript-first |
| Language | TypeScript | Type safety, SDK compatibility |
| MCP SDK | `@modelcontextprotocol/sdk` v1.25.x | Official SDK, latest stable |
| Schema validation | Zod v3 | Required by MCP SDK |
| AI API | OpenRouter | Single API for all models, OpenAI-compatible |
| HTTP client | Native `fetch` | Available in Node.js 18+, no extra deps |
| Transport | stdio | Standard for local MCP servers |

### Project Structure

```
junto/
├── src/
│   ├── index.ts              # Entry point — creates MCP server, registers tool
│   ├── orchestrator.ts       # Core logic — parallel fan-out + synthesis
│   ├── openrouter.ts         # OpenRouter API client (with reasoning support)
│   ├── prompts.ts            # Synthesis prompt template
│   └── config.ts             # Model panel configuration, defaults, env overrides
├── package.json
├── tsconfig.json
├── .env.example
├── SPEC.md                   # This file
└── README.md
```

---

## Design Principles

1. **Depth over speed.** The tool takes ~60-90 seconds. That's the point — it's for decisions worth waiting for.

2. **Graceful degradation.** If 1-3 models fail (timeout, rate limit), the tool still consolidates from whatever responded. Only errors if ALL 4 fail.

3. **Single dependency.** OpenRouter is the only integration. One key, one bill.

4. **Model-blind consolidation.** The synthesis prompt hides the names of the other models to prevent potential bias.

---

## Scope

**In scope (v1):**
- Local stdio MCP server
- 4-model parallel fan-out + consolidation
- `pro` toggle for GPT-5.2 Pro
- GPT-5.2 reasoning effort set to `high`
- Env var overrides for model IDs
- Graceful degradation on partial failures

**Non-goal (v1):**
- Hosted MCP / key management / web UX
- Streaming responses
- Model selection UI
- Configurable model panel beyond env vars

---

## Future Considerations

- **Hosted deployment:** Streamable HTTP transport on Cloudflare Workers, with API key passed via header. A simple landing page for config generation. 
- **Streaming:** Stream the consolidation step to improve perceived latency.
- **Transparency mode:** Option to return individual model responses alongside the synthesis.
- **Extended thinking for other models:** Enable reasoning parameters for Grok, Gemini, etc. where supported.

Contributions welcome.
