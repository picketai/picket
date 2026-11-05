---
name: edit-drops-boundary-space
description: An Edit whose old_string or new_string ends in a space can lose that space where it joins the untouched text
metadata:
  type: reference
---

Twice in one item, an Edit with old_string `readHeading, saveBlock, ` (and `subject, room), `) lost the trailing space where it joined the untouched text, giving `saveBlock,type` and `subject),...body`. No test or check catches it, but the reviewer flags it as a nit. Do not end old_string or new_string with a space. Include the next word in both, or grep the result for `,\S` after an import or array edit.

Related: [[edit-tool-unescapes-u2014]]
