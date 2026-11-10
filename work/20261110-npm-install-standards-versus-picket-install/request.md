ok, do another deep pass, this time check for how a npm package is installed or recommented to be installed by official or community standards

## Brief
purpose: Check Picket's npx-based install against official and community standards for installing and recommending the install of an npm package and CLI, building on 20261109-how-other-harnesses-and-clis-install
in scope: official npm and Node.js guidance (npm docs on install, npx and npm exec, global versus local, dist-tags, bin, files, engines, publishing), Node.js package and CLI conventions, widely cited community guidance and practice for CLI install and update instructions, and how Picket's npx @picketai/picket@alpha init, dist-tag alpha, dist publish, engines and update instructions compare; the prior report artifacts/reports/how-other-harnesses-clis-install.md as context
out of scope: changing Picket's install; Claude Code plugin internals already covered by the prior report; non-npm package managers except as contrast
