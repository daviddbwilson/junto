#!/usr/bin/env node

/**
 * Manual test script for the Junto orchestrator.
 * Exercises the full pipeline: fan-out → collect → consolidate.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... npx tsx src/test-think.ts
 *
 * Or after building:
 *   OPENROUTER_API_KEY=sk-or-... node build/test-think.js
 */

import { loadConfig } from "./config.js";
import { think } from "./orchestrator.js";

async function main() {
  const config = loadConfig();

  const prompt =
    process.argv[2] ||
    "What are the three most important things a first-time founder should know about fundraising that are counterintuitive or non-obvious?";

  console.log("═".repeat(60));
  console.log("JUNTO TEST — Multi-Model Deep Thinking");
  console.log("═".repeat(60));
  console.log(`\nPrompt: ${prompt}\n`);
  console.log("─".repeat(60));

  const startTime = Date.now();

  const pro = process.argv.includes("--pro");
  const result = await think(config, prompt, pro, (msg: string) => {
    console.log(msg);
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "═".repeat(60));
  console.log("CONSOLIDATED ANSWER");
  console.log("═".repeat(60));
  console.log(result.answer);

  if (result.failures.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log("FAILURES:");
    result.failures.forEach((f) => console.log(`  ${f.model}: ${f.error}`));
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Models consulted: ${result.individualResponses.length}`);
  console.log(`Models failed: ${result.failures.length}`);
  console.log(`Total time: ${elapsed}s`);
  console.log("─".repeat(60));
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
