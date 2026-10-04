# Ticketing: Jira operations

Tools: primary `mcp__atlassian__getAccessibleAtlassianResources`, `getJiraIssue`, `searchJiraIssuesUsingJql`; mutating primary `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addOrEditJiraIssueComment`; catalog `discover`, `executeRead`, `executeWrite`. `executeDestructive` is never used: no ticketing operation deletes.

Catalog-only operations, called as `executeRead({ name, cloudId, inputs })` or `executeWrite`:

| Operation | Tier | Purpose |
|---|---|---|
| `listJiraProjects` | read | projects visible to the user |
| `listJiraProjectIssueTypesMetadata` | read | issue types in a project |
| `listJiraIssueTransitions` | read | workflow transitions for an issue |
| `listJiraIssueComments` | read | the comment thread |
| `listJiraIssueLinkTypes` | read | link type names: Blocks, Relates, Duplicates |
| `createJiraIssueLink` | write | link two issues (confirm first) |

Server rules: `cloudId` is a top-level argument on every execute call, a sibling of `name` and `inputs`. Never invent an operation name: use the table, a primary tool, or `discover` first. Default responses omit custom fields; pass `view: "evidence"` or the site's `customfield_*` id to read story points.

## Pull

1. By key (`PROJ-123`): `getJiraIssue`. By query: `searchJiraIssuesUsingJql`.
2. Fetch the comments too: `executeRead` with `name: "listJiraIssueComments"`. `getJiraIssue` gives only the count, and the thread is where scope decisions and blockers live.
3. State what was loaded before using it: key, type, status, assignee, comment count, any thread with an open question or scope change.
4. Render the item; map fields onto the template structure where useful.

## Create

1. `getAccessibleAtlassianResources` for the cloud id if unknown.
2. `executeRead` `listJiraProjects`; ambiguous project → ask for the key.
3. Map the item type to the Jira type (SKILL.md table). Checking it exists is optional: a rejected create returns the allowed values, so retry from that.
4. Show the exact `createJiraIssue` call (summary, description, `additional_fields` for story points and other custom fields by name or `customfield_*` id) and wait for confirmation.
5. Call it; report key and URL.

## Update

1. Resolve the key; ask if missing.
2. Field edits: `editJiraIssue` (an explicit `null` clears a field). Status: `listJiraIssueTransitions`, then `transitionJiraIssue`. A note: `addOrEditJiraIssueComment` (omit `commentId` to add; body is markdown, converted to ADF server-side).
3. Show each mutating call for confirmation before it runs; report what changed and the URL.
