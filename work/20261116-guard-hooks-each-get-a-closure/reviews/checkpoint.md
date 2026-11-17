## Review: 20261116-guard-hooks-each-get-a-closure · checkpoint (re-check of phase 5 fix)

The same-line HTML comment bypass is closed; the earlier Major does not recur.

Alignment: PASS (T-5.1 to T-5.4 hold; closure and comments.test.mjs pass, 19 tests, 0 fail with TMPDIR set)
Decisions: HONOURED
Findings: 0 critical, 0 major, 1 minor
- [Minor] src/lib/hooks/guard/edit-target.mts:20: `realPath` is still exported with no importer. Drop the `export` or follow D-005's wording. Carried over, does not block.
Classes: none
Checked: probes `<!-- note --><script>a()</script>`, `<style>a{}</style><!-- note -->`, `</script><!-- note2 -->` now give their comment as at fdd3a2fa; a `<script>` inside an HTML comment opens no region; a comment split across lines reads both parts; `</script >` still closes. New same-line forms are in SCRIPT_COMMENTS (test/support/variants.mts:902) and test/kernel/comments.test.mjs:98. A bare `npm test` without TMPDIR fails in this shell, which is environmental.

APPROVED
