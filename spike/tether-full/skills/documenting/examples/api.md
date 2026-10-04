# Reference Example: To-Do List API v1

This is a **complete, finished output** sample. Use it to calibrate formatting, depth, field naming, enum handling, and table style.
Do NOT reproduce this in output unless the user is actually documenting a to-do API.

## POST /v1/todos

Creates a new to-do item owned by the authenticated user and returns the full item representation including its server-assigned identifier and default status.

**Endpoint:** `/v1/todos`
**Method:** `POST`
**Auth:** Bearer token required

### Authentication

All requests must include a valid Bearer token issued by the authentication service. The token identifies the user who will own the created item; requests without a valid token are rejected with `401`.

| Header        | Value                |
| ------------- | -------------------- |
| Authorization | Bearer {accessToken} |

### Request

The request body carries the item's initial data. No path or query parameters are required for this endpoint: all input is provided in the JSON body.

###### Request Body

```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "dueDate": "2026-03-20T18:00:00Z",
  "priority": 2
}
```

#### Request Body Schema

Defines every field accepted in the JSON request body. `title` is the only required field; all others are optional and fall back to documented defaults when omitted.

| Field       | Type           | Required | Validation           | Description                         |
| ----------- | -------------- | -------- | -------------------- | ----------------------------------- |
| title       | string         | Yes      | 1 to 255 chars          | Short label for the to-do item      |
| description | string         | No       | max 1 000 chars      | Optional longer description         |
| dueDate     | string         | No       | ISO 8601 datetime    | When the item is due                |
| priority    | integer (enum) | No       | Priority: see Enums | Defaults to `1` (Medium) if omitted |

### Response

On success the API returns `201 Created` with the full item object in the body, including fields that are server-assigned (`todoId`, `status`, `createdAt`) and may not be inferred from the request.

###### Success (HTTP 201)

```json
{
  "todoId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "isCompleted": false,
  "dueDate": "2026-03-20T18:00:00Z",
  "priority": 2,
  "status": 0,
  "createdAt": "2026-03-12T10:00:00Z"
}
```

#### Response Schema

Documents every field present in the `201` response body. Enum fields (`priority`, `status`) are integers: consult the Enums & Mappings section for their named values.

| Field       | Type           | Description                                     |
| ----------- | -------------- | ----------------------------------------------- |
| todoId      | string         | UUID assigned to the new item                   |
| title       | string         | Title as submitted                              |
| description | string         | Description as submitted, or `null`             |
| isCompleted | boolean        | Always `false` on creation                      |
| dueDate     | string         | ISO 8601 due date, or `null` if not provided    |
| priority    | integer (enum) | Resolved priority: see `Priority` in Enums     |
| status      | integer (enum) | Current item status: see `TodoStatus` in Enums |
| createdAt   | ISO 8601       | Server-assigned creation timestamp              |

### Error Responses

Lists every non-success status code this endpoint can return. Validation errors include a per-field `errors` map in the body; see the error body example below.

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| 400    | Validation failed: see `errors` in body |
| 401    | Missing or invalid Bearer token          |
| 403    | Token does not have write scope          |
| 500    | Internal server error                    |

###### Error Body

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 400,
  "errors": {
    "title": ["The title field is required."],
    "priority": ["Must be a valid Priority value (0 to 3)."]
  }
}
```

### Examples

Ready-to-run cURL sample creating a high-priority to-do item with a title and no due date.

###### cURL

```bash
curl -X POST https://api.example.com/v1/todos \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries", "priority": 2}'
```

### Business Rules

- A user may not have more than 1 000 active (non-cancelled) to-do items at a time; attempting to exceed this limit returns `400`.
- If `dueDate` is provided it must be in the future relative to the server's UTC clock at the time of the request; past dates are rejected with `400`.
- `priority` `3` (High) is only accepted if the authenticated token carries the `todos:elevated` scope; submitting it without that scope returns `403`.

## GET /v1/todos/{todoId}

Retrieves a single to-do item by its unique identifier, returning its current state including all mutable and server-managed fields.

**Endpoint:** `/v1/todos/{todoId}`
**Method:** `GET`
**Auth:** Bearer token required

### Authentication

All requests must include a valid Bearer token. The token is used to verify that the caller owns the requested item; attempts to fetch an item belonging to another user return `403`.

| Header          | Value                  |
| --------------- | ---------------------- |
| `Authorization` | `Bearer {accessToken}` |

### Request

The only input required is the item's UUID in the URL path. No request body or query parameters are accepted.

#### Path Parameters

Identifies the specific to-do item to retrieve. The value must be a valid UUID previously returned by a create or list operation.

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| todoId    | string | Yes      | UUID of the to-do item to fetch |

### Response

On success the API returns `200 OK` with the full current state of the item, including the `updatedAt` timestamp reflecting the most recent modification.

###### Success (HTTP 200)

```json
{
  "todoId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "isCompleted": false,
  "dueDate": "2026-03-20T18:00:00Z",
  "priority": 2,
  "status": 1,
  "createdAt": "2026-03-12T10:00:00Z",
  "updatedAt": "2026-03-12T11:30:00Z"
}
```

#### Response Schema

Documents every field in the `200` response body. Compared to the create response, this adds `updatedAt` reflecting any changes since creation.

| Field       | Type           | Description                                     |
| ----------- | -------------- | ----------------------------------------------- |
| todoId      | string         | UUID of the item                                |
| title       | string         | Current title                                   |
| description | string         | Current description, or `null`                  |
| isCompleted | boolean        | Whether the item has been marked complete       |
| dueDate     | string         | ISO 8601 due date, or `null`                    |
| priority    | integer (enum) | Current priority: see `Priority` in Enums      |
| status      | integer (enum) | Current item status: see `TodoStatus` in Enums |
| createdAt   | ISO 8601       | Creation timestamp                              |
| updatedAt   | ISO 8601       | Last modification timestamp                     |

### Error Responses

Lists every non-success status code this endpoint can return. A `404` is returned when no item exists for the given `todoId`; a `403` when the item exists but belongs to a different user.

| Status | Meaning                              |
| ------ | ------------------------------------ |
| 401    | Missing or invalid Bearer token      |
| 403    | Item belongs to a different user     |
| 404    | No item found for the given `todoId` |
| 500    | Internal server error                |

### Examples

Ready-to-run cURL sample fetching a specific to-do item by its UUID.

###### cURL

```bash
curl -X GET https://api.example.com/v1/todos/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer TOKEN"
```

## Enums & Mappings

Centralised reference for every integer enum used across all endpoints in this document. Consumers should map numeric values to their named counterparts using these tables rather than hard-coding magic numbers.

### Priority

Controls the urgency level of a to-do item. Accepted as input on `POST /v1/todos` and returned on both `POST /v1/todos` and `GET /v1/todos/{todoId}`.

| Value | Name   | Description                               |
| ----- | ------ | ----------------------------------------- |
| 0     | None   | No priority assigned                      |
| 1     | Low    | Low urgency; can be deferred              |
| 2     | Medium | Default priority when field is omitted    |
| 3     | High   | High urgency; should be resolved promptly |

### TodoStatus

Represents the lifecycle state of a to-do item. Returned in all responses; cannot be set directly by the client; the server advances the status based on actions performed on the item.

| Value | Name       | Description                                  |
| ----- | ---------- | -------------------------------------------- |
| 0     | Pending    | Item created but not yet started             |
| 1     | InProgress | Item is actively being worked on             |
| 2     | Completed  | Item has been marked complete                |
| 3     | Cancelled  | Item was cancelled and will not be completed |
