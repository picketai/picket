Clean up the framework branch before the alpha (escalated from the fast lane: it touches 8 or more files).
1. Delete hello.sh (an unrelated greeter script added 2026-05-14).
2. PLAN.md (the 2026-09-07 rework plan, linked from README.md:49): move to artifacts/ or delete; fix the README link.
3. tmp/ (24 tracked working notes): keep tmp/latency-session-record.md under artifacts/ (its checklist is still due), move or delete the rest by whether they still serve a purpose.
4. Replace the word "harness" in user-facing text under core/ (plugin.json description, core/hooks/README.md, benchmarking skill prose); the bench --harness flag stays.
5. spike/ (packaging spike output; CONTRIBUTING.md:55 says it is deleted before the alpha): move under artifacts/ or delete.
The user said: "go ahead, move them to artifacts or even delete if you consider there is no purpose for them anymore".
Update CONTRIBUTING.md, test/markdown-paths.test.mjs and test/names-picket.test.mjs where they name spike/ or tmp/.
