Cut the Bash guard's needless fallthroughs in `core/lib/hooks/guard.bash.mjs`, measured on a week of real use (859 of 1627 commands fell through to the permission prompt):
1. A redirect to `/dev/null` (`2>/dev/null`, `>/dev/null`, `&>/dev/null`) or a descriptor duplication (`2>&1`) is not a write; today it reports `write-redirect` (176 of 202 cases).
2. A command made only of picket kernel verbs (`picket verify`, `picket review-summary`, `picket next`, `picket packet`, `picket state`) falls through as `unknown-segments:[kernel]`; a kernel segment on its own, or piped into safe filters like `tail`, should be allowed.
3. A `$(...)` command substitution whose inner command is itself safe (`$(grep -rln ...)`, `$(git rev-parse ...)`) reports `hidden-execution` (75 of 108 cases); classify the inner command instead of falling through.
Anything that still writes or runs unknown code keeps falling through.
