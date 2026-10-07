# Template: REST API Documentation

**Artifact path:** `artifacts/api/<derived-short-title>.md`

Production-ready REST API reference for external integrators who have no access to the source code. Output is **pure Markdown**: no preamble, no commentary, no filler. Produce one self-contained section per endpoint, then close with a single `## Enums & Mappings` section.

---

## Rules

These rules are strictly enforced: they are the substance of this artifact type, not style preferences.

### Structure & formatting

- All field names use **camelCase** (`todoId`, `isCompleted`, `dueDate`).
- Every code block carries a language tag: ` ```json `, ` ```bash `, ` ```js `, ` ```python `.
- **Backticks are for prose only.** Use single backticks when an identifier appears *inside a sentence*: descriptions, validation text, business rules (e.g. "required when `otherField` is set"). Do **not** backtick the bare identifier in the **Field** / **Parameter** column of a schema table: write it as plain text (e.g. the Field cell reads `nameOfField`, not a code span). The same applies to enum value/name cells.
- Produce one self-contained section per endpoint; repeat the full endpoint block for each.
- Omit sub-sections that genuinely do not apply (e.g. no path parameters → omit that table). Never leave a section blank or write "N/A".
- HTTP status codes covered: 200/201, 400, 401, 403, 404, 500 (add others if relevant: 409 for a conflict, 429 when the endpoint is rate limited).
- Every endpoint includes a cURL example. Add JavaScript (fetch) and Python (httpx) examples when the request body is non-trivial.
- The **Business Rules** section is optional per endpoint: include it only when the endpoint has domain constraints, sequencing requirements, or conditional behaviour not self-evident from the schema; omit it otherwise.

### Voice & phrasing

These govern the prose style. They ensure external integrators receive documentation that is self-explanatory, domain-meaningful, and free of implementation details.

**Endpoint summary line.** Every endpoint opens with a sentence stating: (a) the primary actor ("the authenticated assistance company", "the caller"), (b) the action performed, (c) the immediate return value, and (d) any sequencing constraint. Use an em-dash to introduce the sequencing clause when present.
> ✅ "Creates a new rental car request on behalf of the authenticated assistance company and returns the assigned file number (`bestelbon`). This is a registration-only operation: no reservation is created and no notifications are sent until `/confirm` is called."
> ❌ "Creates a rental order."

**Authentication prose.** Always explain *why* the token matters (what it identifies and what it scopes), not just that it is required. For multi-tenant APIs, state company/tenant scoping explicitly.
> ✅ "The key identifies your company and scopes all data access to your company's records."
> ❌ "All requests must include a valid Bearer token issued by the authentication service."

**Request intro.** Name the semantic groupings of the payload (e.g. "incident details, customer and vehicle information, the product code") rather than a generic "Describes every input the caller must provide."

**Business Rules prose.** Use `**bold**` for key identifiers. State the triggering condition explicitly ("If the licence plate is linked to an active contract…"). Explain downstream consequences of bad data where relevant ("A zero coordinate silently breaks all downstream distance calculations and is always rejected.").

**Error meanings.** Include the specific condition that triggers the status, not just the HTTP status name.
> ✅ `409`: "A rental request already exists for this licence plate or `bestelbon`"
> ❌ `409`: "Conflict"

**Caller perspective.** Write consistently from the integrator's point of view ("your company", "the caller", "the authenticated user"). Describe observable behaviour, never "the system does X".

### No implementation leakage

Never reference: database column names, language class or enum type names, internal sentinel values, framework names (MassTransit, EF Core, etc.), source file paths, or internal configuration keys. All terminology must be domain-meaningful to an external integrator who has never seen the source code.

### Multi-tenancy & organisational eligibility

This style of API serves multiple independent companies (tenants). Never leak configuration details, feature flags, thresholds, or eligibility rules specific to one company that may differ (or be absent) for another.

- **Technical fields and flags:** document explicitly and precisely, covering names, types, allowed values, error messages, and filtering mechanics. These are the same for all callers and safe to publish.
- **Eligibility and activation:** never state whether a feature is "enabled", "configured", or "available" for a specific company. Defer to "your specific organisational settings" or "when this feature is active for your setup".
- **Do not describe the conditions** under which a feature becomes active. State only that eligibility is managed by the system and validated at confirmation time.
- **UI-purpose flags** (e.g. `isPrivilegeCar`, `isPreferredBrand`) are display hints; note explicitly that the booking outcome is validated by the system during confirmation, not by the caller reading the flag.

> ✅ "Whether this feature is active and which brands qualify is determined by your specific organisational settings."
> ❌ "Brand priority is a product-level feature and must be explicitly enabled in the product configuration before it has any effect."

### Resource design (when designing or documenting new endpoints)

- **First-class resources get their own top-level path.** A resource produced by another but with its own identity and lifecycle is addressed at its own top-level path, not nested under its creator.
  > ✅ `POST /api/b2a/reservations/{bestelbon}` ❌ `POST /api/b2a/rental-orders/{bestelbon}/confirm`
- **Use HTTP methods for lifecycle operations:** Create → `POST`, Retrieve → `GET`, Cancel/delete → `DELETE`, Update a field → `PATCH`.
- **Verb sub-resources only for imperative actions** that cannot be expressed as CRUD on a named field; the verb is the final path segment with `POST`.
  > ✅ `POST /api/b2a/reservations/{bestelbon}/extend` ❌ `POST /.../send-email` (flat verb, no resource scoping)
- **A shared business key threads through related resources** (e.g. `bestelbon` as the path parameter for every resource it identifies). Do not introduce a second identifier unless the resource genuinely requires independent addressing.
- **Never name a resource with a verb**: resource segments are nouns; verbs belong in action sub-resources or HTTP methods.

### Enums

- Enums are **always integers** in JSON, never strings. In body examples write `"priority": 2`, not `"priority": "high"`.
- In schema tables the type column reads `integer (enum)` and the Validation column references the enum name (e.g. `Priority: see Enums`).
- Every enum used anywhere **must** appear in the `## Enums & Mappings` section at the end. That section is mandatory whenever at least one enum is present; omit it only if the API has no enums at all.

---

## Export to Word

API references are the primary consumer of the documenting skill's pandoc export. After writing the Markdown, the user may request a `.docx` via the `--export` flag: see **Export to Word (pandoc)** in `SKILL.md` for the shared mechanism and the `scripts/export.mjs` invocation.

---

## File template

```
## [METHOD] [/path]

One or two sentences: (a) primary actor, (b) action performed, (c) immediate return value, (d) any sequencing constraint (introduce with an em-dash).

**Endpoint:** `/path`
**Method:** `METHOD`
**Auth:** Bearer token required

### Authentication

Explain why the token matters: what it identifies and what it scopes. State company/tenant scoping explicitly for multi-tenant APIs.

| Header        | Value                |
| ------------- | -------------------- |
| Authorization | Bearer {accessToken} |

### Request

Name the semantic groupings of the payload rather than a generic introduction.

#### Path Parameters

Scalar values embedded in the URL that identify the resource. Every path parameter is required.

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| param     | string | Yes      | …           |

#### Query Parameters

Optional key-value pairs that filter, paginate, or modify the response without changing the addressed resource.

| Parameter | Type   | Required | Default | Description |
| --------- | ------ | -------- | ------- | ----------- |
| param     | string | No       | n/a     | …           |

###### Request Body

```json
{
  "fieldName": "value"
}
```

#### Request Body Schema

Every field accepted in the JSON body: type, required, validation, plain-language purpose.

| Field     | Type    | Required | Validation       | Description |
| --------- | ------- | -------- | ---------------- | ----------- |
| fieldName | string  | Yes      | 1 to 255 chars      | …           |
| numField  | integer | No       | min: 1, max: 100 | …           |

### Response

###### Success (HTTP 2xx)

```json
{
  "fieldName": "value"
}
```

#### Response Schema

Every field in the success body. Enum fields reference the enum by name and point to Enums & Mappings.

| Field     | Type     | Description               |
| --------- | -------- | ------------------------- |
| fieldName | string   | …                         |
| createdAt | ISO 8601 | Server-assigned timestamp |

### Error Responses

Every non-success status. The Meaning column states the specific triggering condition, not the status name.

| Status | Meaning                                               |
| ------ | ----------------------------------------------------- |
| 400    | Validation failed: see `errors` array in body        |
| 401    | Missing or invalid Bearer token                       |
| 403    | Authenticated user lacks permission for this operation|
| 404    | No resource found matching the given identifier       |
| 409    | (describe the specific conflict condition)            |
| 429    | Rate limit exceeded: retry after `retryAfter` seconds  |
| 500    | Internal server error                                 |

###### Error Body

Every error response is an RFC 7807 Problem Details object.

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more validation errors occurred.",
  "instance": "/v1/path",
  "errors": {
    "fieldName": ["Error description."]
  }
}
```

| Field      | Type    | Required | Description                                                        |
| ---------- | ------- | -------- | ------------------------------------------------------------------ |
| type       | URI     | Yes      | Absolute URI identifying the problem type                          |
| title      | string  | Yes      | Short human-readable summary of the problem type                   |
| status     | integer | Yes      | HTTP status code, repeated in the body                             |
| detail     | string  | Yes      | Explanation specific to this occurrence                            |
| instance   | URI     | No       | URI of the specific occurrence                                     |
| errors     | object  | No       | Field-level validation errors: camelCase field name to string array |
| retryAfter | integer | No       | Seconds to wait before retrying; on 429 only                       |
| traceId    | string  | No       | Server trace identifier for support; on 5xx only                   |

### Pagination

> Optional: include only when the endpoint returns a collection that pages. Omit entirely otherwise.

- **Method:** cursor-based.
- **Request:** `limit` (integer, 1 to 100, default 20), `cursor` (opaque string, omit for the first page).
- **Response:** `nextCursor` (string or null), `hasMore` (boolean).
- When `hasMore` is false there are no further pages; do not send another request.

### Rate Limiting

> Optional: include only when the endpoint enforces a limit. Omit entirely otherwise.

- **Limit:** state the actual budget and window (e.g. 1,000 requests per 15 minutes per API key).
- **Headers:** `X-RateLimit-Remaining` carries the remaining count; `Retry-After` carries the wait in seconds.
- Exceeding the limit returns 429 with `retryAfter` in the Problem Details body.

### Examples

###### cURL

```bash
curl -X METHOD https://api.example.com/v1/path \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fieldName": "value"}'
```

### Business Rules

> Optional: include only for non-obvious constraints, ordering requirements, or domain-specific conditions. Omit entirely if there are none beyond standard auth and validation.

- Rule written as a plain sentence; be specific about conditions and consequences.
- If a rule depends on state, name the state explicitly.

<!-- Repeat the endpoint block above for each endpoint, then close with the section below -->

## Enums & Mappings

Centralised reference for every integer enum used across all endpoints. Consumers map numeric values to names using these tables rather than hard-coding magic numbers.

### EnumName

Short description of what this enum controls and where it is used.

| Value | Name       | Description                      |
| ----- | ---------- | -------------------------------- |
| 0     | Unknown    | Unset / not specified            |
| 1     | MemberName | What this value means in context |

> Repeat `### EnumName` for each distinct enum in the document.
```

---

## Memory format

**Memory directory:** `.claude/agent-memory/analyst`
**Index file:** `.claude/agent-memory/analyst/MEMORY.md`
**Memory file path:** optional; use one only when long-form follow-up is needed; otherwise the index line below suffices.

If the memory directory does not exist, create it. If `MEMORY.md` does not exist, create it with the heading `# Analyst Memory` on the first line.

**Index entry.** Append one line to `MEMORY.md`:

```
- [API: Title](../../../artifacts/api/<derived-short-title>.md): <endpoints documented>, ≤100 characters
```

---

## Worked example

See `../examples/api.md`, a complete two-endpoint reference. Read only if uncertain about tone, enum handling, or table shape after reading the template.
