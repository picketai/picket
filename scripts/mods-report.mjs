import { relative, sep } from "node:path";

const TYPE_ERROR = /^error (TS\d+):/;
const POSITION = /^line (\d+), column (\d+)$/;

function findings(report) {
  const sections = [report.manifest, ...(report.contents ?? [])].filter(Boolean);
  return sections.flatMap((section) =>
    [...(section.errors ?? []), ...(section.warnings ?? [])].map((finding) => ({ file: section.file, finding })),
  );
}

function typeError(distRoot, file, finding) {
  const code = TYPE_ERROR.exec(finding.message ?? "")?.[1];
  const position = POSITION.exec(finding.path ?? "");
  if (code === undefined || position === null) return [];
  return [{ file: relative(distRoot, file).split(sep).join("/"), line: Number(position[1]), column: Number(position[2]), code }];
}

export function hostTypeErrors(report, distRoot) {
  return findings(report).flatMap(({ file, finding }) => typeError(distRoot, file, finding));
}

export function hostMismatchReport(version, errors) {
  const header = `mods: the mods do not match the hook API types of Claude Code ${version}: ${errors.length} type errors`;
  return [header, ...errors.map(({ file, line, column, code }) => `  ${file}:${line}:${column} ${code}`)].join("\n");
}
