# Jira intake

A request that names a Jira key (`SHOP-123`): fetch it with `getJiraIssue` (`view: full`), write its description and acceptance-criteria fields unedited, in that order, to a file under `.picket/state/scratch/`, and add `--ticket <KEY> --story <file>` to `picket open`. Never summarise or reword the story: the reviewer quotes it. Exit 2 means a pinned reference (`analysis@<branch>:<path>`) matched nothing; print the places it lists and ask. Remote-only branches are not searched.

The item has no id until `picket open` runs, so go back to the step that sent you here and open it.
