# Junto

> Multi-model thinking for high-stakes decisions.

Junto is an MCP server that orchestrates multiple frontier AI models in parallel and synthesizes their outputs into a single, deeply considered answer. Named after [Benjamin Franklin's Junto Club](https://en.wikipedia.org/wiki/Junto_(club)) — a group of diverse minds, convened to think better together.

## How It Works

When you invoke the `think` tool:

1. **Fan out** — Your prompt is sent to 4 frontier models simultaneously (GPT-5.2, Gemini 3 Pro, Grok 4, Claude Opus 4.5)
2. **Collect** — All responses are gathered (with graceful degradation if any model fails)
3. **Synthesize** — A consolidator model (Claude Opus 4.5) receives all responses + a meta-prompt instructing it to critically evaluate, cross-reference, and produce the best possible answer
4. **Return** — You get one answer, better than any single model would produce

**Cost:** ~$0.10–$0.50 per query (standard). Pro mode with GPT-5.2 Pro is significantly more expensive.

## Quick Start

### Prerequisites

- Node.js 18+
- An [OpenRouter](https://openrouter.ai) API key ([get one here](https://openrouter.ai/keys))

### Install & Configure

Add Junto to your MCP client config:

**Claude Code** — edit `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "junto": {
      "command": "npx",
      "args": ["-y", "junto-mcp"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-key-here"
      }
    }
  }
}
```

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json` with the same structure.

**Cursor** — edit `~/.cursor/mcp.json` with the same structure.

### Set the Timeout

Junto's pipeline takes **~60–90 seconds** (4 models in parallel + consolidation). Most MCP clients default to a 60-second tool timeout, which isn't enough.

**Claude Code** — add to your shell profile (`.zshrc` / `.bashrc`):

```bash
export MCP_TOOL_TIMEOUT=300000  # 5 minutes, in milliseconds
```

Junto sends MCP progress notifications during execution to keep the connection alive, but setting `MCP_TOOL_TIMEOUT` is the reliable safety net.

**Claude Desktop** — does not currently support configurable tool timeouts. Junto's progress notifications should prevent timeouts in most cases.

### Use It

In your AI assistant, just ask it to use the think tool:

> "Use the think tool to help me decide whether to raise a seed round or bootstrap."

> "Think deeply about the trade-offs between microservices and a monolith for our 3-person team."

> "I need to make a critical architecture decision. Use think to evaluate: should we use PostgreSQL or DynamoDB for our event sourcing system?"

For exceptional prompts, use pro mode:

> "Use think with pro=true to evaluate this term sheet."

## Model Panel

| Role | Model | Why |
|------|-------|-----|
| Thinker 1 | GPT-5.2 | Reasoning effort set to "high" — deep chain-of-thought |
| Thinker 2 | Gemini 3 Pro | #1 on LMArena, multimodal-native architecture |
| Thinker 3 | Grok 4 | xAI's frontier model — different training philosophy |
| Thinker 4 | Claude Opus 4.5 | Deepest reasoning capability from Anthropic |
| **Consolidator** | Claude Opus 4.5 | Best at synthesis and critical judgment |

4 different providers (OpenAI, Google, xAI, Anthropic) for maximum architectural diversity.

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | (required) | The question or decision to think deeply about |
| `pro` | boolean | `false` | Use GPT-5.2 Pro instead of GPT-5.2. 12x more expensive — for exceptional prompts only. |

## Environment Variables

| Env Var | Default | Description |
|---------|---------|-------------|
| `OPENROUTER_API_KEY` | (required) | Your OpenRouter API key |
| `JUNTO_GPT_MODEL` | `openai/gpt-5.2` | Override the GPT model slot |
| `JUNTO_GPT_PRO_MODEL` | `openai/gpt-5.2-pro` | Override the GPT Pro model slot |

The env var overrides let you bump to a newer model (e.g., GPT-5.3) without code changes.

## Development

```bash
# Clone and install
git clone https://github.com/daviddbwilson/junto.git
cd junto
npm install

# Set your API key
export OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Build
npm run build

# Run the MCP server (stdio)
npm start

# Test the orchestrator directly
node build/test-think.js "Your prompt here"

# Test with pro mode
node build/test-think.js "Your prompt here" --pro

# Watch mode for development
npm run dev
```

## Claude Code Skill

Junto ships with a [SKILL.md](./SKILL.md) that teaches Claude Code when to automatically invoke the `think` tool. To install it:

```bash
# Symlink the skill into Claude Code's skills directory
mkdir -p ~/.claude/skills
ln -s /path/to/junto/SKILL.md ~/.claude/skills/junto/SKILL.md
```

Or just copy `SKILL.md` into `~/.claude/skills/junto/`. Once installed, Claude Code will proactively use Junto when you face high-stakes decisions.

## Architecture

See [SPEC.md](./SPEC.md) for full architecture documentation and design decisions.

## License

MIT
