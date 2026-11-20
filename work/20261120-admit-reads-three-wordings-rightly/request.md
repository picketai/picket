Fix three ways picket admit picks the wrong lane from a request's wording, each seen on a real request:
1. A change request that opens with a change verb the list lacks goes to the research lane. A request opening with "Build" was sent to research (OPENS_WITH_CHANGE in src/lib/shared/admission/signals.mts lacks build, create, make and write, which CHANGE_VERBS partly has).
2. A file name or identifier that contains a research word counts as asking a question. On 2026-11-18 a request that began "picket test classify loses evidence when --evidence is not quoted" and asked to "Make classify refuse them too" was answered "lane: research (the request asks a question and changes no code)"; it named src/lib/verbs/test/report.mts, and "report" is a research word.
3. A request that only refers to something irreversible is treated as performing an irreversible step. On 2026-11-20 a request for three small leftovers was answered "lane: design (an irreversible step)" because it cited a decision record with the words "only an irreversible action outside the repository"; nothing in the request deletes, drops, purges or force-pushes anything.
Add the three request texts to the labelled admission cases with the lane each should get (order, order, order), and keep every existing labelled case and closure passing.

## Brief
purpose: Stop picket admit from sending a change to the research lane, or a small change to the design lane, because of one word in the request.
in scope: The admission signals in src/lib/shared/admission/signals.mts for: an opening change verb the list lacks, a research word inside a file name or identifier, and a mention of something irreversible that the request does not perform; the three real request texts added to the labelled cases; the signals closure and its seeds
out of scope: The lane caps (fast cap of 3 files and 2 items); how --touched is counted; the security-path rule; any change to what a lane does
