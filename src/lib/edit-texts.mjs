import { existsSync, readFileSync } from "node:fs";

function editedFile(current, { old_string: from = "", new_string: to = "", replace_all: all }) {
  if (!from || !current.includes(from)) return { before: from, after: to };
  return { before: current, after: all ? current.split(from).join(to) : current.replace(from, () => to) };
}

export function editTexts(event, abs) {
  const input = event.tool_input;
  const current = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  if (event.tool_name === "Edit") return editedFile(current, input);
  return { before: current, after: input.content ?? "" };
}
