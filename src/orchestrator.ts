/**
 * The orchestrator — Junto's brain.
 *
 * Handles the full pipeline:
 * 1. Fan out the user's prompt to all thinker models in parallel
 * 2. Collect responses (with graceful degradation on failures)
 * 3. Send everything to the consolidator for synthesis
 * 4. Return the final answer
 */

import { chatCompletion } from "./openrouter.js";
import { buildConsolidationPrompt, type ModelResponse } from "./prompts.js";
import { buildPanel, type JuntoConfig, type ModelConfig } from "./config.js";

export interface ThinkResult {
  /** The final consolidated response. */
  answer: string;
  /** Individual model responses (for debugging/transparency). */
  individualResponses: ModelResponse[];
  /** Models that failed, if any. */
  failures: { model: string; error: string }[];
}

/**
 * Query a single thinker model. Returns the response text or throws.
 */
async function queryThinker(
  config: JuntoConfig,
  model: ModelConfig,
  prompt: string
): Promise<string> {
  const response = await chatCompletion(
    config.openrouterApiKey,
    {
      model: model.id,
      messages: [{ role: "user", content: prompt }],
      reasoning: model.reasoning,
    },
    config.timeoutMs
  );

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty response from ${model.label}`);
  }
  return content;
}

/**
 * Run the full Junto thinking pipeline.
 *
 * Fans out to all thinkers in parallel, collects their responses,
 * and sends them to the consolidator for synthesis.
 *
 * If some thinkers fail, we still consolidate from the remaining responses.
 * If ALL thinkers fail, we throw an error.
 *
 * @param pro - If true, swaps the GPT slot to GPT-5.2 Pro (much more expensive).
 */
export async function think(
  config: JuntoConfig,
  prompt: string,
  pro: boolean = false,
  onProgress?: (message: string) => void | Promise<void>
): Promise<ThinkResult> {
  const panel = buildPanel(pro);
  const log = onProgress ? async (msg: string) => { await onProgress(msg); }
                         : async (_msg: string) => {};

  // --- Phase 1: Fan out to all thinkers in parallel ---

  const modeLabel = pro ? " [PRO MODE]" : "";
  await log(
    `Consulting ${panel.thinkers.length} models${modeLabel}: ${panel.thinkers.map((t) => t.label).join(", ")}...`
  );

  const thinkerResults = await Promise.allSettled(
    panel.thinkers.map(async (model) => {
      const content = await queryThinker(config, model, prompt);
      await log(`  ✓ ${model.label} responded (${content.length} chars)`);
      return { label: model.label, content };
    })
  );

  // Separate successes and failures
  const responses: ModelResponse[] = [];
  const failures: { model: string; error: string }[] = [];

  thinkerResults.forEach((result, i) => {
    if (result.status === "fulfilled") {
      responses.push(result.value);
    } else {
      const model = panel.thinkers[i];
      const errorMsg =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      failures.push({ model: model.label, error: errorMsg });
    }
  });

  if (responses.length === 0) {
    throw new Error(
      "All thinker models failed. Cannot consolidate.\n" +
        failures.map((f) => `  ${f.model}: ${f.error}`).join("\n")
    );
  }

  // --- Phase 2: Consolidate ---

  await log(
    `Consolidating ${responses.length} responses with ${panel.consolidator.label}...`
  );

  const consolidationPrompt = buildConsolidationPrompt(prompt, responses);

  const consolidationResponse = await chatCompletion(
    config.openrouterApiKey,
    {
      model: panel.consolidator.id,
      messages: [{ role: "user", content: consolidationPrompt }],
    },
    config.timeoutMs
  );

  const answer = consolidationResponse.choices?.[0]?.message?.content;
  if (!answer) {
    throw new Error("Consolidator returned an empty response.");
  }

  await log(`✓ Consolidation complete.`);

  // Strip <thinking> tags from the final output — these are for the model's
  // internal reasoning and shouldn't appear in the user-facing response.
  const cleanAnswer = answer.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, "");

  return {
    answer: cleanAnswer.trim(),
    individualResponses: responses,
    failures,
  };
}
