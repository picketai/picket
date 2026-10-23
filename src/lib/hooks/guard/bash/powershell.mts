import { maskEnvValues } from "../../../shared/drive-log.mts";
import { leadingAssignments, POWERSHELL_MARKER_TEXT } from "../../../shared/escalation.mts";
import { readPowerShell } from "../../../shared/shell/powershell.mts";
import { applyCd, LEAVE_HINT, segmentScope } from "./bash.mts";
import { classifyPrefixedCommand, classifySegment, fallThrough, type Dialect, type Segment } from "./rules.mts";

const POWERSHELL_ESCALATE_HINT = `If the user asked for this action in this session or the work cannot continue without it, run it alone as \`${POWERSHELL_MARKER_TEXT} = "<why>"; <command>\` and the user decides in the dialog. ${LEAVE_HINT}`;

function powerShellDenial(command: string): string {
  return `guard.bash: PowerShell command contains a destructive sub-command (e.g. Remove-Item, Stop-Process, Clear-Content, git push/reset/rebase/checkout/merge/clean). If the user asked for this action in this session or the work cannot continue without it, run it alone as \`${POWERSHELL_MARKER_TEXT} = "<why>"; <command>\` and the user decides in the dialog, or the user runs it: ! ${maskEnvValues(command)}. ${LEAVE_HINT}`;
}

function powerShellCd(seg: Segment, cwd: string | null): string | null {
  const target = seg[1];
  return typeof target === "string" && target.includes("$") ? null : applyCd(seg, cwd);
}

export const powerShellDialect: Dialect<null> = {
  name: "powershell",
  read: (command) => {
    const reading = readPowerShell(command);
    if (!reading) return fallThrough("powershell-unreadable");
    if (!reading.segments.length) return fallThrough("no-segments");
    return { ...reading, command, state: null };
  },
  classify: ({ seg, hit, cwd }, _reading, ctx) => {
    if (hit) return "safe";
    const { assignments, command } = leadingAssignments(seg);
    const plain = classifySegment(command, segmentScope(cwd, ctx));
    return assignments.length ? classifyPrefixedCommand(plain) : plain;
  },
  cdTarget: (seg, cwd) => (seg[0] === "cd" ? { to: powerShellCd(seg, cwd) } : null),
  allows: false,
  hints: { escalate: POWERSHELL_ESCALATE_HINT, denial: powerShellDenial },
};
