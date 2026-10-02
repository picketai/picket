User request, verbatim:

"this is only but one of the times the harness goes ahead and adds comments to the code.... i want close to 0 comments, the code should be self descriptive... i rare cases where a comment might be helpful if it's a spefici decision of why a value or condition is done a certain way ..... then ASK the user before adding the comment. can you help me adress this issue in our harness ?"

Context from the incident the user screenshotted: a work item's scope listed "XML doc text (location type, voucherAmount optional, 403 cause)", the architect turned it into a decision and the developer wrote four identical <remarks> blocks and two reworded <summary> lines. The no-comment rule exists only in the main session's auto-memory; teammates read .claude/rules/csharp.md, whose ## Comments section has no ban on <remarks> and does not say that an order asking to "document" behaviour is not a licence to write comments. Five review rejections show a prose rule alone does not hold.

Scope the lead proposes:

1. Rule text: the language rule files and the analyst, architect, developer and reviewer contracts say the same thing: no new comments; code names carry the meaning; an order or design never carries "add doc text" or "document X in code" as scope (that goes to an external document such as a change list or API reference); the reviewer flags any added comment as a finding.
2. Enforcement: a hook bounces a developer turn when the diff it produced adds comments (// and /* lines, XML doc tags such as <remarks>, <param>, <returns>, <example>, a multi-line <summary>, and the equivalents in the other languages the harness handles, such as # in Python or shell and <!-- --> in markup), with one escape: a comment the user approved, recorded in the work item.
3. The ask path: a developer that believes a why-comment is needed (a specific value or condition chosen for a reason the code cannot show) does not write it; it ends the phase with the proposed comment text and location, and the lead puts it to the user at the gate. Only an approved comment passes the hook.
