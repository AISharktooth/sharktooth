type Citation = {
  chunk_id: string;
  excerpt: string;
};

type AnswerInput = {
  question: string;
  matches: Array<{
    ro_number: string | null;
    score: number;
    citations: Citation[];
  }>;
};

const promptTemplate = (input: AnswerInput) => {
  const lines = [
    "You are a reference-only assistant for repair orders.",
    "Summarize what the prior ROs contain that relates to the question.",
    "Do not make recommendations. Do not speculate.",
    "Every sentence must cite the chunk_id(s) it is based on.",
    "If there is insufficient data, respond with: No relevant records found.",
    "",
    `Question: ${input.question}`,
    "",
    "Context (redacted excerpts):"
  ];

  input.matches.forEach((m, idx) => {
    lines.push(`RO ${m.ro_number ?? "unknown"} (score ${m.score.toFixed(3)}):`);
    m.citations.forEach((c) => {
      lines.push(`- [${c.chunk_id}] ${c.excerpt}`);
    });
    if (idx < input.matches.length - 1) lines.push("");
  });

  lines.push("");
  lines.push("Draft a concise answer using only the cited excerpts. Format each sentence with citations like [chunk_id].");

  return lines.join("\n");
};

export const buildCitedAnswer = (input: AnswerInput): { prompt: string; answer: string } => {
  // No actual LLM call; return a deterministic, reference-only summary.
  if (!input.matches.length) {
    return { prompt: promptTemplate(input), answer: "No relevant records found." };
  }

  const sentences: string[] = [];
  input.matches.forEach((m) => {
    m.citations.forEach((c) => {
      sentences.push(`Prior RO notes: ${c.excerpt} [${c.chunk_id}]`);
    });
  });

  return {
    prompt: promptTemplate(input),
    answer: sentences.join(" ")
  };
};
