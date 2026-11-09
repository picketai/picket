Something does not sit right about how the Picket package installs. Check how other packages, CLIs and Claude Code harnesses do their installation, using the repos fetched with opensrc (forge, mattpocock skills, bmad-method, OpenSpec, spec-kit, SuperClaude, claude-task-master, agent-os, shotgun, get-shit-done, sdd-pilot, azure-devops-mcp, ccstatusline, zod), and compare with Picket's install.

## Brief
purpose: Find what in Picket's install differs from how comparable packages, CLIs and Claude Code harnesses install, and which differences are likely what does not sit right
in scope: install and update paths of the 14 opensrc sources in ~/.opensrc/repos (forge, mattpocock skills, BMAD-METHOD, OpenSpec, spec-kit, SuperClaude_Framework, claude-task-master, agent-os, shotgun, get-shit-done, sdd-pilot, azure-devops-mcp, ccstatusline, zod) against Picket's install: npx @picketai/picket@alpha init, the plugin and marketplace setup, what init writes, update and uninstall
out of scope: changing Picket's install; lanes, agents and kernel behaviour unrelated to install; repos outside the list
