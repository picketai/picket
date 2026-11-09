Keep the check log bounded: when picket close closes a work item, drop that item's rows from .picket/state/check-log.jsonl, so the log holds rows of open items only (two per item phase).
