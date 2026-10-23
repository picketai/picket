const ROOT = "(?:^|[\\s;&|(`])";
export const DESTRUCTIVE = new RegExp(
  `${ROOT}(?:sudo|rm|rmdir|del|erase|Remove-Item|ri|dd|mkfs|shutdown|reboot|kill|killall|taskkill|chmod|chown|chgrp)\\b|${ROOT}git\\s+(?:push|reset|rebase|checkout|restore|clean|stash\\s+drop|branch\\s+-[dD]|worktree\\s+remove)\\b`,
  "i",
);

const LEADING_SEPARATOR = /^[\s;&|(`]/;

export function destructiveCommand(command: string): string | null {
  const match = DESTRUCTIVE.exec(command);
  return match ? match[0].replace(LEADING_SEPARATOR, "") : null;
}

export function destructiveRefusal(runner: string, match: string): string {
  return `${runner} refuses to run a destructive command (${match}); run it yourself so the permission prompt sees it`;
}
