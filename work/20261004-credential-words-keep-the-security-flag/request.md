Admission must keep the security flag when a credential word comes right before a skipped "token" phrase.

The cumulative review of 20261004-tidy-repository-before-tether-packaging found (Major, `.claude/lib/admit.mjs:28`) that `NOT_A_CREDENTIAL` removes phrases like "token count" and "cached tokens" even after a credential qualifier. Reproduced on 2026-10-04 at 80fee5c: "Limit the refresh token count per user to five." and "Invalidate cached tokens when the user logs out." both admit to `order` with `security: false`; at d7fa166 both went to `design`. This breaks that record's D-004 promise that the change fails closed.

Do not skip a phrase when a credential qualifier (refresh, access, bearer, session, api, auth, jwt) comes right before it, and add both requests above as tests. "Rename the verdict token heading in the skill" must still admit without the security flag.
