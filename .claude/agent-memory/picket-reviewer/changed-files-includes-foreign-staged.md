---
name: changed-files-includes-foreign-staged
description: review summary changed_files diffs base against the working tree, so another item's staged file shows up in scope
metadata:
  type: reference
---

The summary's `changed_files` comes from `git diff <base>` against the working tree. A file staged for a different work item (seen: `src/mods/status/hooks/pane-actions.test.ts` during 20261103-commit-message-review-follow-up-fixes) therefore lands in scope even though none of the item's commits touch it. To check, run `git log --oneline <base>..HEAD` and `git show --stat` on each phase commit. Note the foreign file on the `Checked:` line; don't review it. The base can also predate other items' commits (seen: 20261103-pr-reviews-read-the-linked-ticket, base 2788aa4 under two other items' commits), so `changed_files` lists their files too; diff from the parent of the first phase commit to the last one instead. Related: [[review-summary-drops-claude-paths]].
