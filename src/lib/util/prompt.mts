import { createInterface } from "node:readline/promises";

export type AskOptions = { choices?: readonly string[]; fallback: string };
export type Ask = (question: string, options: AskOptions) => Promise<string>;
export type Prompt = { interactive: boolean; ask: Ask };

function answerOf(text: string, { choices, fallback }: AskOptions): string {
  const answer = text.trim().toLowerCase();
  if (answer === "") return fallback;
  if (!choices) return answer;
  return choices.includes(answer) ? answer : fallback;
}

async function askTerminal(question: string, options: AskOptions): Promise<string> {
  const choices = options.choices ? ` [${options.choices.join("/")}]` : "";
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return answerOf(await reader.question(`${question}${choices} `), options);
  } finally {
    reader.close();
  }
}

export function terminalPrompt(): Prompt {
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  return {
    interactive,
    ask: (question, options) => (interactive ? askTerminal(question, options) : Promise.resolve(options.fallback)),
  };
}
