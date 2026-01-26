/**
 * The synthesis prompt — the core intellectual mechanism of Junto.
 *
 * This prompt is sent to the consolidator model along with the original
 * user prompt and all thinker responses. It instructs the consolidator
 * to critically evaluate, cross-reference, and synthesize the best answer.
 */

export interface ModelResponse {
  label: string;
  content: string;
}

/**
 * Build the consolidation prompt that the synthesizer model receives.
 *
 * The prompt structure:
 * 1. The original user task
 * 2. All model responses, numbered and labeled
 * 3. Meta-instructions for critical synthesis
 */
export function buildConsolidationPrompt(
  originalPrompt: string,
  responses: ModelResponse[]
): string {
  const numberedResponses = responses
    .map(
      (r, i) =>
        `<${i + 1} model="${r.label}">\n${r.content}\n</${i + 1}>`
    )
    .join("\n\n");

  return `Your task:

<taskInstructions>
${originalPrompt}
</taskInstructions>

<responses>

${numberedResponses}

</responses>

${responses.length} AI models have already attempted to complete this task.

Notes on the AI responses:

- They are from different AI models with different architectures, capabilities, training datasets, and training data cutoff dates.
- Some responses might include out-of-date information, incorrect information, or "hallucinations" — all else being equal, information shared by more models is likely to be more reliable.
- For tasks requiring sophisticated reasoning or writing code: some, most, or even all responses may contain errors. Even if all models have consensus on something, they might still be wrong.
- Less is sometimes more: the best possible response _might_ be more concise/incisive than any of the responses.

Therefore:

- You may choose to incorporate elements from one or more responses, or choose/tweak the best one, or start from scratch.
- Think critically. Use good judgment.

Do not reference the other AI responses in your final consolidated response. You may format with markdown if helpful. No preamble if possible, although you may use <thinking> tags as much as you want if it'll help.

Now, complete the task:`;
}
