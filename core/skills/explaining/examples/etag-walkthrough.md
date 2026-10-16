**Question:** What is an ETag, with an example? Explain it simply.
**Mode:** concept · **Actor:** a browser loading the same page twice · **Entry point:** `GET /catalog/shoes` on an example shop

Sources fetched on 2026-10-16: RFC 9110 (HTTP Semantics) from https://www.rfc-editor.org/rfc/rfc9110.txt, and two MDN pages listed under Sources.

In one sentence: an ETag is a short label the server puts on a version of a page, so the browser can later ask "do you still have this version?" and get a tiny "yes, keep yours" (304) instead of the whole page again.

### Starting data

| Field | Value | Marker | From |
|---|---|---|---|
| resource | `GET /catalog/shoes` | [ASSUMED] | illustrative URL path |
| body size of the page | 14,200 bytes | [ASSUMED] | illustrative |
| ETag the server will assign | `"v42-shoes"` | [ASSUMED] | illustrative; RFC 9110 leaves the value to the server |
| browser cache for this URL | empty | [ASSUMED] | first visit in this example |
| ETag syntax | an opaque quoted string, optionally prefixed `W/` (weak) | [VERIFIED] | https://www.rfc-editor.org/rfc/rfc9110.txt, section 8.8.3 "ETag" |

### Walkthrough

1. **The browser asks for the page for the first time** at https://www.rfc-editor.org/rfc/rfc9110.txt, section 8.8.3 "ETag"
   In: `GET /catalog/shoes`, no conditional header · Rule: the `ETag` field in a response "provides the current entity tag for the selected representation" [VERIFIED] · Out: `200 OK`, `ETag: "v42-shoes"`, 14,200-byte body [INFERRED] from the rule and the starting data

2. **The browser stores the page with its ETag**
   In: the 200 response · Rule: a client that wants to update stored responses with entity tags "SHOULD generate an If-None-Match header field containing a list of those entity tags" on its next GET [VERIFIED] (section 13.1.2 "If-None-Match"), so the tag must be kept with the copy · Out: cache holds the 14,200-byte copy under `"v42-shoes"` [INFERRED]

3. **The browser asks again and sends the tag back** at section 13.1.2 "If-None-Match"
   In: `GET /catalog/shoes` with `If-None-Match: "v42-shoes"` · Rule: as step 2 [VERIFIED] · Out: a conditional GET

4. **The server compares tags** at section 13.1.2 "If-None-Match" and section 8.8.3.2 "Comparison"
   In: listed tag `"v42-shoes"`, current tag `"v42-shoes"` (page unchanged) · Rule: If-None-Match uses the weak comparison function, where tags match when their opaque-tags match character by character, `W/` or not [VERIFIED]; "the condition is false if one of the listed tags matches" [VERIFIED] · Out: condition false [INFERRED]

5. **The server answers 304 with no body** at section 13.1.2 "If-None-Match" and section 15.4.5 "304 Not Modified"
   In: condition false, method GET · Rule: the server "MUST NOT perform the requested method" and responds 304 for GET or HEAD (412 for other methods) [VERIFIED]; a 304 "cannot contain content or trailers" and must still send `ETag` among a few headers [VERIFIED] · Out: `304 Not Modified`, `ETag: "v42-shoes"`, 0-byte body [INFERRED]

6. **The browser shows its stored copy**
   In: the 304 · Rule: the 304 tells the client to use its stored representation "as if it were the content of a 200 (OK) response" [VERIFIED] (section 15.4.5); MDN says the same: the cached resource "is still valid" [VERIFIED] (MDN 304 page) · Out: the page appears from cache, 14,200 bytes not downloaded again [INFERRED]

If the page had changed to `"v43-shoes"`, step 4 finds no match, the condition is true, and the server sends a normal `200 OK` with the new body and new ETag [INFERRED] from rule 3 in section 13.1.2 ("Otherwise, the condition is true").

### End state

| Field | Before | After | Marker | From |
|---|---|---|---|---|
| browser cache | empty | 14,200-byte copy tagged `"v42-shoes"` | [INFERRED] | step 2 |
| second response status | (none) | `304 Not Modified` | [INFERRED] | step 5 |
| second response body | (none) | 0 bytes | [VERIFIED] | section 15.4.5: a 304 cannot contain content |
| body bytes saved on the second visit | 0 | 14,200 | [INFERRED] | step 6: 14,200 minus 0 |

### Not known

- How a server builds the ETag value: RFC 9110 section 8.8.3 calls it an opaque validator and sets no algorithm; shown as the `[ASSUMED]` stand-in `"v42-shoes"`.
- How long the browser keeps the stored copy before it asks again: that is set by caching rules in RFC 9111, which was not fetched; this example assumes the copy is still stored at step 3.

### Sources

- https://www.rfc-editor.org/rfc/rfc9110.txt: sections 8.8.3 "ETag", 8.8.3.2 "Comparison", 13.1.2 "If-None-Match", 15.4.5 "304 Not Modified"; every rule above.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304: confirms step 6 in plain words; agrees with the RFC.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-None-Match: fetched as a second reading of section 13.1.2; grounded nothing the RFC did not.

Next on offer: the same flow with `If-Modified-Since`, which the RFC says a server ignores when `If-None-Match` is present.
