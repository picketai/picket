## Review: 20261120-admit-reads-three-wordings-rightly · crosscheck

The design record is consistent: every decision has a criterion, every phase implements a decision, and I reproduced its claimed numbers on base 0ffc70d7.

Scope: full. Code was not read for alignment. I ran probes in the session scratchpad, against `git show HEAD` of `signals.mts` and a copy with D-001 to D-003 applied.

Alignment: PASS
Decisions: HONOURED
Findings: clean

The six checks:
1. **Terminology:** "opener" and "research word" mean the same thing in the decisions and in T-1.1 to T-1.3. The repo has no `.claude/MEMORY.md` `## Language` entry for them, and no term needs one.
2. **Decision coverage:**
   - D-001 is covered by T-1.1 and T-1.5.
   - D-002 is covered by T-1.2.
   - D-003 is covered by T-1.3.
   - D-004 is covered by T-1.4 and T-1.7.
   - T-1.6 is the no-other-change guard across all four.
3. **Reverse coverage:** the single phase implements D-001 to D-004.
4. **Driver findings:** the record cites no analyst report. SDR 00005 is ratified (status line 18). It has no `TF-###` marked tactical design needed that this record leaves unimplemented.
5. **Reference integrity:**
   - Every path in `sources:` exists, as do `test/support/variants.mts` and `test/repo/closures.test.mjs`.
   - D-001 to D-004 and RISK-001 to RISK-004 have no gaps.
6. **Strategy:** D-003 narrows the `IRREVERSIBLE` signal to named actions, and SDR 00005 D-001 does not contradict that. The SDR's "irreversible" is a rule about records, not a lane trigger, and the design's own citation text is the case that triggered this.

Probe results that back the record's claims, with the three fixes applied to HEAD:
- **Real texts:**
  - The classify request goes from research to order.
  - The leftovers request goes from design to order.
  - The benchmark request, with its first word changed to "Build", goes from research to order.
- **Each text pins one fix:**
  - Dropping the opener fix leaves the benchmark request at research.
  - Dropping the research-word fix leaves the classify request at research.
  - Dropping the irreversible fix leaves the leftovers request at design.
- **Corpus:**
  - There are 148 entries before and 151 after. The 148 entries admit the same lane after the change as before it. The misses are exactly the seven T-1.6 lists.
  - None of the 24 `bench/tasks` prompts changes lane.
- **T-1.1 to T-1.3 and T-1.5:** every example text in these criteria gives the stated `research` and `irreversible` value and lane.
- **Security seeds:** the three new seeds in T-1.7 still set `security` and admit design.

The working tree already holds edits to `signals.mts`, its tests and the labelled JSON, so the developer has started. This pass graded the design record only.

ALIGNED
