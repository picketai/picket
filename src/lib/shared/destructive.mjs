const ROOT = "(?:^|[\\s;&|(`])";
export const DESTRUCTIVE = new RegExp(
  `${ROOT}(?:sudo|rm|rmdir|del|erase|Remove-Item|ri|dd|mkfs|shutdown|reboot|kill|killall|taskkill|chmod|chown|chgrp)\\b|${ROOT}git\\s+(?:push|reset|rebase|checkout|restore|clean|stash\\s+drop|branch\\s+-[dD]|worktree\\s+remove)\\b`,
  "i",
);

/** Throws when the command is one the agent must run itself, so the permission prompt sees it. */
export function assertNotDestructive(command, verb) {
  if (DESTRUCTIVE.test(String(command))) {
    throw new Error(`${verb} refuses to run a destructive command (${String(command).slice(0, 60)}); run it yourself so the permission prompt sees it`);
  }
}
