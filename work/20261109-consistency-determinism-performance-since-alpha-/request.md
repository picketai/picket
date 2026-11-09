With all the changes that we've currently done, I want to see if there are things that we need to adjust in our Picket solution. My main concern is consistency, determinism, and performance. I want to see if we messed with any of these in our changes so far.

## Brief
purpose: Find regressions in consistency, determinism and performance introduced since v1.0.0-alpha.5 and name what needs adjusting
in scope: The 81 commits v1.0.0-alpha.5..HEAD: kernel (src/**), hooks, agents, skills, procedures, status line and mods
out of scope: Code changes; benchmark redesign; pre-alpha.5 history except as a baseline
