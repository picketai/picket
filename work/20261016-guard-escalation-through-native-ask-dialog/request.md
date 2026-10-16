Add an escalation path to guard.bash so a destructive command it denies today can reach the user as a native Claude Code permission dialog instead of a dead end.

Keep deny as the default for the destructive class (rm, sudo, git push/reset/rebase/checkout/merge/clean, and git commit where it is guarded). When the command carries an escalation marker with a reason, for example `PICKET_ESCALATE="you asked me to push the release tag" git push origin v1.0.0-alpha.2`, the guard returns permissionDecision "ask" with the reason in permissionDecisionReason, so only the user's click in the native dialog approves it. The marker never produces "allow".

Rules:
- Every escalation asks fresh. No approval carries over to a later command, even an identical one minutes later. A saved allow rule (from "Yes, don't ask again") must never auto-approve a guarded command; verify whether a hook "ask" overrides a saved allow rule, and if not, the guard must handle it. picket doctor flags such saved rules.
- Verify that a hook "ask" still shows the dialog in auto mode; if auto mode approves it silently the design must change.
- Writes into a read-only source stay a hard deny; the marker has no effect there. A destructive command wrapped inside a picket verb stays denied.
- The model escalates only when the user explicitly asked for that action in this session, or the flow cannot continue without it. Housekeeping (cleanup after the work) is never escalated; it is recorded as "left for you" and listed in the close packet.
- Every escalation is logged to the ledger and shown by picket:inspecting. After the user refuses an escalated command, a second escalation of the same command is denied.

Out of scope: notification hooks when a dialog is open (later), custom mod buttons (rejected: the model could forge the grant).
