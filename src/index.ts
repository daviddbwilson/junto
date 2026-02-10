#!/usr/bin/env node

/**
 * Junto MCP Server
 *
 * An MCP server that orchestrates multiple frontier AI models to provide
 * deeper, more robust thinking for high-stakes decisions.
 *
 * Usage (stdio transport — for local MCP clients):
 *   OPENROUTER_API_KEY=sk-or-... node build/index.js
 *
 * Or via npx in your MCP client config:
 *   { "command": "npx", "args": ["-y", "junto-mcp"], "env": { "OPENROUTER_API_KEY": "..." } }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig, buildPanel } from "./config.js";
import { think } from "./orchestrator.js";

const config = loadConfig();

const server = new McpServer({
  name: "junto",
  version: "0.1.0",
});

server.registerTool(
  "think",
  {
    title: "Junto — Multi-Model Deep Thinking",
    description:
      "Consult multiple frontier AI models (GPT-5.2, Gemini 3 Pro, Grok 4, Claude Opus 4.6) " +
      "in parallel and synthesize their responses into a single, deeply considered answer. " +
      "Use this for high-stakes decisions, complex reasoning, or when you want more confidence " +
      "in an answer than a single model can provide. " +
      "Set pro=true to use GPT-5.2 Pro (5-10X slower and more expensive — for exceptional situations only).",
    inputSchema: {
      prompt: z
        .string()
        .describe(
          "The question, task, or decision to think deeply about. Pass in the user's prompt (plus all relevant context) as-is. DO NOT rewrite the user's prompt.",
        ),
      pro: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Use GPT-5.2 Pro instead of GPT-5.2. 5-10X slower and more expensive — for exceptional prompts only.",
        ),
    },
  },
  async ({ prompt, pro }, extra) => {
    try {
      // Send progress notifications to keep the MCP connection alive.
      // Without these, Claude Code's default 60s tool timeout kills the
      // connection before the pipeline finishes (~50-90s for real prompts).
      const progressToken = extra._meta?.progressToken;
      let step = 0;
      const totalSteps = 6; // query 4 models + consolidate + done

      const sendProgress = async (message: string) => {
        console.error(`[junto] ${message}`);
        if (progressToken) {
          await extra.sendNotification({
            method: "notifications/progress" as const,
            params: {
              progressToken,
              progress: ++step,
              total: totalSteps,
              message,
            },
          });
        }
      };

      const result = await think(config, prompt, pro, sendProgress);

      // Build the response text
      let responseText = result.answer;

      // If any models failed, note it at the end
      if (result.failures.length > 0) {
        const panel = buildPanel(pro);
        const failureNote = result.failures
          .map((f) => `${f.model}: ${f.error}`)
          .join("; ");
        responseText += `\n\n---\n_Note: ${result.failures.length} of ${panel.thinkers.length} models failed (${failureNote}). Response synthesized from ${result.individualResponses.length} models._`;
      }

      return {
        content: [{ type: "text", text: responseText }],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Junto thinking failed: ${errorMsg}`,
          },
        ],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const defaultPanel = buildPanel(false);
  console.error("[junto] MCP server running on stdio");
  console.error(
    `[junto] Panel: ${defaultPanel.thinkers.map((t) => t.label).join(", ")}`,
  );
  console.error(`[junto] Consolidator: ${defaultPanel.consolidator.label}`);
}

main().catch((error) => {
  console.error("[junto] Fatal error:", error);
  process.exit(1);
});
